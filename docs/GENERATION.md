# Open Generation MVP

## Scope And Trust

Generation does not import the preset catalog or select Python by title/keywords. `/api/match` remains a separate preset feature. Acceptance descriptions and hand-authored Python fixtures live only under `tests/`; production obtains Python from the configured real Chat Completions provider.

Visual vocabulary: rectangular grids / sequences / bars, active/blocked/visited cells, queues, stacks, flat DP states, candidate/chosen dependencies, ordered paths, small graphs and JSON watches. AI can compose these trusted components using SceneSpec v1, after real execution and checking. It cannot create arbitrary HTML/JS/CSS or invent animation frames. Unsupported representations and unresolved semantics must be reported, not forced into presets. This is not a universal solver.

A human reviews the model-proposed contract once before generating code. Parsing uses a default-first policy: the LLM chooses conventional task defaults and implementation strategies, labels proposed defaults with `默认：` in assumptions, and respects explicit task requirements. Ordinary recognizable tasks should return no questions; JSON object identity, pivot/partition selection and unspecified benchmark requirements are not a checklist for the user. Observable rules (duplicates, empty inputs, movement, counting, etc.) remain visible and editable rather than silently chosen. Explicit scale requirements must not be silently reduced to demo limits.

Only a missing objective, conflicting requirements or essential rules with no reasonable default warrant clarification (prompt requests preferably one, at most three focused questions). This is a model policy, not a deterministic semantic classifier. The existing contract schema still accepts up to ten questions for compatibility; the application never truncates excess questions or invents answers. Unanswered questions and unsupported contracts still block code generation, and changing an answer/contract clears confirmation. Existing questionnaires require an explicit reparse, never an automatic paid retry. Defaults, human review and model samples do not prove that the contract matches the original problem. Independent verifiers apply only when their documented conventions match the confirmed contract.

The parser also distinguishes a request to demonstrate the process from a request to return intermediate states as algorithm output. Ordinary demonstration requests should keep only the final answer in the result contract and use runtime trace instrumentation for animation. The prompt reinforces nested JSON encoding, but malformed model contracts are still rejected, never silently repaired or treated as successful clarification.

## Python Entry And SDK

The only entry is `def solve(data, trace): ...`. `data` is a deep copy of the validated JSON object. Return a JSON value. Standard library imports are available inside the container. Neither browser nor host Python executes this code.

```python
def solve(data, trace):
    values = list(data["values"])
    trace.snapshot("initial", grid=[values], variables={"count": len(values)})
    total = 0
    for i, value in enumerate(values):
        total += value
        trace.snapshot("accumulate", active=[i], variables={"total": total})
    trace.snapshot("return", active=[])
    return total
```

This example requires nonempty values. An empty display can use `grid=[[None]]`; boundary semantics must still be explicit.

`snapshot(action, explanation="", **state)` accepts these state keys only:

| Key | Contract |
| --- | --- |
| `grid` | Rectangular JSON scalar matrix, 1..12 rows, <=144 total cells. Arrays use one row. |
| `active`, `visited`, `blocked` | Flat IDs: `row * width + col`. |
| `queue` | Flat IDs in FIFO order. |
| `path` | Flat IDs in traversal order, not cell values. |
| `dp` | Empty, or one scalar per cell. Use null/string for unreachable, never Infinity/NaN. |
| `dependencies` | <=48 `{from,to,label,chosen}` entries; valid cell IDs. |
| `variables` | <=20 bounded JSON values, <=4 KiB total. |

Unspecified state keys retain their last value. Explicitly clear transient dependencies/path/active fields; all successful branches must finish with `active=[]`, `dependencies=[]`, `queue=[]`. Persistent obstacles must remain. `dp` is always a list, never `None`; unknown individual entries may be `None`. Trace `path` uses flat IDs, even if returned paths use coordinate pairs. Dependencies record the current transition, not the entire predecessor history. Record each partial path within the actual backtracking loop, not by staging a complete answer afterward. Each call records an immutable full JSON snapshot and actual caller line in `solution.py`, with a contiguous step number. Successful branches require at least one snapshot. Code-generation output schema accepts only `python`, never a model-supplied frame array.

Custom graph convention: `variables.nodes=[{id,label}]`, `variables.edges=[{from,to,label,chosen}]`, at most 48 nodes/edges within the existing variables byte limit. A placeholder grid `[[None]]` is allowed. Stack and additional sequence data may use other `variables` keys. These remain recorded runtime data, not model-authored animation datasets.

Instrumentation and explanations are still **untrusted**, not tamper-proof audit evidence. Python introspection is not isolated from the SDK in that process. Malicious/incorrect programs can lie about state; the renderer cannot prove instrumentation completeness. Host-side checks validate transport, types, references, finite values and resource bounds. Runtime-origin labels are not correctness evidence.

## Input And Results

`inputSchema` contains JSON-encoded non-executable JSON Schema. Supported keys: `type` (object/array/integer/number/string/boolean/null), `properties`, `required`, `additionalProperties:false`, `items`, `minimum`, `maximum`, `minItems`, `maxItems`, `minLength`, `maxLength`, `description`, scalar `enum`. Root must be object. Unknown input fields are rejected. No refs, remote resolution, regex or expressions. Cross-field constraints such as rectangularity/endpoints are also checked by applicable independent verifiers, generated input handling and final trace validation.

Bundle shape: `{format:"algomotion-generated",version:1|2,program:{source,contract,python,verification,presentation?},trace,evidence}`. Bundle v1 has no presentation; v2 requires SceneSpec v1. Generated trace stays v3; preset trace stays v2. Imports check complete schema, version, size/depth/unsafe keys, step continuity, grid references, source-line bounds, input compatibility and every presentation binding. Imports never execute Python or trust stored evidence. Browser persistence includes the categorized IndexedDB library (100 entries / 32 MiB), a separate legacy explicit localStorage slot, and portable JSON exports; quota/conflict errors are surfaced. Opening/importing does not execute code. User programs are not stored on the API server filesystem. See [TRACE.md](TRACE.md) for versioned library envelopes and SceneSpec details, and [USAGE.md](USAGE.md) for user-facing backup instructions.

## API And Progress

The new-problem workflow uses a native modal dialog for problem text, parsing, contract review and generation options. Form state and requests remain owned by the mounted Generator, not the dialog. Once the jobs API accepts a new submission, the dialog closes and the main workspace displays real progress and eventual code/trace/evidence. Previous output is cleared only after acceptance, so a new task is not displayed under an old result. Submission errors stay in the form; later failures appear on the main page and remain available when reopening the review. Imported/saved demos open directly in the main workspace, while library drafts open the form.

Closing by X, the return button or Escape never aborts parsing/generation; explicit cancellation retains the existing request abort/job-delete behavior. The form is read-only during work, and draft fields/answers/confirmation survive closing/reopening without another model call. Opening model settings temporarily replaces the form, then returns to it. Draft-save cancellation returns to the form; successful saving closes it. Native modal inertness plus Tab wrapping keep focus inside the dialog; closing returns focus to the main progress heading and pauses playback while editing. This is in-page continuation, not a durable background worker: refresh/navigation can discard unsaved fields and cancel requests, so callers must keep the page open and explicitly save durable results.

Model configuration is shared by one local API instance. The UI supports DeepSeek, Kimi/Moonshot, OpenAI and custom Chat Completions-compatible endpoints. `GET /api/model-settings` returns metadata and an anti-CSRF nonce, never the API key. Save/reset/test requests require that nonce, a loopback Host, same-site origin, and JSON on writes. No CORS is enabled. This is not remote-user authentication.

`POST /api/model-settings` validates and updates settings without an upstream request. New requests capture an immutable config snapshot; already submitted jobs keep their original provider/key. `DELETE` removes the UI override and returns to the unchanged environment configuration. `POST /api/model-settings/test` requires explicit `consent:true`, sends one bounded JSON request, never saves the draft, and is limited to one concurrent check. A passing connection check is not generation or correctness evidence. Keys are not included in prompts, containers, trace exports or public diagnostics.

The UI defaults to disk persistence: `.algomotion/model-settings.json` v2 stores up to 20 named profiles, each with its own complete configuration/key, and a nullable active profile ID. Atomic file replacement and POSIX 0600/0700 permissions are retained; Windows relies on directory ACLs. This is plaintext, not an OS credential vault. The default is visible before the user saves. Browser storage is not used for keys, and public profile metadata never returns them. Blank keys only reuse the addressed profile/current configuration when both provider and normalized endpoint match; explicit new profiles require a key. Switching existing profiles sends only an ID/revision and does not call the provider. Accepted jobs retain their original immutable config snapshot.

The desktop settings dialog opens a read-only profile list, not an editor. Each row exposes explicit use/edit/delete actions and the currently active profile is marked. The editor is a separately mounted component with its own draft/key state, initialized from the selected profile rather than the active profile; inactive profiles can be edited without activating them first. "Save and use" is an explicit mutation/activation, then returns to the list. Cancel/back/Escape discards the editor without requests; the key input is unmounted outside editing. Failed saves retain the draft, failed switches retain the active selection, and edits clear outdated connection-test feedback. This uses the existing API/file format; it does not reinterpret or automatically repair previously saved credentials or provider/model pairs.

The old v1 single-profile format loads as an existing profile without rewriting the file; the next explicit persistent mutation writes v2. Session overrides do not change/delete disk profiles and disappear on restart, revealing the last persisted selection. Activating environment fallback preserves all profiles and never modifies `.env`. Deleting the active profile falls back to environment rather than choosing another paid provider. Named profile updates/activation/deletion are protected by the existing local-only/nonce/rate boundaries; UI revision tokens reject stale tabs, and disk fingerprints detect pre-existing external file changes before overwrites. This is a single local service, not an interprocess database or account system. Invalid/oversized/symlinked files are not silently repaired or overwritten. Runtime persistence does not extend a vendor key's validity or budget.

`GET /api/model-settings` adds `profiles`, `activeProfileId` and a process-local `revision`. `POST /api/model-settings` accepts optional `name`, `profileId` and `revision`: an explicit null ID creates a profile, an ID edits that profile, omission preserves legacy current-config behavior. `POST /api/model-settings/activate` takes `{profileId, revision}` (null selects environment); `DELETE /api/model-settings/profiles/:id` removes one saved profile. `DELETE /api/model-settings` remains an explicit clear-all. None return keys or invoke the provider. `ALGOMOTION_SETTINGS_MODE=memory` disables file load/save, including in default isolated Playwright servers; disk browser tests use a separate API and temporary files. GUI config takes precedence over `.env`; malformed disk config is flagged and ignored.

Each provider exposes editable JSON output mode, token parameter, output budget, and optional thinking-disable parameter. Unknown or unsupported model capabilities fail explicitly; there are no automatic compatibility retries. Official provider presets reject unofficial hosts; proxies require explicit custom selection. Endpoint changes never silently reuse an existing key. Custom HTTP is limited to loopback; redirects are rejected. Users must trust their chosen endpoint and its privacy/billing policies.

`npm run test:live` loads persisted UI settings (if present) before falling back to `.env`; it cannot read another server process's session-only settings. Paid execution still requires `ALGOMOTION_LIVE_ACCEPT=1`. The pure-Node `doctor` command checks `.env` fields only; use the web UI for current UI-model configuration status.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/generate/status` | Model presence + Docker/image readiness, no secrets. |
| `POST /api/generate/parse` | `{source}` -> `{contract}`, real model parsing only. |
| `POST /api/generate/jobs` | `{source,contract,verification,confirmed:true,design?:boolean}` -> `202 {id}`. UI defaults design=true; legacy callers may omit it. |
| `POST /api/generate/jobs` | `{program,input,confirmed:true}` -> same-Python rerun, no model call. |
| `POST /api/generate/jobs` | Rerun plus `design:true` executes/checks unchanged Python and requests a new design. Plus `repair:true,feedback?:string` requests a new Python attempt, then executes/checks and designs. Repair feedback is bounded to 4,000 characters and treated as untrusted data. |
| `GET /api/generate/jobs/:id` | Actual generating/executing/checking/designing/complete/failed stage; terminal bundle or diagnostics. |
| `DELETE /api/generate/jobs/:id` | Abort model/execution; cleanup does not depend on client polling. |

At most two active parse/generation tasks and 12 costly requests/minute/IP. At most 10 task entries; terminal entries are reclaimed on subsequent creations by capacity or after 30 minutes. Restart loses transient jobs. Docker probes share one in-flight request and cache for five seconds. These are local single-process bounds, not public-service quotas.

No automatic model retries. A new UI flow makes one parse request, one Python request and, only after checks pass, one SceneSpec request (up to 4,000 completion tokens for design, further limited by provider settings). Explicit repair normally requests Python and design; explicit redesign requests design only. Plain input changes make zero model calls and work with no current model configuration. Presentation failure retains raw execution. Incompatible old bindings are removed from the diagnostic bundle rather than allowing an unreadable/unsafe design.

Before marking a design complete, all frames from current input, model samples and applicable independent boundary executions are checked against it. The model receives the observed maximum dimensions/capacities, not just a small example. A 48-node graph over a grid will be rejected when an executed boundary has 144 cells, even if the current input is 2x2. Reused designs undergo the same checks with no model request. The temporary validation corpus has at most ten traces, each subject to the 2 MB trace cap, and is released after the job rather than exported/stored with it. This is finite executed-case coverage, not proof over the entire input domain.

The player uses runtime-derived summaries and trusted panel headings. Model-authored titles/descriptions are preserved only as original design metadata, available through an explicit static/spoiler inspector that closes on input/program replacement. They cannot silently become current results or stack-direction instructions. This does not prove the correctness of a generated program's runtime explanations.

### Safe Failure Diagnostics

Generation errors include a stable `code` and a readable `message`. The parse UI now shows both, as the job UI already does. Known field paths, numeric indexes, types and protocol limits are allowed; unknown property names are replaced with `*`. No provider bodies, exception text, source snippets, arbitrary values, keys, headers or credentials are returned. Diagnostics distinguish:

| Code | Meaning |
| --- | --- |
| `MODEL_CONTRACT_JSON` | Invalid JSON inside `inputSchema`, `examples[i].inputJson` or `expectedJson`. |
| `MODEL_CONTRACT_SCHEMA` | Invalid contract/schema structure or unsupported fields. |
| `MODEL_CONTRACT_INPUT` | Missing required declarations, invalid required references or a model sample not satisfying its contract. |
| `MODEL_PYTHON_SCHEMA` / `MODEL_PYTHON_LIMIT` | Missing/wrong-type/extra Python response fields, character bounds or the 48,000 UTF-8 byte source limit. |
| `MODEL_PRESENTATION_SCHEMA` | Invalid SceneSpec fields, including a grid panel whose source is not `grid`. |
| `PRESENTATION_BINDING` | A checked execution violates a panel's data/type/reference/capacity requirements. |
| `MODEL_ENVELOPE_JSON` / `MODEL_ENVELOPE_SCHEMA` / `MODEL_CONTENT_JSON` | Invalid outer provider JSON, missing completion structure, or non-JSON completion content. |
| `MODEL_TRUNCATED` / `MODEL_REFUSAL` | Token truncation or refusal; content is not exposed. |
| `MODEL_HTTP_ERROR` / `MODEL_RESPONSE_LIMIT` / `MODEL_EMPTY_RESPONSE` | Upstream HTTP status, response byte limit or missing response body. |
| `MODEL_TIMEOUT` / `MODEL_CANCELLED` / `MODEL_TRANSPORT` | Timeout, explicit abort or network/read failure. |

For example, an error can now say `examples[0].inputJson.grid: 数据类型不符合约定 (TYPE)` or `python: 应为 string，实际为 number`, instead of collapsing these into an unknown JSON error. Extra-field diagnostics deliberately hide arbitrary field names. They do not make the model automatically more reliable, trigger automatic retries or relax any validation.

## Isolation And Limits

With Node.js 22.12+, macOS `npm run setup -- --install-docker` installs missing Colima + Docker CLI using Homebrew, never Docker Desktop. It starts a dedicated `algomotion` profile with the Docker runtime, `--activate=false`, `--mount none`, and no SSH-agent forwarding. New profiles receive 2 CPUs / 2 GiB RAM / 10 GiB data disk; existing profiles keep size settings. The host VM still needs initial network downloads, local storage and virtualization support. Build/probe/execution use the same scoped `colima-algomotion` context rather than modifying the global selection. setup also installs project dependencies, preserves/creates `.env` and builds the runner image; no initial `npm ci` is needed. Plain setup never installs system packages. `--presets` bypasses container configuration; `--dry-run` writes/runs nothing; doctor is read-only and makes no model calls.

Windows without Desktop uses WSL2 plus Docker Engine and Linux Node.js inside the distribution; native Windows can still reuse a configured Linux engine. Linux uses an already accessible Engine. The script does not install Desktop or automate WSL provisioning, package repositories, groups, socket permissions, systemd, licenses or other security settings. Windows-native/WSL behavior requires separate real acceptance; mock platform tests are not proof of it.

`ALGOMOTION_CONTAINER_RUNTIME=auto` prefers an existing dedicated Colima profile on macOS, otherwise reuses the current engine. `colima` explicitly provisions/selects the managed macOS profile, and `external` disables automatic Colima selection/startup. Explicit `DOCKER_BIN` or Docker connection variables override auto discovery. Combining colima mode with `DOCKER_HOST`/`DOCKER_CONTEXT` fails instead of silently changing the endpoint. Homebrew CLIs are discovered before the Desktop CLI fallback when PATH lacks them. Known Desktop CLI paths remain compatible with existing installations, but no GUI launch/install code remains. The API captures its resolved command/prefix on first use so a newly created profile cannot redirect its own active jobs; restart the API after changing runtime. External clients relying on the global default context should not change that context during active jobs; set an explicit `DOCKER_CONTEXT`/`DOCKER_HOST` for a stable target.

`npm run dev` / `npm start` first check/warm an already configured profile, without package installation, new profile creation, env-file writes or sandbox image builds. A configured profile that has never successfully booted may still require VM initialization/downloads. Failure logs a generation-only warning and still allows preset startup. `npm run runtime:start` runs the same preparation with a failing exit status when unavailable. The child process PATH includes discovered Colima/Docker directories so Colima can find Docker/Lima before a terminal PATH refresh; the user's shell/global settings are not rewritten. Colima remains running after the app exits; `colima stop algomotion` is an explicit user operation. The API itself never launches a runtime, installs/pulls images or falls back to host Python. `npm run sandbox:build` explicitly builds from `sandbox/`, honoring the image and runtime configuration. A trusted image label is checked and execution uses its inspected content ID. The image, runtime and host API are administrator-controlled trusted dependencies. Maintain/update them; a pinned version is not a vulnerability guarantee.

| Boundary | Limit |
| --- | --- |
| HTTP | 128 KiB request; source <=6,000 characters |
| Input | 32 KiB JSON, depth 16, <=20,000 nodes |
| Python | <=48,000 UTF-8 bytes, not a shell command |
| Network | `--network=none` |
| Identity | UID/GID 65532, all capabilities dropped, no-new-privileges, Docker default seccomp |
| Filesystem | Read-only root, no bind mounts; 16 MiB noexec/nosuid/nodev `/tmp` tmpfs |
| Resources | 128 MiB memory and equal swap ceiling, 0.5 CPU, 32 PIDs, 64 file handles |
| Python rlimits | 3 CPU seconds/process, 1 MiB file size, no core dumps |
| Time | Create 10 s; execution 12 s wall-clock; cleanup 5 s/attempt, two attempts |
| Logs | Captured stdout/stderr 8 KiB each; raw combined transport <=2,004,096 bytes; Docker log driver none |
| Trace | <=600 snapshots, <=144 cells, <=2 MB total; SDK cuts off at 1.9 MB encoded frames |
| Return/import | Return <=32 KiB; bundle <=2.3 MB |
| Model | 90 s, <=180 KB response, <=10,000 completion tokens; no automatic retries |

Only Docker CLI runs on the host, using argument arrays. Source/input enter containers over stdin. Containers get no model environment variables, user home, Docker socket or unnecessary mounts. Diagnostics expose exception category and source line, not arbitrary exception text, stdout/stderr, provider bodies, headers or host paths.

Finally blocks force-remove only the random `algomotion-UUID` task container on success/failure/timeout/cancellation/overload. Killing the CLI alone is not container cleanup. If removal cannot be confirmed, future runs fail closed and the user is told to inspect that named container and restart API. Sudden host/API crashes are a remaining operational limitation: inspect leftover `algomotion-*` containers. Do not kill unknown processes/containers. Production-grade crash recovery needs an external supervisor.

**Not a public multi-tenant sandbox.** Docker shares a Linux kernel and cannot guarantee defense against runtime/kernel exploits. The host API has daemon privileges and is unauthenticated. It rejects non-loopback Host and cross-site browser requests, but local programs are not an authenticated boundary. Public use requires separately designed stronger isolation (e.g. per-job microVMs), authentication, quotas, auditing, image maintenance and infrastructure review. No public deployment has been performed.

## Correctness And Tests

Separate labels: structure passed, runtime passed, model examples passed/failed/not run, independent validation passed/failed/not run, teaching checks and presentation bindings. Run success and animation consistency do not prove problem correctness. Check failures retain the main execution bundle for diagnosis. Exceptions during checks do not turn an incomplete check into success. Protocol diagnostics disclose whitelisted field paths/types/limits, not arbitrary values, exception messages or secrets.

Teaching checks for the selected grid semantics inspect original grid/obstacle retention, terminal cleanup, final path agreement, partial-path lengths, queue presence and DP/candidate representation across main/examples/independent inputs. They are finite consistency checks, not a proof of honest/complete instrumentation. Generic tasks report `not_run` after terminal-cleanup checking. Failing checks stop design generation and expose an explicit repair action; they do not automatically alter the program or synthesize missing snapshots. Presentation `passed` means data/type/reference/capacity compatibility across the recorded validation corpus, not algorithm correctness or guaranteed design quality.

Independent checkers are trusted TypeScript repeated-edge-relaxation references, never Python generators. They check current input plus six independently authored boundaries (including 12x12), verifying legal paths and optimal objective, without imposing unique tie-breaking:

- `grid-shortest-4`: `{grid,start,end}`, 0/1 rectangle, 0 walkable, four neighbors, edge count. Output `{distance,path}`; no solution `distance=-1,path=[]`; blocked endpoints unreachable; walkable start=end gives 0 and one point.
- `grid-min-right-down`: `{grid}`, nonnegative integer rectangle, top-left to bottom-right, only right/down, includes both endpoint weights. Output `{sum,path}`.
- `none`: supports other generated tasks, but no independent correctness claim.

```sh
npm run check
npm run build
npm run test:e2e
npm run sandbox:build
npm run test:sandbox
npm run test:live
```

Generation unit/browser suites explicitly mock upstream/runner outputs. `test:sandbox` runs hand-authored acceptance Python in REAL Docker, plus infinite loops, stdout/stderr/raw output overload, event/byte overload, memory excess, syntax/trace errors, cancellation, invalid input, network refusal, no host mounts/secrets, non-root and read-only root. Missing Docker exits 2 with `NOT RUN`, not green success.

`test:live` requires model `.env`/explicitly persisted UI settings plus `ALGOMOTION_LIVE_ACCEPT=1` as explicit consent to provider charges. It submits both full unseen acceptance descriptions to the REAL model, refuses unresolved questions rather than fabricating answers, runs resulting Python in REAL Docker, validates references/teaching, requests AI SceneSpec and changes inputs without regenerating source/layout. Sanitized bundles/diagnostics go under timestamped `artifacts/live-presentation-*/`, protected from Playwright cleanup. There is no fixture fallback. Windows can set the opt-in in `.env` exactly as macOS; no shell policy changes are needed.

For session-only UI settings, use the existing running API rather than reading its key: `npm run test:live:ui -- parse bfs` (or `dp`), with `ALGOMOTION_LIVE_ACCEPT=1` and a unique `ALGOMOTION_LIVE_RUN`. Review the saved contract in `artifacts/live-ui-<run>/`, supply explicit review notes (`answers`, `removeAssumptions`, `correction`, `limitation`, optional `required`) in `<case>-review-notes.json`, then run `review <case>`. With `ALGOMOTION_CONTRACT_REVIEWED=1`, `generate <case>` requests real Python and SceneSpec; `rerun <case>` reuses them. These are manual opt-in integration helpers, not automatic repair or evidence that a run succeeded. The UI itself is the simpler interactive route for reviewing contracts and explicit repairs. Backend restarts clear session-only keys; re-save in the UI, never send keys in chat.
