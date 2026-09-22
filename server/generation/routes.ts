import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { bundleSchema, contractSchema, jsonValue, programSchema, validateInput, verificationSchema, type Job, type Program, type Bundle } from '../../src/engine/generated';
import { isConfigured, MatchError, type LlmConfig } from '../match';
import { designPresentation, generatePython, parseProblem } from './model';
import { checkTeaching } from './quality';
import { validateSceneBindings, validateSceneChecks, type SceneCheck } from '../../src/engine/scene-spec';
import { DataValidationError } from '../../src/engine/validation';
import { validationHint } from './diagnostics';
import { DockerSandbox, SandboxError, type Sandbox } from './sandbox';
import { exampleMatches, independentCases, verifierInput, verifyResult } from './verify';
import { localOnly } from '../local-only';

const source = z.string().trim().min(1).max(6000);
const generateRequest = z.object({ source, contract: contractSchema, verification: verificationSchema, confirmed: z.literal(true), design: z.boolean().optional() }).strict();
const rerunRequest = z.object({ program: programSchema, input: jsonValue, confirmed: z.literal(true), design: z.boolean().optional(), repair: z.boolean().optional(), feedback: z.string().max(4000).optional() }).strict();
const message = (e: unknown) => e instanceof SandboxError || e instanceof MatchError
  ? { code: e instanceof SandboxError ? e.code : e.code ?? `MODEL_${e.status}`, message: e.message }
  : e instanceof DataValidationError || e instanceof z.ZodError ? { code: 'VALIDATION_FAILED', message: validationHint(e) }
    : { code: 'VALIDATION_FAILED', message: '输入约定、模型程序或验证数据不合法。请核对约定和输入；原始内部错误未公开。' };

export function generationRouter(getConfig: () => LlmConfig, fetcher: typeof fetch, sandbox: Sandbox = new DockerSandbox()) {
  const router = Router();
  const jobs = new Map<string, { job: Job; controller: AbortController; touched: number }>();
  let active = 0;
  router.use(localOnly);
  const costLimit = rateLimit({ windowMs: 60_000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: '生成请求过于频繁，请稍后重试。' } });
  router.get('/status', async (_req, res) => res.json({ model: isConfigured(getConfig()), sandbox: await sandbox.probe() }));
  router.post('/parse', costLimit, async (req, res) => {
    const parsed = z.object({ source }).strict().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: '题目描述必须为 1–6000 字符。' }); return; }
    if (active >= 2) { res.status(429).json({ error: '已有两个生成/执行任务，请稍后重试。' }); return; }
    const controller = new AbortController();
    res.on('close', () => { if (!res.writableEnded) controller.abort(); });
    active++;
    try { res.json({ contract: await parseProblem(parsed.data.source, getConfig(), fetcher, controller.signal) }); }
    catch (e) { const error = message(e); res.status(e instanceof MatchError ? e.status : 422).json({ error: error.message, code: error.code }); }
    finally { active--; }
  });
  router.get('/jobs/:id', (req, res) => {
    const entry = jobs.get(req.params.id);
    if (!entry) { res.status(404).json({ error: '任务不存在或已过期，请重新提交。' }); return; }
    res.setHeader('Cache-Control', 'no-store');
    const { bundle, ...progress } = entry.job;
    res.json(entry.job.stage === 'complete' || entry.job.stage === 'failed' ? entry.job : progress);
  });
  router.delete('/jobs/:id', (req, res) => {
    const entry = jobs.get(req.params.id); entry?.controller.abort(); res.json({ cancelled: Boolean(entry) });
  });
  router.post('/jobs', costLimit, async (req, res) => {
    // Capture credentials before asynchronous work; settings changes affect only future jobs.
    const config = getConfig();
    const fresh = generateRequest.safeParse(req.body), rerun = rerunRequest.safeParse(req.body);
    if (!fresh.success && !rerun.success) { res.status(400).json({ error: '生成请求无效，必须确认约定；重新执行需提供完整 Python 程序。' }); return; }
    if (active >= 2) { res.status(429).json({ error: '已有两个生成/执行任务，请稍后重试。' }); return; }
    active++;
    try {
      const designing = fresh.success ? fresh.data.design === true : rerun.data!.design === true;
      const repairing = !fresh.success && rerun.data!.repair === true;
      const contract = fresh.success ? fresh.data.contract : rerun.data!.program.contract;
      if (!contract.supported || contract.questions.length) throw new Error('unresolved contract');
      if ((fresh.success || designing || repairing) && !isConfigured(config)) throw new MatchError(503, '模型配置缺失。预设题和普通程序重跑不需要模型；修复/设计需要模型。');
      const input = fresh.success ? contract.examples[0].input : rerun.data!.input;
      const verification = fresh.success ? fresh.data.verification : rerun.data!.program.verification;
      validateInput(contract, input); verifierInput(verification, input);
      const ready = await sandbox.probe();
      if (!ready.available) throw new SandboxError('DOCKER_UNAVAILABLE', ready.message);
      for (const [id, entry] of jobs) if (entry.job.stage === 'complete' || entry.job.stage === 'failed') {
        if (Date.now() - entry.touched > 30 * 60_000 || jobs.size >= 10) jobs.delete(id);
      }
      if (jobs.size >= 10) throw new Error('job capacity');
      const id = randomUUID(), controller = new AbortController();
      const job: Job = { id, stage: fresh.success || repairing ? 'generating' : 'executing' };
      jobs.set(id, { job, controller, touched: Date.now() });
      res.status(202).json({ id });
      void (async () => {
        try {
          const program: Program = fresh.success ? { source: fresh.data.source, contract, verification, python: await generatePython(fresh.data.source, contract, config, fetcher, controller.signal) } : { ...rerun.data!.program };
          if (repairing) program.python = await generatePython(program.source, contract, config, fetcher, controller.signal, { python: program.python, feedback: rerun.data!.feedback ?? 'Check the controlled trace SDK types, runtime behavior, teaching state and confirmed contract.' });
          if (repairing || designing) delete program.presentation;
          job.program = program;
          if (controller.signal.aborted) throw new SandboxError('CANCELLED', '任务已取消。');
          job.stage = 'executing';
          const trace = await sandbox.run(program, input, controller.signal);
          // At most main + 3 samples + 6 independent runs, each capped at 2 MB.
          // Keep this bounded corpus only during the job; never store it in the result bundle.
          const sceneChecks: SceneCheck[] = [{ label: '当前输入', trace }];
          const rememberScene = (run: typeof trace, label: string) => { if (!sceneChecks.some((c) => c.trace === run)) sceneChecks.push({ label, trace: run }); };
          job.stage = 'checking';
          const evidence: Bundle['evidence'] = { structure: 'passed', runtime: 'passed', examples: 'not_run', independent: 'not_run', presentation: 'not_run', teaching: checkTeaching(trace, verification), details: [] };
          // An old design must not make a failed rerun's diagnostic bundle unreadable.
          const bindingIssues = program.presentation ? validateSceneBindings(program.presentation, trace) : [];
          if (bindingIssues.length) { delete program.presentation; evidence.presentation = 'failed'; evidence.details.push(...bindingIssues); }
          // Keep the successful execution diagnosable even when subsequent checks fail.
          const bundle: Bundle = { format: 'algomotion-generated', version: program.presentation ? 2 : 1, program, trace, evidence };
          job.bundle = bundle;
          const teachingIssues = evidence.teaching!.status === 'failed' ? [...evidence.teaching!.details] : [];
          const checkMoreTeaching = (run: typeof trace, label: string) => {
            const quality = checkTeaching(run, verification);
            if (quality.status === 'failed') teachingIssues.push(...quality.details.map((s) => `${label}: ${s}`));
          };
          let examplesOK = true;
          evidence.examples = 'failed';
          for (const [i, example] of contract.examples.entries()) {
            const run = JSON.stringify(example.input) === JSON.stringify(input) ? trace : await sandbox.run(program, example.input, controller.signal);
            const passed = exampleMatches(verification, example.input, run.result, example.expected);
            checkMoreTeaching(run, `样例 ${i + 1}`);
            rememberScene(run, `模型样例 ${i + 1}`);
            examplesOK &&= passed; evidence.details.push(`模型样例 ${i + 1}: ${passed ? '通过（非独立证据）' : '失败'}`);
          }
          evidence.examples = examplesOK ? 'passed' : 'failed';
          if (verification !== 'none') {
            evidence.independent = 'failed';
            let independentOK = verifyResult(verification, input, trace.result);
            evidence.details.push(`当前输入独立检查: ${independentOK ? '通过' : '失败'}`);
            for (const [i, testInput] of independentCases(verification).entries()) {
              validateInput(contract, testInput);
              const run = await sandbox.run(program, testInput, controller.signal);
              const passed = verifyResult(verification, testInput, run.result); independentOK &&= passed;
              checkMoreTeaching(run, `边界 ${i + 1}`);
              rememberScene(run, `独立边界 ${i + 1}`);
              evidence.details.push(`独立边界用例 ${i + 1}: ${passed ? '通过' : '失败'}`);
            }
            evidence.independent = independentOK ? 'passed' : 'failed';
          } else evidence.details.push('未配置适用于该题意的独立验证器。运行和模型样例不构成正确性证明。');
          if (teachingIssues.length) evidence.teaching = { status: 'failed', details: [...new Set(teachingIssues)].slice(0, 12) };
          if (program.presentation) {
            bindingIssues.push(...validateSceneChecks(program.presentation, sceneChecks));
            if (bindingIssues.length) { delete program.presentation; bundle.version = 1; evidence.presentation = 'failed'; evidence.details.push(...bindingIssues.slice(0, 8)); }
          }
          bundleSchema.parse(bundle);
          if (controller.signal.aborted) throw new SandboxError('CANCELLED', '任务已取消。');
          if (!examplesOK || evidence.independent === 'failed') throw new SandboxError('CHECK_FAILED', '检查失败。保留本次源码、返回值与轨迹供诊断，不能视为正确解法。');
          if (evidence.teaching?.status === 'failed') throw new SandboxError('TEACHING_FAILED', `教学轨迹检查失败：${evidence.teaching.details.slice(0, 3).join(' ')} 可显式调用模型修复，未自动重试。`);
          if (bindingIssues.length) throw new SandboxError('PRESENTATION_BINDING', `展示未通过跨输入检查：${bindingIssues.slice(0, 3).join(' ')} 保留原始轨迹，可重新设计。`);
          if (designing) {
            job.stage = 'designing'; evidence.presentation = 'failed';
            program.presentation = await designPresentation(program, trace, config, fetcher, controller.signal, sceneChecks);
            bundle.version = 2;
          }
          if (program.presentation) {
            const issues = validateSceneBindings(program.presentation, trace);
            if (issues.length) {
              delete program.presentation; bundle.version = 1; evidence.presentation = 'failed';
              throw new SandboxError('PRESENTATION_BINDING', `展示绑定不兼容新输入：${issues.join(' ')} 保留原始轨迹，可重新设计展示。`);
            }
            evidence.presentation = 'passed';
            evidence.details.push(`展示绑定：已检查 ${sceneChecks.length} 次执行的全部快照（当前输入、模型样例和适用的独立边界）；不代表完整输入域证明。`);
          }
          bundleSchema.parse(bundle);
          if (controller.signal.aborted) throw new SandboxError('CANCELLED', '任务已取消。');
          job.stage = 'complete';
        } catch (e) { job.stage = 'failed'; job.error = message(e); if (job.bundle) job.bundle.evidence.details.push(`${job.error.code}: ${job.error.message}`.slice(0, 500)); }
        finally { active--; }
      })();
    } catch (e) { active--; const error = message(e); res.status(e instanceof MatchError ? e.status : 422).json({ error: error.message, code: error.code }); }
  });
  return router;
}
