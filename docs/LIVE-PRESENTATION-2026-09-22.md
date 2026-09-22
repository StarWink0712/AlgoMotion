# Real AI Presentation Integration, 2026-09-22

## Result

The user's session-configured DeepSeek `deepseek-flash` was used through the already running local API. **20 real provider requests** were made: 7 contract parses, 7 Python generation/repair requests and 6 presentation requests. Configuration: JSON Object, `max_tokens`, thinking disabled, output cap 8192. No provider substitution, fixture response, generated-source hand editing or host Python execution was used. The backend was not restarted; keys were not read out, logged or persisted.

All three non-preset tasks reached real Python execution and at least one valid AI presentation. This is **partial acceptance, not reliable one-shot generation or complete visual correctness**. There were seven rejected protocol outputs, one independently rejected model example, stale AI prose and a valid large-input presentation failure. Generated code instrumentation required human inspection beyond the finite automated checks.

| Task | Observed Result |
| --- | --- |
| Obstacle-grid BFS | After parse/generation/design retries and contract review, distance 6 on the original example; changed input returned distance 4. Main plus six built-in independent cases passed, including 12x12. Additional 11 inputs passed numerical, teaching and binding checks; maximum 313 frames. |
| Grid minimum path sum | Initial model example paired sum 10 with a path of weight 12 and was rejected. A simpler independently verified 2x2 example was then parsed/generated: sum 7; changed 3x3 input gave sum 9. An additional 11 inputs all had correct numerical/path results, but the 12x12 input failed the AI graph binding limit. |
| Daily temperatures, monotonic stack | Real non-grid generation produced sequence/bars, waits and stack panels. Original example returned `[1,2,1,0,0]`; changed input returned `[1,1,4,2,1,1,0,0]`. An independent test-only quadratic reference checked results. Both original and model-repaired programs passed 11 boundary/random inputs each. Product evidence correctly remains `independent:not_run`; it does not claim a built-in checker for this task. |

## Important Failures

1. **AI prose can be stale or reveal an answer before playback.** A successfully validated BFS SceneSpec description hardcodes start `(0,0)`, end `(3,3)` and distance `6`. After changing input to a 3x3 grid with start `(0,2)`, end `(2,0)`, the actual answer is `4`, but the old description remains visible even at frame zero. Bound result panels are hidden correctly; free-form description text is not protected by that rule. `metadata-audit.json` and real browser screenshots reproduce this. DP prose also mentions its original 2x2 example after changing the input. These are presentation correctness defects, not numerical solver failures.
2. **A current-input-valid design need not cover the confirmed input range.** DP's AI plan uses `source:grid` for an extra graph panel. The graph component caps nodes at 48, while the confirmed contract permits 144 cells. At 12x12 the Python returns the correct `23000000`, but the plan is incompatible. A real UI rerun produced `PRESENTATION_BINDING`, removed the invalid plan, retained a readable raw v1 bundle and displayed all 144 cells. This fail-closed behavior passed its test; the AI presentation itself failed.
3. **Model protocol compliance is not yet reliable.** Three parse requests failed JSON/input-contract validation; two Python responses failed the source response schema; two SceneSpec responses used invalid sources. Current parse/code errors are too coarse to determine the exact offending field without further diagnostic improvements. The initial raw rejected provider contents were deliberately not exposed or retained by the API, so no more specific cause is claimed.
4. **Finite teaching checks miss some instrumentation semantics.** The original DP program constructed the complete returned path, then traversed predecessors again for recording. The original stack program recorded a frame called “pop” before popping, reused the FIFO queue field for a stack, and wrapped all SDK calls at one source line. These all passed finite structural/teaching checks. Manual source inspection found them; numeric correctness alone did not.
5. **AI labels are not semantically verified.** For example, the repaired stack plan's title says bottom-to-top while the trusted stack panel renders top-to-bottom and states that direction separately. Compatible bindings do not validate label wording.

## Explicit Model Repairs

- Stack: one explicit repair request plus a new design succeeded. Source now calls the SDK at algorithm sites, records after real pops, keeps FIFO queue empty and finalizes unresolved waits as zero. Browser replay found seven distinct source lines, exact bound sequence/stack values, correct result, working seek/mobile/save/reopen/export and zero new model calls during input rerun. Labels still require the caution above.
- DP: first repair request failed the Python response schema. A second explicit request produced a single predecessor traversal that records the same partial path used for the returned result. Main and six built-in cases, then 11 extra inputs, passed. Its subsequent design request failed `panels.[0].source: invalid_literal`, so this repaired attempt is a **raw v1 diagnostic bundle**, not successful AI-designed completion. It was not silently combined with the earlier plan.
- BFS: explicit redesign reused byte-identical Python after the first design failed. The replacement passed binding validation, but still had stale prose. No claim that redesign validated its natural-language accuracy is made.

The generator was not given new hardcoded solution branches. Cases, independent references, explicit review notes and repair feedback are test-only. Contract edits were recorded separately from original model output. No invalid model example was silently accepted or manually changed into a passing example; DP was re-parsed from a simpler new test description instead.

## Tests Actually Run

| Check | Result |
| --- | --- |
| Fresh baseline and post-test `npm run check` | TypeScript and 259 unit/API tests passed. These suites include their explicitly mocked provider/runner tests. |
| `npm run build` | Passed. |
| Real additional Docker audits | Five 11-input rounds: BFS, original DP, repaired DP, original stack, repaired stack. Numerical/reference results **55/55 passed**; 25 invalid-input attempts rejected before execution. Input sets include no route, blocked endpoint, start=end, single row/column, max-size/max-weight, empty/duplicate/decreasing temperatures and deterministic random cases. These are finite tests, not universal proofs. |
| AI bindings in those audits | 43 passed, 1 failed (original DP 12x12), 11 not run (repaired DP has no accepted design). No binding failure was counted as success. |
| Real browser BFS and original DP | Changed inputs through the UI, exact raw-frame grid/visited/active/queue/DP/path/code-line checks, backward seek, mobile playback, save/reopen/export; same Python and plan, zero new model calls. |
| Real browser repaired DP | Raw v1 bundle reran on changed input with sum 9; exact frame/code-line state, rewind, mobile playback and save/reopen/export passed. No AI presentation was present or claimed, and no model request was made. |
| Real browser repaired stack | Per-frame AI sequence/stack bindings, code lines, result, rewind, desktop/mobile, save/reopen/export; same Python and plan, zero new model calls. The first test attempt used an overly broad code-line selector that also matched a hidden preset pane; the test was scoped to the generated workspace and rerun successfully. No application assertion was weakened. |
| Real browser valid-large-input failure | Correct DP result, explicit `PRESENTATION_BINDING`, invalid plan removed, raw 144-cell trace and rewind usable, zero model calls and no page errors. |
| Real browser metadata audit | Reproduced stale BFS text at frame zero while the bound result panel remained hidden. This is a recorded failure, not a green replay test. |

The previous full mock browser suite and adversarial sandbox suite are documented separately in `VALIDATION.md`; they were not rerun as part of this live-only round. Windows, Kimi, OpenAI, other DeepSeek models/settings and public multi-tenant security remain unverified. Actual provider cost/token totals were not returned by the app's result API; consult the provider bill rather than infer charges from request count.

## Local Evidence And Reproduction

Run evidence is Git-ignored under `artifacts/`, not automatically included in a source release:

- `live-ui-20260922-134433/`: initial BFS/DP parse failures.
- `live-ui-20260922-134433-retry1/`: reviewed BFS, rejected DP example, failed/successful BFS generations/designs, boundary report, metadata audit and `browser-1/` screenshots/exports.
- `live-ui-20260922-134433-retry2/`: further DP parse failure.
- `live-ui-20260922-134433-dp-simple/`: valid simpler DP contract, initial AI bundle, repair attempts, raw repaired bundle, boundaries, real large-input failure and browser evidence.
- `live-ui-20260922-134433-stack/`: original and repaired stack programs/AI plans, quadratic-reference boundary checks and real mobile/desktop screenshots.

The updated `tests/live-ui.ts` supports `parse/review/generate/rerun/repair/design` for these test descriptions through the existing API without retrieving keys. Paid actions require `ALGOMOTION_LIVE_ACCEPT=1`; review requires explicit notes; generation requires `ALGOMOTION_CONTRACT_REVIEWED=1`. Use unique `ALGOMOTION_LIVE_RUN` names to avoid overwriting evidence. Test-only source notes, repair feedback and attempt/reuse flags keep repeated calls explicit and preserve old failures.

For saved real bundles, run `npx tsx tests/live-boundaries.ts <bundle>` (append `temperatures` for that dedicated reference), `npx tsx tests/live-ui-browser.ts <grid-bundle>`, or `npx tsx tests/live-stack-browser.ts <stack-bundle>`. `tests/live-presentation-limit.ts` reproduces the original DP plan's known large-input failure. Browser retries use a unique `ALGOMOTION_BROWSER_RUN`.

Recommended next engineering work: make AI explanatory text input-independent or explicitly provenance-bound; validate layout capacity across applicable executed boundary traces before marking design complete; improve safe field-level model diagnostics; strengthen instrumentation review/feedback. Do not relax validation limits or fabricate missing frames to hide failures.
