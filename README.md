# OPERA — lightweight terminal tutor

OPERA is a learning workspace built on Pi. Study your own files, ask for explanations, practise one question at a time, save focused notes, and return to a checkpoint later.

OPERA stands for **Orient → Predict → Explain → Apply → Retrieve**. The tutor uses these flexibly, without forcing a diagnostic or quiz before answering a direct question.

## Quick start

1. Install Node.js **22.19.0 or newer** and Git if you want to clone the repository.
2. Clone this repository with GitHub's **Code → HTTPS** URL, or choose **Code → Download ZIP** and extract it.
3. Open a terminal in the folder containing package.json and opera.mjs:

~~~powershell
node --version
npm ci
npm start
~~~

4. Inside Pi, use **/login** to configure a supported model provider and **/model** to choose a model. Provider accounts and usage limits are separate from OPERA; this project supplies no credentials.
5. Enter **/learn a topic you want to understand**, or use **/opera → Select source** to study a file, folder, or public HTTPS page.

**[Read the detailed usage guide](GUIDE.md)** for a complete first session, examples, source formats, browser activities, notes, backups, updates, and troubleshooting.

## Commands

| Command | What it does |
|---|---|
| /learn [topic] | Start a topic; without a topic, resume active work or choose a source |
| /review | Practise one weak or due target grounded in captured answers |
| /opera | Open the menu for sources, style, progress, notes, checkpoints, visuals, and practice interface |

Say “explain directly,” “quiz me,” “hint,” “show the answer,” “draw this,” “save a note,” “save a checkpoint,” “next,” or “pause.” OPERA pauses after feedback until you ask to continue.

## Bring your material

~~~powershell
npm start -- "C:\Users\you\Documents\Sources"
npm start -- --resume
~~~

A quoted file/folder argument registers a source. Select it inside OPERA to study it. Remaining flags are passed to Pi; --resume concerns Pi conversation history. OPERA checkpoints are separate.

Sources include text/code, Markdown, CSV/JSON/YAML, notebooks, supported images, and text PDFs with optional pdftotext. Public HTTPS pages must return accessible HTML, text, or JSON. Download a PDF URL first and register the local file. Scans, videos, sign-in pages, and JavaScript-only pages need an accessible export or transcript.

## Your learning data

| Location | Contents |
|---|---|
| .opera/ | Local learning state, registered source paths, attempts, preferences, checkpoints, and state backups |
| Learning/Notes/ | Notes you ask OPERA to save |
| Learning/Visuals/ | Offline HTML, SVG, and Markdown/Mermaid diagrams |
| Learning/Progress.md | Progress snapshot refreshed through /opera → Progress |
| Learning/Audio/ | Recordings explicitly saved with an audio activity |
| Pi-managed storage | Provider configuration and conversation history |

.opera/, Learning/, node_modules/, .env files, and local backup files are excluded from Git. Source files remain at their original locations. Selected excerpts and written responses can be sent to your configured model provider. OPERA's source reader bounds reads to registered sources; Pi remains a coding-agent runtime with its own tools and permissions.

## Development

~~~powershell
npm ci
npm run check
npm test
~~~

Browser tests use an installed Chromium-family browser and may skip when none is found. Set OPERA_BROWSER to its executable path if needed. See [VALIDATION.md](VALIDATION.md) for previous verification results and limitations; those results are not a fresh verification of your installation.

## Updating an existing installation

Download or clone the new application into a **separate folder**, close OPERA, and run the updater from the new folder:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Update-Opera.ps1" -Target "C:\path\to\existing\opera-terminal"
~~~

The updater validates application checksums, backs up affected application files beside the target, and preserves learner folders, dependencies, and unrelated files. Keep private backups private. Never replace an old installation with a clean distribution and assume your learning data will follow. Run npm ci if dependencies are missing or the lockfile changed, then restart OPERA.

This is version **1.2.0**, the lightweight tutor. Historical game records in existing installations remain archives; the current application has no game launcher, XP, combat, or mastery percentages.
