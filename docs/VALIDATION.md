# Validation Record

## Consolidated Preset Fixes And Local Regression (2026-09-22)

This entry supersedes the current-status summaries of the historical implementation batches below; their original deferred-test statements remain as records of those earlier turns. Work stayed in the application directory and preserved existing source. No model credentials/settings, generated execution protocol or Docker configuration were changed.

Fixed Jump Game II's reachability bands by comparing the array-clipped next frontier with the current end, avoiding inverted/out-of-bounds candidates after overshooting the destination. Added four deterministic unit cases and a desktop case that verifies final-band cleanup and restores the genuine candidate on rewind. The preset recorder now normalizes numeric negative zero on cloned input/frames/results only; caller input and live state are not mutated, and literal text `"-0"` is preserved. Six recorder tests cover nested values, scalar returns, input immutability and algorithm round trips. Trace v2 is unchanged.

The generic browser result assertion now follows the existing variable panel's string-display contract, while the separate final-output card is still checked as parsed JSON. DP/search/greedy category counts are derived from the catalog. Two older nested-array/boolean-array output assertions now compare parsed data instead of pretty-print whitespace. Java Decode String now appends the repeated segment with a loop rather than calling Java 11's `String.repeat`, preserving the documented JDK 8 compatibility. Contributor instructions recommend a supported JDK 17+ distribution while retaining the JDK 8 baseline. CI configuration adds JDK 8/17 reference jobs and selects the desktop browser suite; these remote jobs were NOT executed here.

Actual commands/results on local macOS with Node 26.9.0, Zulu JDK 8u504 and Python 3.14.7:

| Check | Actual Result |
| --- | --- |
| Fresh pre-edit `npm test -- --reporter=json --outputFile=…` | 2497/2499 passed; failures reproduced the jump-band bounds and Min Stack negative-zero round trip. |
| `npm run check -- --reporter=dot` | TypeScript and 2509/2509 unit/API tests passed. |
| Final `npm run check -- --reporter=json --outputFile=…` | TypeScript and 2509/2509 tests passed again, across 25 files. |
| `npm run build` | Passed; main JS 915.29 kB, gzip 272.11 kB. The existing >500 kB chunk warning remains; code splitting was not included in this repair. |
| `npm run test:references -- java`, using explicit Zulu 8 java/javac executables | All 100 reference implementations and 591 fixture cases passed, including Decode String. No system Java selection was changed. |
| `npm run test:references -- python` | All 100 reference implementations and 591 fixture cases passed. |
| `npm run test:references -- go` | Attempted, exited with `spawnSync go ENOENT`; no Go reference was executed. No toolchain installation was performed. |
| `npm run test:e2e -- --grep-invert 'mobile\|390px' --workers=2 --max-failures=10 --reporter=line,json` | All 265 selected desktop scenarios ran: 263 passed, 2 failed on already-loaded old JSON-whitespace assertions in advanced/ordering test files. No tests were skipped or stopped by the failure cap. |
| `npm run test:e2e -- tests/e2e/advanced-presets.spec.ts tests/e2e/ordering-structures.spec.ts --workers=2 --reporter=line,json --output=test-results/recheck` | After the assertion corrections, all 26 scenarios from both affected files passed, including both former failures. The complete 265-case suite was not run a second time. |

The desktop run covers all 100 preset sample traces and reference highlights, plus causal state/identity/rewind/upper-bound scenarios and existing settings/library/generation UI tests. Generation/model/container-related unit and browser tests use mocks; they are not proof of live providers or actual isolation. No real model request, live sandbox check, Windows/Linux local run, JDK 17 local run, release audit, dependency install, system change, archive, Git operation or upload was performed. Private configuration was not inspected. Go execution, additional runtimes/platforms, live generation/isolation and the deferred bundle-size optimization remain separate work.

## Hot 100 Batch 11: Final Six Presets, Catalog Implementation Complete (2026-09-22)

Added presets 5, 1143, 72, 136, 169 and 287, bringing the implemented catalog from 94 to 100. Every new preset includes strict bounded input, deterministic Trace v2 execution, authored Java/Go/Python references and semantic line mappings. Longest Palindrome uses odd/even center expansion with leftmost ties. LCS/Edit reuse the DP scene with optional labeled axes, recorded dependency values, reverse state paths and recovered alignment suffixes. XOR/Majority reuse the array scene and add actual cancellation records, bit calculations and surviving input identities. Duplicate Number reuses the linked-list scene with optional array-index edge semantics and traversed reads, distinguishing an internal meeting point from the final entrance. Existing DP/list fields remain compatible; generation, model settings and Docker paths were not changed.

Authored 36 shared fixtures, 120 independent comparisons per new algorithm (720 comparisons), boundary/invalid-assumption tests, JSON/snapshot/reference-location checks, DP/substring/cancellation/pointer invariants and a 100-distinct-ID/number catalog test. Oracles enumerate substrings, subsequence masks and edit alignments, or use independent frequency counts/sorting. Edit witness checks consume the source, reconstruct the target and count non-keep operations without requiring a unique optimum script. Duplicate native adapters assert that the array is not modified. Nine desktop scenarios cover sample frames in reverse, axes/alignment/candidate/bit/pointer restoration, movement cancellation, changed/invalid inputs and 1280/1440 upper-bound geometry. These tests were authored but NOT executed.

Actually ran `node node_modules/typescript/bin/tsc -b` three times; all passed. Also ran a static `rg`/`awk` count over catalog declarations: 100 entries and 100 distinct problem numbers, with no duplicate numbers reported. This is a source inventory, not runtime verification of the catalog test. Static review corrected final cancellation highlighting to select surviving elements rather than canceled ones, prevented the XOR initial frame from implying it had read a zero element, kept pre-backtracking alignment panels hidden, and clarified that nums[entrance] can happen to equal the entrance index without making the two concepts interchangeable. TypeScript does not execute algorithms or compile the embedded reference languages, and does not establish visual correctness.

The implementation target is complete, but acceptance is not: the latest 85 presets plus changed shared code still await consolidated behavioral, native-language, desktop and regression testing. No Vitest baseline/full suite, Playwright, native reference execution, production build, browser inspection, model/container test or release audit ran in this batch. No dependency installation, API request, private configuration inspection/change, system change, archive, Git action or upload was performed. There is no scheduled background test task. Historical pass records below do not validate these additions. See [HOT100.md](HOT100.md) for the complete batch ledger and next acceptance phase.

## Hot 100 Batch 10: Greedy Frontiers And Dynamic Programming (2026-09-22)

Added presets 45, 763, 118, 198, 279, 139, 152, 416, 62 and 64, taking the implemented catalog from 84 to 94. Each has a strict bounded input contract, deterministic Trace v2 executor, Java/Go/Python reference code and semantic location mappings. A new trusted `state-dp` scene separates original input from computed registers, retaining actual dependency values/epochs, candidates, greedy range bands, completed segments and witnesses. Grid costs and DP values are distinct boards; product extrema use separate rows; uncomputed Pascal/DP cells stay blank. The scene reuses MovingGroup/FlowArrow, with forward-only adjacent movement and snapshot restoration on rewind/seeks. Ordinary presets remain model/container independent; generated-mode contracts and model configuration were not modified.

Authored 60 shared fixtures, 120 independent comparisons per algorithm (1,200 comparisons), invalid-input/upper-bound checks and semantic invariants for dependency endpoints and values, unknown cells, snapshot isolation, nonadjacent houses, dictionary segments, square decompositions, product intervals, previous-round subset sources and legal/optimal monotone paths. Independent oracles use BFS, all partition masks, binomial coefficients, nonadjacent subset enumeration, dictionary-prefix concatenation, all continuous intervals, subset masks and enumeration of all monotone grid paths. Native adapters explicitly convert dictionary string arrays and numeric matrices. Thirteen desktop scenarios cover sample playback in reverse, state/epoch/segment/witness restoration, language highlights, animation cancellation, changed/invalid inputs and upper-bound geometry at 1280/1440 widths. These behavioral/native/browser tests were authored but NOT run.

Actually ran only `node node_modules/typescript/bin/tsc -b`, three times; all three passed. The final check includes the completed renderer, engine, references and test sources. Static inspection also normalized arithmetic negative zero, cleared previous candidate highlights when starting a new prefix/amount, used multiplication rather than addition in product witnesses, labeled product cards as maximum candidates while separately displaying minimum dependencies, and prevented a valid negative product of -1 from being styled as an unreachable jump. TypeScript does not execute algorithms, compile the embedded Java/Go/Python code or establish actual DOM geometry/animation behavior.

Per the user's consolidated-testing workflow, no Vitest baseline/full suite, Playwright, native reference execution, production build, browser inspection, model/sandbox test or release audit ran. No installs, API requests, secret/configuration inspection or changes, system changes, archives, Git operations or uploads were performed. The latest 79 presets and touched shared code remain pending behavioral, native-language, desktop and regression acceptance. Historical passing entries below do not validate this batch. Six target problems remain; see [HOT100.md](HOT100.md).

## Hot 100 Batch 9: Ordering, Partition, Heap And Trie Presets (2026-09-22)

Added presets 41, 48, 74, 240, 153, 4, 208, 215, 347 and 295, taking the implemented catalog from 74 to 84. All have strict bounded input, deterministic Trace v2 execution, Java/Go/Python reference code and semantic location mappings. Existing array animation is reused for placement/minimum search; new trusted ordering/structure scenes use the existing movement/flow primitives for matrix identity swaps, partition cuts, explicit heap operations and Trie nodes. Generated-mode contracts, settings and Docker execution were not changed. Ordinary presets retain no model/container dependency.

Authored 60 shared fixtures, 120 independent comparisons per algorithm (1,200 comparisons), invalid-input checks, element-identity/candidate/cut/heap/prefix invariants and 13 desktop scenarios. Independent references use set membership, coordinate rotation, linear search, full sorting, direct frequency counts and a set of inserted words. The stream oracle sorts each input prefix; separate invariants inspect heap order at ready steps, balanced sizes and cross-heap value ordering after completed insertions. Tests also inspect exact Trie prefixes/terminal flags and ensure queries do not allocate nodes. Native adapters add operation-array conversion, rotation matrix/row identity checks and value-multiset preservation for First Missing Positive. Browser scenarios traverse sample snapshots backwards, inspect identities/cuts/terminals/heap slots/output, verify swap-animation cancellation, exercise changed/invalid input and check bounded geometry at 1280/1440 widths. These behavioral/native/browser tests were authored but NOT run.

Actually ran only `node node_modules/typescript/bin/tsc -b`, five times. The first found an unsafe target-field union assertion in the matrix dispatcher and the still-missing new IDs in the native harness method map. The target now comes from the appropriate validated search schema, and the native mapping/adapter integration was completed. All four subsequent checks passed, including the final renderer, reference strings, unit/API-adjacent test sources and desktop cases. TypeScript does not compile or execute the embedded Java/Go/Python snippets and does not validate actual DOM layout or animation. Static inspection changed invalid median cross-comparisons to display the actual `>` relation, reserved vertical space for swap arcs, avoided treating the minimum's array end as an insertion candidate, and kept median highlighting on a common return calculation.

Per the user's consolidated-testing workflow, no Vitest baseline/full suite, Playwright, native reference execution, production build, browser visual inspection, sandbox/model check or release audit ran. No dependency installation, model request, secret/configuration change, system modification, archive, Git action or upload was performed. The latest 69 implemented presets plus touched shared code remain pending behavioral, native-language, desktop and regression acceptance. Historical passing entries below do not validate this batch. The remaining 16 target problems are listed in [HOT100.md](HOT100.md).

## Hot 100 Batch 8: Backtracking, Grid BFS, Topology And Matrices (2026-09-22)

Added presets 17, 22, 131, 79, 51, 200, 994, 207, 54 and 73, taking the implemented catalog from 64 to 74. Each has strict bounded input, a deterministic Trace v2 executor, Java/Go/Python reference implementations and semantic line mappings. The trusted exploration scene reuses FlowArrow/MovingGroup for string choices and undo, grid paths and witnesses, queen attack explanations, orange infection transfers, identity-stable BFS/topological queues, prerequisite release and matrix markers/boundaries. No existing source was relocated, generated-mode protocol changed or model/container dependency added to presets.

Authored 60 shared fixtures, 120 independent comparisons per new algorithm (1,200 comparisons), strict-input rejection, frame/reference/snapshot checks, capacity and causal invariants, plus 13 dedicated desktop scenarios. Oracles use Cartesian products, parenthesis bit masks, partition cut masks, breadth-first simple paths, queen column permutations, union-find islands, synchronous full-grid infection rounds, transitive closure cycle detection, direction-based spiral walking and zero sets from the original matrix. Native helpers add char/byte board conversion, checks that Word Search preserves its board, and checks that Set Matrix Zeroes returns the in-place matrix/row identities. Browser scenarios traverse sample snapshots backwards, inspect queues/labels/paths/collected outputs and language highlights, check queue-motion cancellation, rerun/invalid-input behavior and 1280/1440 layout bounds. These behavioral/native/browser checks were NOT executed.

Actually ran only `node node_modules/typescript/bin/tsc -b`, three times. The first failed because the ten new IDs had not yet been added to the native harness method map; that integration was then completed. The second found an overly narrow `(0 | null)[]` inferred type in the independent infection-time oracle; explicitly annotating `(number | null)[]` fixed it. The third passed with the completed desktop tests, renderer and engine. No runtime test or build result is implied by this successful type check. Static inspection also aligned the initial rotten-cell settled IDs with their minute-zero queue/labels.

Per the user's deferred-testing workflow, no Vitest baseline/full suite, Playwright, native reference execution, production build, browser visual inspection, Docker/model integration or release audit was run. No installs, model requests, secret/configuration changes, system changes, archive, Git operation or upload were performed. The latest 59 presets and changed shared files await final behavioral, native-language, desktop and regression acceptance. Historical passing records below do not validate these additions. The remaining 26 target problem IDs are listed in [HOT100.md](HOT100.md).

## Hot 100 Batch 7: Advanced Trees, Merge Lists, LRU And Backtracking (2026-09-22)

Added presets 105, 437, 236, 124, 148, 23, 146, 46, 78 and 39, bringing the implemented catalog from 54 to 64. Each includes a bounded input contract, deterministic Trace v2 executor, Java/Go/Python reference code and semantic line mappings. Existing tree/list renderers were extended with optional construction/prefix/target/work state; the new trusted search/cache scene shows choice/undo flows, accumulated answer copies, stable cache-node motion and actual doubly-linked neighbors. Generation protocols, model configuration and sandbox behavior were not changed. Ordinary presets remain model/container independent.

Authored 60 shared result/edge fixtures, 120 independent scenarios per algorithm (1,200 comparisons), invalid-input and snapshot/identity/path invariants, and 13 desktop scenarios. Independent oracles use ancestor walks for downward path counts, all-start graph path enumeration for maximum sums, ancestor-set intersection for LCA, known tree traversals, stable node ordering, insertion-based permutations, bit-mask subsets, candidate-count vectors and an array-ordered LRU model. Native adapters check original list object identities, unchanged values and stable duplicate order after sorting/merging, and resolve LCA against original BFS node objects. Desktop cases cover reverse snapshot traversal, language highlights, cache movement cancellation, changed/invalid input and bounded layouts at 1280/1440 widths. All these behavioral, native and browser checks are authored but NOT executed.

Actually executed only `node node_modules/typescript/bin/tsc -b`, three times. The first attempt found a nullable fast-pointer inference error in the linked-list splitter. An explicit `number | null` annotation fixed it; both subsequent invocations passed. The final invocation includes the completed desktop tests and the partial-output reset when entering another merge subproblem. Static inspection also separated Path Sum's cumulative count from its actual subtree return value and removed an empty-path label that would overlap the undo token. These are implementation/type-check results, not runtime verification of algorithms, native snippets, DOM geometry or animations.

Per the user's consolidated-testing preference, no Vitest baseline/full suite, Playwright, native reference execution, production build, browser inspection, Docker/model test or release audit was run. No dependency installation, model request, secret/configuration change, system modification, archive, Git operation or upload was performed. The latest 49 presets and shared changes remain pending consolidated behavioral, native-language, desktop and regression acceptance. Earlier successful records below are historical and do not validate this batch. See [HOT100.md](HOT100.md).

## Hot 100 Batch 6: Ten Tree Presets, Runtime Validation Deferred (2026-09-22)

Added presets 94, 104, 226, 101, 543, 108, 98, 230, 199 and 114, taking the implemented catalog from 44 to 54. All include bounded input contracts, deterministic Trace v2 execution, Java/Go/Python reference code and semantic line mappings. The new tree scene represents identity-preserving subtree swaps, recursion/iteration work, child-height returns, strict ancestor bounds, partial construction, per-level right visibility and actual pointer flattening. The compact-level-order parser was extracted unchanged to a shared module; its previous run.ts export and original preset bounds remain. That shared change still requires runtime regression acceptance.

Authored 60 shared result/edge fixtures, 120 independent cases per new algorithm (1,200 comparisons), input/identity/structure/path invariants and 13 dedicated desktop scenarios. Oracles use independently represented object trees, breadth/depth enumeration, all-pairs graph distances, mirrored shape serialization, strict inorder order, balance checks and right-first DFS. Fixtures distinguish node depth from edge diameter, include a diameter not through the root, sparse/null structure, duplicated values, ancestor violations, early kth return and actual final right-chain topology. Native adapters reuse the existing compact-tree builder and add canonical serialization plus inversion/flattening checks against original object identities and pointers. These authored tests and adapters were NOT run this turn.

The only executed verification was `node node_modules/typescript/bin/tsc -b`, run three times, all successful. The final invocation includes the completed desktop tests and final renderer/presentation changes. No TypeScript failure occurred in this batch. Type checking does not establish Java/Go/Python syntax or execution, algorithm correctness, animation/layout behavior or production bundling.

Per the user's deferred-testing workflow, no Vitest baseline/full suite, Playwright, native reference execution, production build, browser visual inspection, Docker/model integration or release audit was run. No dependency installation, paid model request, credential/configuration change, system change, archive, Git action or upload was performed. The latest 39 presets plus touched shared code remain pending final algorithm, native-language, desktop and regression acceptance; historical records below do not validate these additions. See [HOT100.md](HOT100.md).

## Hot 100 Batch 5: Ten Linked-List Presets, Runtime Validation Deferred (2026-09-22)

Added presets 160, 234, 141, 142, 21, 2, 19, 24, 25 and 138, taking the implemented catalog from 34 to 44. Each includes strict bounded input, deterministic Trace v2 execution, Java/Go/Python references and semantic line mappings. The new lane-based scene uses stable node identities, explicit live/retired next edges, random edges, auxiliary sentinels and separately labeled copy mappings. It lays out a finite registry rather than traversing potentially cyclic pointers. Existing reverse-list/tree implementations, generated protocols, model settings and container infrastructure were not replaced.

Authored 68 shared result/edge fixtures, 120 independent comparisons per added algorithm (1,200 comparisons), structural/snapshot invariants and 13 dedicated desktop scenarios. Independent checks use known shared-graph construction, visited-node traversal, array symmetry/sorting/block order and BigInt digit arithmetic. Structural checks cover unchanged readonly inputs, palindrome restoration on both outcomes, exact duplicate-node identity order, removed-node identity and disjoint copied next/random graphs. Native adapters construct real shared/cyclic/random-pointer inputs, verify identity for node-valued results, check palindrome restoration and reject shallow or escaping random copies. The Java JSON helper now serializes the intersection result map. These tests and native adapters were NOT executed this turn.

Only `node node_modules/typescript/bin/tsc -b` was executed for verification. The first invocation failed on nullable pointer inference and an unannotated saved successor. Explicit nullable pointer/successor types fixed the errors. Three subsequent invocations passed, including the completed desktop test file and the final copy-mapping annotation. This verifies TypeScript types only, not algorithm behavior, native snippet compilation, animations/layout or production bundling.

Per the user's consolidated-testing request, no Vitest baseline/full suite, Playwright, native-language execution, production build, browser inspection, Docker/model integration or release audit was run. No dependencies were installed; no paid API, credential/configuration change, system change, archive, Git action or upload was performed. The latest 29 presets and touched shared components remain pending final algorithm, native-language, desktop and regression acceptance. Earlier records do not validate this batch. See [HOT100.md](HOT100.md).

## Hot 100 Batch 4: Ten Stack/Window Presets, Runtime Validation Deferred (2026-09-22)

Added presets 20, 155, 739, 84, 42, 239, 438, 76, 32 and 394, bringing the implemented catalog from 24 to 34. Each has explicit bounded inputs, deterministic Trace v2 execution, Java/Go/Python references and semantic line mapping. Added stack/monotonic-stack categories and hard difficulty styling. The new scene represents stack/deque membership, separate transfer tokens, frequency requirements, partial outputs, histogram candidates, per-column water layers and current/best intervals. Model generation, private configuration and the original preset execution path were not replaced.

Authored 67 shared result/edge fixtures, 120 independent small-input comparisons for each new algorithm (1,200 comparisons in total), invalid input and snapshot invariants, and 13 dedicated desktop scenarios. Numeric oracles use enumeration/direct scanning/per-column water levels; string oracles use pair reduction, balance checks, substring enumeration and sorting; Min Stack uses direct minimum scans; decoder cases derive from independently constructed expression trees. Added a native-runtime input adapter for the MinStack reference class. These tests and native snippets were NOT executed this turn.

The only executed verification was `node node_modules/typescript/bin/tsc -b`, run twice, both successful; the second invocation includes the completed desktop test file and later snapshot/renderer changes. This verifies TypeScript compilation, not algorithm correctness, Java/Go/Python compilation, actual browser animations or bundling. Static review removed stale wall arrows after unbounded rainwater pops and stale candidate ranges in bracket processing. No runtime or browser result is claimed for these fixes.

Per the user's consolidated-testing request, no Vitest baseline/full suite, Playwright, native-language execution, production build, browser visual inspection, Docker/model integration or release audit was run. No dependency installation, paid API call, key/settings change, system change, archive, Git action or upload was performed. The latest 19 implemented presets and changed shared files remain pending final behavioral, native-language, desktop and regression acceptance; historical records below do not validate this batch. See [HOT100.md](HOT100.md).

## Hot 100 Batch 3: Implemented, Runtime Validation Deferred (2026-09-22)

Added presets 15, 75, 189, 31 and 56, taking the implemented catalog to 24. All five include bounded input schemas, deterministic Trace v2 snapshots, Java/Go/Python reference code and semantic line mappings. Array transformations retain element identity across sorting and swaps; color boundaries are recorded atomically with the matching array state. A new interval scene represents sorted source intervals, accumulated unions and original source membership. These are implementation descriptions, not runtime acceptance claims.

Authored 30 shared result/edge fixtures, independent differential tests using triple enumeration, numeric sorting, index remapping, exhaustive permutations and interval-overlap connected components, plus identity/partition/membership invariants and eight desktop scenarios. These tests have NOT been executed this turn. The native-reference harness now supports numeric matrix arguments for interval merging, also pending execution.

The only executed verification was `node node_modules/typescript/bin/tsc -b`. The first invocation found a TypeScript callback-signature error in a new test; it was fixed by wrapping `JSON.stringify` in a single-argument callback. Subsequent compilation passed, including a final invocation after the interval-width changes. TypeScript compilation does not validate algorithm behavior, native-language references, playback, layout or production bundling.

Per the user's request, no Vitest, Playwright, native-language execution, production build, browser visual inspection, Docker/model integration or release audit was run. Earlier records do not validate this batch or the current shared-component changes. No dependency installation, API call, credential/configuration change, archive or upload was performed. The latest nine presets and shared changes remain pending consolidated acceptance. See [HOT100.md](HOT100.md).

## Hot 100 Batch 2: Implemented, Runtime Validation Deferred (2026-09-22)

Added presets 49, 128, 238 and 560, taking the implemented catalog to 19. Added strict bounded inputs, deterministic runtime snapshots, all three reference languages and dedicated grouping/prefix-product/prefix-sum scenes. Consecutive sequences reuse the existing array/chain renderer. Word identity survives grouping, product state excludes the current element, and subarray counting queries only earlier prefix positions before inserting the current one. These describe the implementation, not newly verified runtime claims.

Reference marker parsing is now shared by batch modules. The trusted reference-runtime harness was extended for string-array arguments and nested JSON string results. Authored 23 shared result/edge fixtures, independent differential tests (frequency grouping, sorting, direct multiplication and interval enumeration), trace-invariant tests and desktop grouping/rewind/overflow scenarios. These tests have NOT been run this turn, including the updated native-language harness.

Per the user's revised workflow, the only executed verification was `node node_modules/typescript/bin/tsc -b`, rerun after adding the deferred tests; both invocations exited successfully. This checks TypeScript across src/server/tests, not Python/Java/Go syntax, algorithm behavior, animation/layout correctness or production bundling. No Vitest baseline/full suite, Playwright, native reference execution, production build, release audit, Docker or model integration was run. Prior validation records below do not validate the newly edited shared components.

No dependency installation, paid model call, API-key change, system configuration change, archive or upload was performed. New scenes have not been visually inspected in a browser. All four new presets and shared changes remain pending consolidated algorithm, native-language, desktop and regression acceptance after the remaining additions. See [HOT100.md](HOT100.md).

## Hot 100 Batch 1: Search And Greedy (2026-09-22)

Added five deterministic presets (35, 34, 33, 121, 55), taking the catalog from 10 to 15. All include explicit input constraints, Java/Go/Python references and semantic line mappings. The new runner is a separate module sharing the unchanged v2 recorder. Existing preset behavior, generated protocols and saved settings remain intact. Catalog counts, filters and progress now use the actual catalog size. [HOT100.md](HOT100.md) tracks batches without claiming the remaining 85 are implemented.

Search scenes show shrinking pending-element intervals, midpoints and an explicit end gap for exclusive bounds/insertion at n. Range bands animate forward-adjacent changes and cancel movement on rewind/non-adjacent seeks. Stock shows candidate profit arrows and the recorded optimal buy/sell days; a declining series produces no fake trade. Jump Game shows reachable range, legitimate frontier expansion and blocked positions, not a fabricated path. Maximum reach remains numeric even when the drawing is clipped to the final index. Long numeric tiles use a smaller font. New array scenes reuse existing rendering and snapshots rather than storing video.

Checks actually run:

- Fresh baseline `npm run check`: TypeScript and 382 tests passed.
- Post-change `npm run check`: TypeScript and 475 tests passed across 14 files. Includes 32 new shared reference fixtures, 1,000 seeded differential runs across the five algorithms using independent linear scans/pair enumeration/reachability DP, input-order/rotation rejection, boundary invariants, stable snapshots and bounded teaching references.
- `npm run test:e2e -- --grep-invert 'mobile|390px'`: 65 desktop Chromium tests passed. Existing generation/model transport remains mocked; new presets use the actual browser executor without model calls. The first run had 64 passes and one new selector failure because the accessible name contains whitespace between the category and count; corrected the test locator and reran the full suite successfully.
- `npm run test:references`: 201 cases passed across all 45 real compiled/interpreted Java, Go and Python reference implementations, including 96 new-case language executions. Used existing local JDK/Python and an existing Go binary via `GO_BIN`; installed no runtimes. These are trusted repository snippets, not model/host execution.
- `npm run build`: passed. Main JS changed from the preceding build's 447.87 kB (138.65 kB gzip) to 471.33 kB (144.71 kB gzip); no new package dependencies or media added.
- `npm run release:check`: 121 candidate source files, no rule findings; organizational/provenance authorization still required. Local screenshots are excluded from release candidates.

Desktop screenshots of boundary search, optimal stock pairing and blocked jumping were inspected. Real model/sandbox integration and Windows-native execution were not rerun for this preset-only change. No API keys were changed, no paid API was called, and no archive/upload/publication was performed. Passing fixtures and finite differential tests are not a proof for every input.

## Developer Onboarding Documentation (2026-09-22)

Reorganized README as a concise entry point and added INSTALL, USAGE and TROUBLESHOOTING guides. Updated CONTRIBUTING, corrected the generated-library persistence description, and clarified the reviewed application-root boundary for separate source packages. Removed stale "latest" test claims from README; prior dated results below remain historical. No application behavior or credentials were changed.

Fresh checks for this documentation change:

- `npm run check`: TypeScript and all 382 tests passed (13 test files). Mock model/runtime coverage is not real-provider or container acceptance.
- `npm run build`: production build passed.
- A read-only Node check of seven edited/new guide files verified 40 local Markdown links, 53 npm script references against package.json and four setup-flag examples against the actual parser; no errors. External links were not fetched and no fresh-machine installation was performed.
- `npm run setup -- --install-docker --dry-run`: printed the Colima/CLI setup plan successfully; installed nothing, started no runtime and wrote no configuration.
- `npm run release:check`: 116 candidate source files, no rule findings, known local secret/restricted-term checks enabled. Human authorization remains required; Git history was not scanned.

No paid model calls, real sandbox executions, browser regressions, Colima cold boots or Windows/WSL/Linux installations were rerun for this documentation-only change. No archive, Git initialization, commit, upload or publication was performed. Setup steps describe implemented behavior and prerequisites, not new cross-platform test evidence.

## Pre-Publication Privacy Review (2026-09-22)

Publication remains on hold pending provenance/ownership review and any required organizational authorization. No Git repository was initialized for the application, no commit/push/upload was performed, and no legal clearance is claimed. A source scan found nonpublic package-mirror metadata in the lockfile. All 266 resolved dependency entries were checked against official npm package/version metadata and matching integrity values, then only their download locations were normalized to the public npm registry. Versions, integrity strings and all other package metadata were verified unchanged. Queries sent only the reviewed public package names/versions, not source, credentials, private registry addresses or configuration. The original lockfile and private scan terms remain under ignored local audit storage.

Expanded release exclusions for recordings, archives, credentials, databases and local configuration; existing media files were preserved locally and their README embeds removed from the source release. Added `npm run release:check`: a local working-tree audit for copies of known local API credentials, credential shapes, real home paths, locally configured restricted terms, private IPs, unknown binary/symlink files and nonpublic lockfile locations. Already tracked excluded files are flagged when a Git repository exists. Reports expose rule/path/line metadata, never matched values. Git history, media content, browser storage and previous model requests are not scanned. Passing the checker never grants publication approval.

Fresh baseline `npm run check` passed 359 tests. Post-change `npm run check` passed TypeScript and 382 tests, including 23 release-audit cases with synthetic secrets, temporary directories and a temporary local Git index (no commits or remote). `npm run release:check` inspected 113 source candidates with known local credential and private-term checks enabled and reported no remaining rule findings. No application Git history exists to scan. Production build passed. No browser/sandbox/model acceptance was rerun for this source-release-only change. This is a bounded technical result, not proof of independent authorship, absence of unknown business-sensitive content, license authority or compliance with an employer's policies. See `RELEASE_CHECKLIST.md` before any publication.

## CLI-Only Container Runtime (2026-09-22)

Supersedes the Docker Desktop installer defaults recorded in older sections below. macOS setup now optionally installs Colima + Docker CLI via Homebrew, uses a dedicated `algomotion` profile, and never installs/launches Desktop. It uses `--activate=false`, `--mount none` and no SSH-agent forwarding; new profiles get bounded initial VM sizing without resetting existing sizing. Probe/build/execution share the selected context. Discovered CLI directories are included in the Colima child PATH for first-install dependency discovery without rewriting shell/global configuration. Windows missing-runtime guidance now targets WSL2 + Engine; Linux/native Windows can reuse existing accessible Linux engines. Automatic WSL/Linux system provisioning is not implemented.

Added auto/colima/external runtime selection, explicit Docker-connection precedence, Homebrew CLI discovery, `runtime:start`, and non-blocking `predev`/`prestart` warming. Daily startup never installs packages, creates a new profile, rewrites `.env` or builds images; starting a previously configured but incomplete profile may still initialize/download a VM. Existing engines/configuration are not uninstalled or silently redirected when an explicit connection fails. The API keeps its resolved CLI/prefix for cleanup consistency; restart it after a runtime change. Container restrictions and no-host-Python behavior remain unchanged.

| Check Actually Run | Result |
| --- | --- |
| Fresh baseline `npm run check` | TypeScript and 336 tests passed. |
| Final `npm run check` | TypeScript and 359 tests passed. Setup tests use MOCK installers/VM/engines, including install consent, no Desktop/global-context/system mutations, managed context routing, stopped profile startup, PATH discovery, external overrides, Windows/Linux prerequisites, errors/timeouts, dry-run/doctor/build-only, config preservation and soft-failing preset startup. Two additional mocked-process tests check scoped start/cleanup arguments, connection retention after environment changes and rejection without spawning for invalid config. |
| `npm run test:e2e -- --grep-invert 'mobile\|390px'` | 51 desktop tests passed; existing generated/model transport fixtures remain mocks. |
| `npm run setup -- --install-docker --dry-run` | Actually executed; printed Homebrew `install colima docker` and managed background-runtime plan, performed no installation or write. |
| `npm run runtime:start` and `npm run predev` | Actually executed against the existing local engine; both exited successfully by reusing it. No GUI was launched, no profile created and no package installed. This does not prove a real Colima cold boot. |
| `npm run test:sandbox` | Passed 25 real Docker executions on the existing engine, plus invalid-input rejection: fixture results/independent references, non-root/read-only/no-secret/no-socket/home/network access, actual resource configuration, infinite loop, output/trace overflow, memory limits and cleanup. No real model generation was requested. |
| `npm run build` | Production build passed. |

The initial installer test double wrongly classified `/opt/homebrew/bin/docker` as the Homebrew command; corrected matching to the executable name and reran, retaining production assertions. Reviewed upstream Colima source for `--activate=false`, named-profile context creation, `--mount none` and CLI option names, but this is not runtime acceptance. Colima was not installed on this machine (`command -v colima` found none); actual Colima installation/download/cold boot and fresh-engine image building remain unverified. Windows/WSL-native and Linux package/service setup remain unverified. No model requests, user key/configuration changes, system security changes, Desktop removal, migration of the current engine or public deployment was performed. Older Desktop integration results are historical, not evidence for Colima.

## Separate New-Problem Window (2026-09-22)

Moved problem entry, parsing, contract review and generation options into a native modal dialog. The mounted Generator still owns all form state, requests, polling and cancellation. An accepted new job closes the form and displays real progress on the main page; eventual Python/trace/evidence is shown without the setup form above it. Submission errors keep the form open; later failures remain visible on the main page and when reopening the review. A new accepted job clears the prior output rather than presenting it as the new result. Preset navigation keeps an active generation request mounted.

Closing X/return/Escape preserves in-page draft, questions, answers and confirmation, and does not abort parsing or delete jobs. Explicit cancellation still does. Settings and draft-saving temporarily replace the form without stacked dialogs; imports/saved demos open in the main workspace and library drafts open in the form. Keyboard focus starts in the editable problem text, wraps inside the dialog, and returns to the main progress heading on close. The window has a scrollable body and persistent heading/close/footer controls. Unsaved state is not promised across a page refresh.

Fresh baseline and final `npm run check` both passed TypeScript and 336 tests. Final production build passed. Desktop-only full browser regression passed 51 tests:

```sh
npm run test:e2e -- --grep-invert 'mobile|390px'
```

Six new MOCK transport browser cases cover draft/review retention, initial/wrapped/restored focus, 1280px window bounds, accepted-job auto-close and main-page phases, read-only reopening without cancellation, submission errors, later execution errors and reviewed-contract retry, close-during-parse continuation, settings round trips, explicit job deletion, replacement of stale output and preset navigation during generation. Existing preset playback, generated rewind/rerun/imports, library and settings tests also passed. Early new tests found missing initial textarea focus and Tab escape at the native dialog boundary; both were fixed in production and the assertions retained. Screenshots now wait for the actual workspace entrance animation to finish rather than capturing a partially transparent result.

Visually inspected final entry/review window, progress and result screenshots in ignored `test-results/generation-dialog-*.png` and `test-results/generation-main-*.png`. Browser interaction is real, but generated contracts/jobs/traces in these tests are explicitly mocked. No new real model request, generated-Python execution or Docker acceptance run was performed; the backend, model configuration and trace protocols were not changed. No mobile-specific acceptance was run.

## Default-First Contract Review (2026-09-22)

Changed the parsing prompt to select conventional defaults and implementation strategies, respect explicit requirements, and ask only blocking semantic questions (prefer one, at most three). Defaults stay visible/editable and require one confirmation, not an implementation questionnaire. The UI separates constraints from assumptions and genuine unanswered questions; editing still clears confirmation. Existing saved-contract/question schema limits, server ambiguity guards, presets and Docker execution are unchanged. No title-to-code branches or local question suppression were added.

Fresh baseline `npm run check` passed TypeScript and 332 tests. Final `npm run check` passed TypeScript and 336 tests. Added MOCK upstream assertions for default-selection policy, exact source forwarding, preservation of defaults and unresolved/conflicting/legacy ten-question responses, with no extra upstream calls. The existing API test also verifies unresolved/unconfirmed generation never invokes the model. Desktop-only browser tests passed 11 cases with:

```sh
npm run test:e2e -- tests/e2e/generated.spec.ts --grep-invert 'mobile|390px'
```

New MOCK UI cases cover one-confirmation defaults, editing/applying defaults, unchanged outgoing assumptions, visible necessary questions, blocked unanswered generation and confirmation reset after answering. Existing timeline/reopen/reuse/diagnostic regressions passed. The first browser run had four selector failures because the new confirmation copy also contained the substring "独立验证器"; changed the helper to the exact combobox role/name and reran all 11 successfully. No assertion was removed. Final production build passed.

Actually called the active persisted DeepSeek `deepseek-flash` configuration through the running local `/api/generate/parse` API: five sources, two explicit passes (10 paid parsing requests total), no mock fallback. The first pass returned zero questions for ordinary and explicitly specified quicksort, one question for conflicting strict-order/duplicate requirements, and rejected two malformed nested-JSON responses. Inspection also found that the first ordinary quicksort contract incorrectly returned animation snapshots with an inaccurate snapshot example. Strengthened answer/animation separation and nested JSON instructions, then reran the same five sources explicitly, not via automatic retries.

The final pass returned zero questions for ordinary quicksort, explicit descending/last-pivot/Lomuto/in-place quicksort, and ordinary obstacle-grid BFS. Quicksort returned only final sorted-array examples, not animation frames; explicit sorting choices remained present. Conflicting strict increase plus duplicate preservation produced one question and remained blocked. The missing-special-movement/cost-table source still failed contract validation (`MODEL_CONTRACT_INPUT`, missing nested object `required` declaration). This is a live model failure, not successful clarification. The four accepted contracts were reviewed for these policies; that is not proof of generated-program correctness or universal prompt compliance. Model-proposed limits/assumptions can still be imperfect.

Full key-free first/final reports are preserved under ignored `artifacts/default-contract-2026-09-22T07-41-34.013Z/report.json` and `artifacts/default-contract-2026-09-22T07-43-03.057Z/report.json`. No configuration/key was changed or exposed. No generated Python, Docker execution, new full-pipeline acceptance or mobile-specific acceptance was run for this change. Existing displayed questionnaires need explicit reparse to use the new policy.

## List-First Model Settings (2026-09-22)

The model settings dialog now opens a read-only list with provider/model/endpoint metadata and explicit use/edit/delete actions. New/edit forms mount only after a deliberate action, capture the addressed profile (including inactive profiles), and keep draft/key state separate from the list. Cancel/back/Escape discards edits with no write; successful explicit "保存并使用" saves/activates and returns to the list. Failed saves retain the draft, failed activation retains the old selection, and editing fields clears stale connection-test feedback. The backend API, disk format and actual user configuration were not changed.

Fresh baseline and post-change `npm run check` both passed TypeScript and 332 tests. Desktop-only browser acceptance passed 24 tests using:

```sh
npm run test:e2e -- tests/e2e/settings.spec.ts tests/e2e/model-profiles.spec.ts tests/e2e/app.spec.ts tests/e2e/output.spec.ts --grep-invert 'mobile|390px'
```

The profile scenario uses a real temporary-file-backed HTTP API with synthetic keys: empty/populated/reopened dialogs contain no forms or key inputs; selecting sends only ID/revision; cancelling new/inactive-profile edits does not write; a fresh API/store recovers the active selection; inactive-profile editing uses its own stored key. Injected save/activation errors preserve the appropriate state. Provider-call count remains zero in this scenario; connection-check UI tests use an explicitly mocked provider. Existing desktop preset/output regressions passed. Production build passed, and `test-results/profiles-list-1440.png` was visually inspected. No mobile-specific acceptance, real provider requests, Docker execution or actual user key/configuration mutation was performed in this turn.

## Desktop Preset Output Layout (2026-09-22)

Replaced the old lower insight card with a persistent final-output card beside the preset input editor. It reads the last successful `trace.result`/`trace.input` rather than the current frame or unexecuted input text. Moved the key algorithm explanation below reference code and folded language-compatibility notes into a secondary disclosure. Pending/invalid input retains the prior output with explicit labeling; whitespace/object-key reordering alone does not mark it stale. Generated-mode playback/evidence and all backend execution are unchanged.

Fresh baseline `npm run check`: TypeScript and 318 tests passed. Post-change `npm run check`: TypeScript and 332 tests passed, including 14 input-comparison cases. Desktop-only `npm run test:e2e -- tests/e2e/app.spec.ts tests/e2e/output.spec.ts --grep-invert 'mobile|390px'`: 21 passed, including 1280px/1440px layout and code-insight placement, folded Go compatibility notes, all ten preset sample outputs at frame zero, pending edits, invalid inputs, zero/empty/nested/impossible results, restoration, language changes and rewind. Production build passed. Inspected final 1440px screenshot with entrance animations disabled for capture, under ignored `test-results/output-desktop-*.png`.

This change was accepted for desktop only. No mobile-specific or generated-mode browser tests, model calls or Docker executions were run in this turn. Preset browser tests use the actual built-in executor; existing provider/runner unit fixtures remain mocks. The separate output card deliberately reveals the final answer immediately without changing the meaning or contents of any playback frame; reference Java/Go/Python are still not executed by the browser.

## Simplified Preset Navigation (2026-09-22)

Removed the duplicate desktop/mobile "打开预设题" buttons, their matching dialog, client request code and unused styles. Presets remain accessible via sidebar search/category selection; personal library, generated-result imports and model settings are unchanged. The legacy matching API remains for compatibility but has no UI caller.

Fresh baseline and post-change `npm run check` both passed TypeScript and 318 tests. `npm run test:e2e` passed 47 tests: the old matching-dialog test was replaced by desktop 1440px/mobile 390px checks proving the removed controls are absent (including hidden DOM), sidebar search still opens a preset without `/api/match` requests, remaining entry points are usable and there is no page overflow. Production `npm run build` passed. No model calls, sandbox execution or user configuration edits were performed; existing generated-provider fixtures remain explicitly mocked.

## Persistent Model Profiles (2026-09-22)

Model settings now default to explicit local disk saving when available. Added up to 20 named provider/account/model profiles, immediate keyless profile switching, current-profile editing, confirmed single/all deletion, retained environment fallback and non-destructive temporary overrides. Existing v1 files load without rewriting as an original profile; the next explicit disk mutation writes v2 while preserving other profiles. No API keys are returned in profile metadata, browser storage or error responses.

| Check Actually Run | Result |
| --- | --- |
| Fresh baseline `npm run check` | TypeScript and 306 tests passed. |
| Post-change `npm run check` | TypeScript and 318 tests passed. Added 12 profile storage/API tests with synthetic credentials and temporary files: restart recovery, active selection, same-provider separate keys, endpoint-bound reuse, v1 migration, temporary overrides, deletion/fallback, capacity, stale revisions/external changes, invalid files, unsafe paths and unchanged working configuration on failed writes. Provider transport remains explicitly mocked. |
| `npm run test:e2e` | 46 passed. Existing presets, library, generation and settings regressions retained. Two new 1440px/390px scenarios use a real local HTTP settings API and real temporary disk files, not mocked settings responses. Saved DeepSeek/Kimi test profiles, selected one, destroyed the API/store instance, created a fresh instance using only the file path, reloaded the page and recovered the selection. Editing and switching reused the correct saved key; deletion/cancel, endpoint changes, metadata secrecy, empty key inputs and browser-storage exclusion passed. |
| Provider calls | Zero new real provider calls. New profile-management browser tests forbid provider/Python calls and assert the count remains zero. Existing connection tests still require explicit consent and use mock transport. |
| Actual user configuration | Before editing, the current service reported `source=disk, configured=true, loadError=false`; no session-preservation write was needed. After watcher reloads, the live metadata endpoint reported one saved profile, a matching active profile, `hasKey=true`, `source=disk`, `configured=true`, `loadError=false`. No key was fetched, printed, changed or moved by the tests. This confirms configuration loading, not vendor acceptance/key validity. |
| `npm run build` | Production build passed. |
| Visual inspection | Inspected the real settings-API mobile profile screenshot; desktop/mobile tests enforce no page/dialog horizontal overflow. Screenshots use synthetic credentials and live under ignored `test-results/profiles-*.png`. |

The first new browser test used an exact label locator for a select whose label text included its option contents. Changed the test to its actual accessible combobox role/name, then reran successfully; no production assertion was removed. Testing used isolated temporary directories and API ports, never the user's configuration file. No sandbox execution changes or repeated real-generation/sandbox acceptance claims are made. Windows-native ACL/restart behavior, OS-vault encryption, new provider integration and vendor key lifetime remain unverified/out of scope. Persisted keys are plaintext with POSIX permissions, not encrypted; the API is still a shared local service, not a public multi-user credentials system.

## Local Problem Library (2026-09-22)

Added a separate browser-local personal library without changing preset catalogs, model settings, backend execution or trace versions. Users can save plain-text drafts and complete generated/imported demos, choose multiple built-in/custom categories, search/filter, rename/reclassify, update or copy, confirm deletion, export portable entries and confirm imports. Existing single-slot storage is neither migrated nor deleted automatically. Imported/library evidence stays unverified until explicitly rerun.

| Check Actually Run | Result |
| --- | --- |
| Fresh baseline `npm run check` | TypeScript and 283 tests passed. |
| Post-change `npm run check` | TypeScript and 306 tests passed, including 23 new library tests for metadata, version compatibility, strict content validation, UTF-8 limits, capacity, filtering and safe error messages. Embedded demo data uses explicitly labeled MOCK fixtures. |
| `npm run test:e2e` | 44 passed, including six new library scenarios. Real browser IndexedDB persisted drafts/demos across reloads. Tested multi-category/custom classification, edits, copies, deletion/cancellation, import/export metadata, original executed input preservation, v2 rewind and preset isolation at desktop 1440px/mobile 390px. |
| Concurrency and failure tests | Actual concurrent IndexedDB transactions and two independent tabs preserved distinct writes and rejected stale updates/deletes. A fault-injected `QuotaExceededError` during payload write rolled back the already queued index update and preserved the old entry. This is not a claim of physically exhausting the browser's disk quota. Unavailable IndexedDB, malformed imports and markup-as-text were checked. |
| Reopened execution | Confirmed no POST/model/execution request on save/open/export/import. An explicit changed-input rerun submitted the exact saved program through the existing jobs API, using MOCK execution transport; no new model request. Legacy single-slot JSON remained intact. |
| `npm run build` | Production build passed. |
| Visual inspection | Inspected actual desktop library and mobile save-form screenshots under Git-ignored `test-results/library-*.png`; no horizontal page/dialog overflow at the tested sizes. |

The first mobile test failed because its helper used Playwright visibility for a translated off-screen sidebar; fixed the helper to open the mobile menu based on its actual open state, then reran the full passing suite. No production assertions were removed. No real provider calls or sandbox execution tests were needed or repeated in this frontend-only change; prior live results below are historical. Native Windows, Safari/Firefox, cloud synchronization and actual disk exhaustion remain unverified/out of scope. Test storage runs on isolated test ports, not the user's active browser library. Library storage is per browser origin, bounded to 100 entries / 32 MiB and subject to browser quota/eviction; exported entries are the manual backup path.

## Presentation And Diagnostic Fixes (2026-09-22)

Fixed the three issues identified by the preceding real-model run without changing preset behavior, moving source or adding renderers:

- SceneSpec title/description/panel-title text is no longer used in the main canvas or graph accessibility labels. Trusted panel headings and current-frame size/count summaries replace it. The original JSON is mounted only after explicitly opening a static/spoiler inspector, which resets when input/program changes. This fixes old sample answers/dimensions/directions presented as current state, without pretending that generated runtime explanations are infallible.
- New and reused designs are validated against all frames of current input, model sample executions and applicable independent boundary executions before completion. The model receives observed maximum sizes; evidence identifies finite coverage. Bad plans are rejected with case/panel/frame/capacity diagnostics and a readable raw bundle; the graph cap remains 48, not raised or bypassed.
- Added safe stage-specific model codes and field diagnostics for nested JSON, required declarations, sample validation, Python types/extra fields/UTF-8 size, SceneSpec, HTTP/envelope/content, truncation, refusal, cancellation, timeout and transport failures. Unknown names/values and raw provider/exception content remain hidden. No automatic retry or coercion was added.

| Check Actually Run | Result |
| --- | --- |
| Fresh `npm run check` baseline | TypeScript and 259 tests passed. |
| Post-change `npm run check` | TypeScript and 283 tests passed, including 17 dedicated diagnostic tests and cross-input capacity/corpus tests. Provider/runner tests are explicitly mocked. |
| `npm run test:e2e` | 38 tests passed. Includes archived-answer/title isolation, current dimensions after input change, opt-in notes/reset, rewind, save/reopen, desktop 1440px/mobile 390px and visible parse error code/path. Generated transport in this suite is mocked. |
| `npm run test:sandbox` | 25 real Docker executions passed again, plus invalid-input rejection. Includes actual non-root/read-only/network/resource configuration, overflow/timeout/memory/cancellation cleanup. These are hand-authored test programs, not new model generation. |
| Recorded real-program regression | `tests/live-presentation-regression.ts` passed through the running API and real Docker with no mocks. Three application reruns (including their sample/boundary checks): old BFS at changed 3x3 and single-cell inputs, plus old DP at its small 2x2 input. The old BFS description never appears as current state; mobile and rewind pass. The old DP plan is now rejected **at the small current input**, because independent boundary 6 has 144 nodes while its graph permits 48. Raw current-input results remain valid and playable. Zero model calls and no page errors. |
| `npm run build` | Passed. |
| `ALGOMOTION_LIVE_ACCEPT=1 npm run test:live` | Actually attempted; exit 2, `NOT RUN: model=false, sandbox=true`. A separate current API status check also returned model=false. No mock fallback or new paid model calls. |

Real regression report and inspected desktop/mobile screenshots are under Git-ignored `artifacts/presentation-fixes-2026-09-22T06-18-15-117Z/`. It reuses previously recorded real-model programs; it is not a new successful model-generation claim. Reproduce with:

```sh
npx tsx tests/live-presentation-regression.ts <recorded-bfs-bundle.json> <recorded-dp-graph-bundle.json>
```

Backend edits triggered the development watcher restart; session-only credentials intentionally expired. The user was warned, and no key was extracted or persisted to avoid this. Re-save in the UI for a new real-provider design test. These fixes do not prove improved model protocol success rate, perfect runtime instrumentation, all possible contract inputs, native Windows operation or public multi-tenant security. Problems without an independent verifier have only current/model-sample layout coverage. The temporary validation corpus is bounded and not exported; old v1/v2 bundles remain readable.

## Real AI Presentation Retest (2026-09-22, Config Restored)

The user re-saved their session API settings. This supersedes the immediately preceding implementation round's `model=false` limitation, but not its recorded historical result. See [the complete live presentation report](LIVE-PRESENTATION-2026-09-22.md).

Actually made **20 real DeepSeek `deepseek-flash` calls**, with no provider/runner mocks, key extraction/persistence or backend restart. BFS, grid minimum path sum and a non-preset monotonic-stack temperature task each produced real Python, real Docker traces and at least one valid SceneSpec. Contract review, independent example checks and explicit generation/design/repair retries were necessary; this is not reliable one-shot acceptance.

Fresh/post-test TypeScript and 259 unit/API tests passed, as did the production build. Five additional real-Docker audits ran 55 inputs against independent references: all numerical/path results passed, 25 invalid-input attempts were rejected. Binding checks were 43 passed, 1 failed, 11 not run (repaired DP has no accepted AI design). Real browser reruns tested changed inputs, exact frame/sequence/stack state, source lines, rewind, mobile, save/reopen/export, unchanged Python/design and zero new model calls.

**Outstanding failures:** AI prose can hardcode the original input/answer and remain stale at frame zero after input changes; original DP's graph plan fails on a valid 12x12 grid because of its 48-node limit; parse/Python/SceneSpec protocol failures remain frequent and some diagnostics too coarse. Manual source review also found stack snapshot timing and duplicate DP reconstruction missed by finite checks. Explicit model repairs corrected those source problems; repaired DP's final design failed validation and remains a raw diagnostic bundle. The valid-large-input failure correctly surfaces `PRESENTATION_BINDING` and preserves usable raw state rather than showing a false successful design.

All failures and earlier attempts are retained under Git-ignored `artifacts/live-ui-20260922-134433*/`. No universal algorithm, natural-language label correctness, native Windows, additional-provider or public multi-tenant security claim is made. Full mock browser/adversarial sandbox tests were not repeated in this live-only round; their prior results remain below.

## AI-Designed Presentation And Trace Repairs (2026-09-22)

New implementation: a real-model SceneSpec request after Python execution/checking, trusted declarative React/SVG panels, bundle v2 with v1 compatibility, same-source/same-design input reruns, explicit paid repair/redesign actions, stricter SDK prompts, safe field-level diagnostics and separate finite teaching checks. No arbitrary generated HTML/JavaScript is executed. Existing source stays under `outputs/algomotion/`.

| Check actually run | Result |
| --- | --- |
| Fresh baseline `npm run check` before this change | TypeScript and 229 tests passed. |
| Post-change `npm run check` | TypeScript and 259 unit/API tests passed. New tests cover SceneSpec injection/unsafe bindings/empty arrays, full-trace type checks, v1/v2 compatibility, hidden future results, graphs, teaching regressions, explicit repair, no-model reruns, failed-design diagnostics and request counts. Model and runner substitutes are explicitly MOCKED. |
| `npm run test:e2e` | 35 Playwright tests passed. Includes AI-layout desktop 1440px/mobile 390px, raw-view switching, seek/rewind, v2 save/reopen, graph/stack/bars, reduced motion and explicit paid-action routing. Generated/model transport in these tests is MOCKED. Preset regression coverage retained. |
| `npm run build` | Production build passed. |
| `npm run test:sandbox` | 25 REAL Docker executions passed, plus invalid-input rejection. Hand-authored BFS/DP programs passed independent references and teaching checks including 12x12. Also tested loop/timeout, memory/output/event limits, cancellation, forbidden network, non-root/read-only/secret-free filesystem and actual container resource configuration. Owned containers were cleaned. This is not real model generation or a public multi-tenant security proof. |
| `ALGOMOTION_LIVE_ACCEPT=1 npm run test:live` | Actually attempted. Exit 2: `NOT RUN: model=false, sandbox=true`. No provider calls and no fixture fallback. |
| Existing API `GET /api/generate/status` | Independently confirmed `model:false`, `sandbox.available:true`; not just a separate CLI missing another process's key. |
| Visual inspection | Inspected mock desktop/mobile screenshots, including candidate arrows, current-path/queue panels and responsive light layout. |

Initial post-edit failures were fixed rather than bypassed: a TS tuple inference error, and two old HTTP mocks lacking partial paths/complete DP state. Those fixtures now model the stricter contract; production limits were not raised and runtime snapshots are never synthesized by the host. Non-adjacent bar seeking was made immediate to avoid transient obsolete values. Invalid old presentation bindings are stripped from failed-rerun diagnostic bundles so they remain openable.

**Real model limitation:** backend edits caused the development watcher to restart; session-only UI credentials intentionally do not survive that restart. The user was notified, and no key was retrieved, logged or persisted. The new prompt/repair pipeline and AI layout generation have **not** been validated against real DeepSeek/Kimi/OpenAI calls in this change. Prior eight-call DeepSeek results below are historical and do not prove this implementation's live success. Re-save the model settings in the UI to resume integration. Native Windows, other providers and public multi-tenant isolation remain unverified.

## First Real DeepSeek Run (2026-09-22, User-Configured API)

See [the full live acceptance report](LIVE-2026-09-22.md). This supersedes historical "no real model calls" statements below for the tested DeepSeek model only. Eight real requests were made through the user's existing local API using its session-only `deepseek-flash` configuration. No keys were retrieved, logged, persisted or passed to Docker, and the service was not restarted.

Both BFS and DP produced real generated programs with independently correct small-input results; changed-input browser executions, playback/rewind/timeline, mobile, save/reopen/export were tested without mocking and without new model calls. Additional boundary checks: 21/22 passed, with 10 malformed inputs rejected before execution. The 12x12 BFS case exceeded the trace dependency limit. Visual audits found missing BFS obstacle markers and incomplete/stale DP teaching state. Earlier attempts also failed contract/trace validation. **This is real but partial acceptance, not reliable one-shot generation or fully passed visual semantics.** Original failures and successful bundles were archived in Git-ignored `artifacts/live-2026-09-22/`.

Fresh baseline and post-test TypeScript/229 unit/API tests passed. The complete adversarial sandbox suite and the 31-test mocked/regression browser suite were not rerun in this turn; new live browser tests were run separately against the existing server. Windows, other providers and public multi-tenant security remain unverified.

## UI Model Settings And Light Workspace (2026-09-22)

Implementation stays in `outputs/algomotion/`, preserves preset executors/three-language references and Docker-only generated execution. New UI settings support DeepSeek, Kimi/Moonshot, OpenAI and custom Chat Completions endpoints; save is free, connection test is explicit opt-in. The light blue/white theme retains causal animation and adds a responsive settings dialog.

| Check actually run | Result |
| --- | --- |
| Fresh pre-change `npm run check` | TypeScript and all 200 existing tests passed. |
| Post-change `npm run check` | TypeScript and 229 unit/API tests passed, including 29 model-settings tests. |
| `npm run test:e2e` | 31 browser tests passed, including provider save/test/reset, secret-free browser storage, preservation of playback/input, custom compatibility options and 390px mobile layout. New provider transport is explicitly MOCKED. |
| `npm run build` | Production build passed. |
| `npm run test:sandbox` | All 23 real Docker executions passed again, including independent reference fixtures, resource/output rejection, network denial, actual container configuration inspection and cleanup. These use hand-authored fixture programs, not real model-generated solutions. |
| `ALGOMOTION_LIVE_ACCEPT=0 npm run test:live` | Actually attempted; exit 2 with `NOT RUN: model=false, sandbox=true`. No real API calls, no fixture fallback. CLI now supports explicitly persisted UI config as well as environment config; another server's session-only settings are not shared across processes. |
| Security/storage checks | Real local HTTP requests exercised nonce enforcement, cross-site/Host restrictions, JSON/body bounds, no-key reads, hot config updates and running-job snapshots. Temporary-file tests exercised explicit persistence, reload, deletion, permissions and invalid/symlink-file rejection. No workspace keys were changed. |
| Visual inspection | Inspected desktop workspace/settings and mobile settings; generated BFS/DP/browser regressions passed with mock transport. |

Two first-run test issues were corrected before the passing runs: Node fetch replaces a custom Host header, so the DNS-rebinding test now uses `node:http`; select lookup now uses its actual accessible combobox name. No security assertion was removed to obtain a pass.

**Unverified:** paid DeepSeek/Kimi/OpenAI/custom-provider calls, real model-generated acceptance, native Windows runtime/ACL behavior, and public multi-tenant security. A successful JSON connection check is explicitly not proof of full generation or algorithm correctness. Optional disk settings are plaintext, not OS-vault encrypted; current API is local/shared-instance only.

## Real Docker Acceptance (2026-09-22, After User Installation)

The user completed local installation. This section supersedes earlier Docker-unavailable notes for the current machine; older entries below are historical records, not present-tense claims. Environment: macOS Apple Silicon, system Node.js 26.9.0, Docker client/server 29.8.0, Linux container engine.

| Check actually run | Result |
| --- | --- |
| `npm run doctor` | Node/dependencies, Docker Linux engine and runner image ready. Exit 2 only because `LLM_API_KEY` and `LLM_MODEL` are missing. |
| `npm run check` | TypeScript and 200 unit/API tests passed. |
| `npm run test:sandbox` | Passed once with the original suite and again after strengthening assertions; the final run executed 23 real Docker containers plus invalid-input rejection. No host Python fallback. |
| Independent references | Real hand-authored BFS shortest-path and grid minimum-path-sum Python each passed its sample and five independent boundary fixtures. These are not model-generated solutions. |
| Runtime isolation checks | Non-root UID, read-only root filesystem, external socket connection refused, no model key, no host home or Docker socket. |
| Actual container configuration | Inspected each created container's user, no-network mode, read-only root, 128 MiB memory/swap ceiling, 0.5 CPU, 32 PIDs, capabilities, no-new-privileges, tmpfs options, absent host binds and disabled Docker logs. Configuration inspection is not an exhaustive kernel-isolation proof. |
| Rejection and cleanup | Infinite loop, stdout/stderr/raw output overload, trace event/byte overload, syntax error, invalid references, memory overload and cancellation rejected with expected error categories. Not merely “any error counts as success.” |
| Container cleanup | No owned test containers remained after the final suite; no unrelated container was stopped or removed. |
| `npm run build` | Passed on the newly installed Node runtime. |
| `npm run test:e2e` | All 28 browser tests passed. Generated UI tests still use explicitly labeled mocked transport. |

No real model API requests were made and no API key was read out, requested in chat or modified. Next step: configure the actual provider/model and local key, explicitly opt into paid calls using `ALGOMOTION_LIVE_ACCEPT=1`, then run `npm run test:live`. Real generated-code correctness, real-model-to-browser end-to-end acceptance, native Windows execution and public multi-tenant security remain unverified. Ordinary Docker hardening is still not a public multi-tenant isolation guarantee.

## Command-Based Setup (2026-09-22)

Added pure-Node `setup`, opt-in Docker Desktop installation, `doctor`, `--presets`, `--dry-run`, and Docker executable discovery for fresh installs. The installer uses Homebrew's verified `docker-desktop` cask or WinGet's `Docker.DockerDesktop` package; it does not silently execute remote installation scripts or bypass OS approvals. Linux uses an already configured Engine, not automatic distro/security configuration.

| Check actually run in this turn | Result |
| --- | --- |
| Pre-edit `npm run check` | TypeScript and all 169 existing tests passed. |
| Post-edit `npm run check` | TypeScript and 200 tests passed, including 31 new setup/config/discovery tests. |
| `npm run build` | Passed. |
| `npm run test:e2e` | All 28 existing browser tests passed on fresh test ports. |
| `npm run setup -- --install-docker --dry-run` | Passed; printed intended commands only, no install/start/config write. |
| `npm run doctor` | Exit 2, correctly reported Docker/image/model configuration missing. Read-only, no model request. |
| `npm run doctor -- --presets` | Exit 0, existing Node/project dependencies found; did not inspect Docker. |
| Existing `.env` preservation | Actual temporary-file test preserved existing contents byte-for-byte. No workspace `.env` was created/overwritten by testing. |

**Not executed:** actual Homebrew/WinGet installation, fresh-machine Docker first run, native Windows setup, real container execution or paid model generation. Installer success/failure, reboot-required behavior, startup timeout and platform command selection were MOCKED in unit tests. No Docker/system package installation, privilege/security-policy changes or unknown-process termination was performed on this machine. Setup success/doctor presence checks do not constitute sandbox or algorithm correctness acceptance.

## Current Open-Generation Change (2026-09-21)

This section records tests actually rerun for this implementation, not inherited results below. Work stayed in `outputs/algomotion/`; no applicable AGENTS.md or Git worktree was present. Existing source was extended in place.

Environment: macOS Apple Silicon, bundled Node.js 24.19.0, Chromium/Playwright. The shell did not provide npm; npm 10.9.4 was downloaded to the outer `work/` directory and invoked with the existing Node runtime. No system runtime/security configuration was changed.

| Current check | Actual result |
| --- | --- |
| Before edits: TypeScript | Passed. |
| Before edits: Vitest | 137/137 passed in this turn. |
| Before edits: Playwright | 23/23 passed in this turn. |
| After implementation: `npm run check` | TypeScript passed; 169/169 tests passed, including 32 new generation/model/runner/schema/reference/API tests. |
| After implementation: `npm run build` | Passed. |
| Production `npm start` smoke | Passed on temporary port 3017: preset returned `[0,1]`, generated mode clearly reported missing model/Docker, no page errors. |
| After implementation: `npm run test:e2e` | 28/28 passed. Fresh isolated API/Vite instances on 3013/5183 prevent testing a stale dev server. |
| New browser checks | Both unseen acceptance task flows with explicitly mocked model/runner transport; confirmation, actual phase payloads, queues/dependencies/path, rewind/seek, input rerun without additional model request, save/reopen, untrusted imports, mobile and missing dependencies. |
| New visual inspection | Inspected generated DP dependency and BFS path snapshots at desktop and 390px mobile, using clearly labeled MOCK fixtures. Fixed an SVG DP-badge animation transform that initially overlaid cell values. |
| `npm run test:sandbox` | Attempted; exited 2 with `NOT RUN`: Docker/image unavailable. No generated Python executed on the host. |
| `npm run test:live` | Attempted; exited 2 with `NOT RUN`: model configuration and Docker unavailable. Zero real model calls. |

### What Is Not Verified

- No real model-generated program has yet passed this machine's Docker chain. Both acceptance tasks are implemented in an opt-in real integration script, but the successful pipeline/unit/browser runs here use explicitly labeled mocks. This is not live acceptance success.
- Actual network denial, container UID/read-only mounts, CPU/memory/PID limits, infinite-loop termination and overload cleanup have NOT been exercised on a real daemon here. Command construction/fail-closed cleanup are mocked unit-tested; `test:sandbox` contains executable real-Docker adversarial tests.
- The trusted Python runner and fixture programs have not been executed outside Docker as a workaround. No AST/subprocess check is represented as sandbox safety.
- No native Windows run, real provider protocol compatibility test, paid API evaluation, public deployment or multi-tenant security audit. CI definitions are supplied, not evidence that remote CI ran.
- No universal algorithm-correctness claim. Other open tasks have model samples only unless an applicable independent checker is selected. A contract itself can misunderstand the user's problem.

### Reproduce New Checks

Run from `outputs/algomotion/` with Node.js 22.12+:

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm run sandbox:build
npm run test:sandbox
```

For real generation, supply `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` and explicit `ALGOMOTION_LIVE_ACCEPT=1` in `.env`, start Docker Desktop, then `npm run test:live`. This makes paid API calls; failure is not automatically retried or replaced with fixtures. See [GENERATION.md](GENERATION.md) for limits and acceptance semantics.

## Historical Preset Validation (Before This Change)

The following record is retained for context. It is not a claim that its native-language/fresh-install checks were repeated in the current change.

Date: 2026-09-21 (earlier preset implementation).

## Executed locally

Environment: macOS, Apple Silicon, Node.js 24.19.0. Browser automation: Playwright Chromium. Multilingual reference code was additionally compiled/interpreted with Java 8, Go 1.27.1 and Python 3.14.

| Check | Result |
| --- | --- |
| Fresh directory `npm install` | Passed, no existing project dependencies reused. |
| Lockfile-based `npm ci` | Passed in the clean install directory. |
| npm dependency audit during clean installation | 0 reported vulnerabilities at this time; not a security guarantee. |
| TypeScript strict check | Passed. |
| Vitest | 137 tests passed: 61 engine tests, 23 matching/API tests, 12 multilingual reference-contract tests and 41 teaching/motion-state tests. |
| Seeded differential scenarios | 800 comparisons against independent references, included in the engine suite. |
| Playwright | 23 tests passed; sample frame traversal, all language highlights and persistence, player/input/import/search/mobile interactions, actual swap keyframes, seek cancellation, dependency arrows, best water geometry, retired edges and reduced-motion behavior. |
| Native reference implementations | All 30 implementations passed: 35 sample/edge fixtures in each of Java, Go and Python (105 executions in total). Compilers are test-only, not app dependencies. |
| `npm run build` | Passed in both working and clean installation directories. |
| `npm start` smoke check | Passed on temporary port 3002: served production assets, local import worked, final Two Sum result was `[0,1]`, no browser console/page errors. |
| Visual inspection | Desktop at 1440px and mobile at 390px; inspected LIS comparison/transfer/chain states, water geometry, staircase labels, tree/list scenes, sticky playback controls and code highlighting. A browser-recorded demonstration is included as `motion-preview.webm`. |

## Not executed

- No real paid LLM API request: no user API key was supplied. Success, malformed output, refusal, truncation, unsupported problem, network errors and oversized responses were tested with mocked upstream responses.
- No native Windows run. Cross-platform commands, portable dependencies and a Windows/macOS/Linux CI matrix are included; actual remote results require publishing the repository and running Actions.
- No public deployment, authentication system, distributed rate limiter or cost-budget enforcement.
- No coverage claim for every input in the original online judge constraints; visualization input sizes are intentionally limited.

## Reproduce

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:references
```

The last command is optional for ordinary app development and requires Java 8+, Go 1.21+ and Python 3.10+. The reference-code CI job installs these separately. Trace exports now use version 2 semantic locations instead of version 1 JavaScript line numbers; this is documented in `TRACE.md`.

The API and UI are intentionally usable without `.env`. Add model configuration separately and test your provider's protocol compatibility before relying on AI matching.
