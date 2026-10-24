# OPERA lean refactor ? verification

Verified on Windows with Node.js v24.22.1 and the existing pinned Pi 1.4.0 installation.

## Results

- Baseline: 95 tests passed; TypeScript check passed.
- Updated: 84 tests passed, zero failed/skipped; npm run check passed. Removed tests covered removed games and the decorative 3D overlay; new tests cover the simplified workflow.
- Real Pi extension loader registers exactly /learn, /review and /opera, plus the five retained tools.
- Real Pi project-resource loaders discover AGENTS.md and one supporting learning-system skill.
- /opera source selection, source-driven /learn, checkpoint save/resume, natural-request tool paths, pending submitted answers, hints, answer exposure, style changes, feedback pause and issue updates use simulated learner records.
- Reviews select actual weak/due evidence. Legacy version-1 state, unknown fields, independent evidence and checkpoints survive; invalid state is not reset. No schema migration was needed.
- Startup does not modify state/progress or create a Markdown transcript, even with legacy logging=true. Existing logs and notes remain unchanged.
- Model-context filtering keeps one fresh state summary and removes older OPERA hidden core/state snapshots from model input, without changing Pi session history or other plugins' messages.
- Notes and HTML/SVG/Markdown concept visuals still save. Existing headless Chromium tests exercise browser choice/recall, prediction, tasks, audio fallbacks/consent and the evidence dashboard.
- Windows picker PowerShell scripts parse successfully; picker outcomes are injected in tests. PDF extraction invocation/fallback behavior is tested with simulated extractor processes.
- Launcher help retains the existing entrypoint and passthrough design and now lists three commands.
- Windows updater tested twice against a simulated old installation with spaces in its path. It removed 73 obsolete application files and preserved six sentinel files: learner state, personal note, archived game record, provider-settings sentinel, custom skill and dependency-folder sentinel. Updated launcher help worked.
- SHA-256 comparison of all 53 pre-existing files under .opera and Learning found zero changes. Existing real state also passes read-only validation. The private backup sits beside the project; it is not included in the distribution.
- Active game modules/assets/tests, offline world renderer/examples, role machinery, redundant skills and full-session logger are absent. Core dependencies are still used by retained functionality; no direct dependency was game-only and no new dependency was added.

## Instruction payload measurement

Same conditions: fresh state, balanced style, terminal practice, no topic/source/attempts. UTF-8 byte counts:

| OPERA payload | Before | After |
|---|---:|---:|
| Project AGENTS.md | 7,666 | 4,910 |
| Hidden runtime state/instruction message | 9,688 | 153 |
| Combined measured payload | 17,354 | 5,063 |

The old runtime message included the 6,304-byte shared teaching core plus repeated runtime teaching rules. The updated message contains state only; AGENTS.md is the sole teaching contract. The context hook replaces older OPERA snapshots in model input with one current summary.

This measures those two OPERA payloads, not total model usage. Pi's base prompt, tool schemas, skill catalog, loaded references, history and provider tokenization are excluded. No token-saving percentage or live usage claim is made. Non-empty state changes the summary size; historical attempts are bounded to the active topic and last three records.

## Scope and limitations

No live provider/model teaching session was run, so natural-language routing and teaching quality were not end-to-end validated with a model. Native dialogs were not manually clicked, and default-desktop browser opening was not manually verified. Browser tests were headless; microphone input was simulated. No real learner achievements were generated. Actual external HTTPS sites, installed PDF binaries and fresh npm installation were not tested in this refactor.

The original launcher file remains at its existing path; no global wrapper was recreated or modified. An independently configured global launcher was not located or manually invoked.

## Delivery and update

The project is updated in place. Restart OPERA. Dependencies are unchanged; no installation is needed for this existing installation. Fresh installs use npm ci.

OPERA_Lean_1.2.0.zip contains only application code, teaching references, examples, checks and documentation. It excludes .opera, Learning, node_modules, credentials, private backups and Pi session history.

For another installation, extract separately, close OPERA and run Update-Opera.ps1 -Target with the existing project path. Affected application files are backed up first. Learner/configuration trees and unrelated files are preserved. See README.md for the exact Windows command.
