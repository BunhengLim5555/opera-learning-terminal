# OPERA usage guide

This guide covers OPERA 1.2.0, the lightweight terminal tutor. Commands shown in PowerShell blocks go in your system terminal. Commands beginning with /learn, /review, /opera, /login, or /model go inside the running Pi interface.

## 1. Install and launch

### Requirements

- Node.js **22.19.0 or newer**, including npm. The launcher checks this minimum.
- A terminal with an interactive display.
- Access to a model provider supported by the bundled Pi runtime. OPERA includes no provider key, account, or usage allowance.
- Internet access for dependency installation and your model provider. HTTPS source reading also needs internet access. Saved notes and diagrams can be opened offline.
- Optional: Git for cloning, Obsidian for reading notes, a browser for HTML activities, and pdftotext for PDF extraction.

Windows has native file/folder pickers. Terminal browsing is the fallback when native selection is unavailable. The launcher contains macOS/Linux opening paths too; this guide's examples and the project's recorded verification focus on Windows.

### Download

On the repository page choose **Code → Download ZIP**, extract the archive, and open the folder containing package.json. Alternatively, copy **Code → HTTPS**, run git clone with that URL, and enter the cloned folder.

In PowerShell, use quotes for paths containing spaces:

~~~powershell
Set-Location "C:\path\to\opera-learning-terminal"
node --version
npm --version
npm ci
npm start
~~~

npm ci installs exactly the dependency versions in package-lock.json. Run it for a fresh download. Normal launches only need npm start.

If PowerShell blocks npm.ps1, use the Windows command wrapper:

~~~powershell
npm.cmd ci
npm.cmd start
~~~

### Connect a model

Inside Pi:

~~~text
/login
/model
~~~

Follow Pi's provider login flow and select an available model. OPERA uses Pi's provider configuration; do not put API keys in source files, notes, screenshots, or Git commits. Provider requirements, subscription coverage, and charges depend on your chosen provider. Use that provider's current account information.

When startup succeeds, OPERA displays its ready message and the three learning commands. Enter /opera to open the home menu.

## 2. Your first session

Try a small topic first:

~~~text
/learn Python lists and tuples
Explain when I should use each, with one concrete example.
quiz me
~~~

Answer the actual question. Include your reasoning when asked. After the feedback, OPERA waits. Continue with:

~~~text
next
~~~

You can ask for help or change direction:

~~~text
Give me a small hint.
Show the full answer and explain why it works.
Explain directly without quizzing me for now.
Use a simpler example.
Pause.
~~~

Hints, recently taught answers, and exposed solutions are recorded as assistance where applicable. Asking for help is allowed; assisted work should not be presented as independent recall. Skips, cancellations, and technical failures do not count as wrong answers.

At the end:

~~~text
Save a note about the difference between lists and tuples.
Save a checkpoint so we can continue this exact objective later.
~~~

## 3. Study your own sources

### Select a file or folder

1. Enter /opera.
2. Choose **Select source**.
3. Choose a file, folder, public HTTPS link, typed path, or saved source.
4. If you selected a folder, choose one relevant file. Use filename filtering for a large folder.
5. Tell OPERA the section or question you care about.

Example requests:

~~~text
Use this chapter. Explain the mechanism behind TCP retransmission.
Focus on the section about derivatives. Define each symbol before using it.
Compare the two approaches in this file and cite the relevant lines.
~~~

Selecting a folder does not copy it into the project. OPERA keeps a source registration and reads relevant excerpts. Selecting several files saves them as sources; choose one to start studying.

You may also register a source while launching:

~~~powershell
npm start -- "C:\Users\you\Documents\Sources"
npm start -- "C:\Users\you\Documents\Sources\chapter.md"
~~~

Choose the registered source from /opera inside Pi. Outputs still go in the OPERA installation's Learning folder, not in the selected source folder.

### Supported material and limits

| Material | How to use it |
|---|---|
| Markdown/plain text, code, CSV/TSV, JSON/YAML/XML, HTML/CSS/SQL | Select the local file or its folder |
| Jupyter notebooks (.ipynb) | Select the notebook; use text/code content as a learning source |
| PNG, JPEG, WebP | Select the image; interpretation depends on model capabilities |
| Text PDFs | Select a local PDF; requires pdftotext from Poppler or Xpdf |
| Public HTTPS HTML/text/JSON | Add the URL using Select source |
| PDF URL | Download it first, then select the local PDF |
| Scanned PDF, video, private webpage, JavaScript-only page, Office document | Provide OCR text, a transcript, or an accessible supported export |

Local source files are limited to 20 MB; images have an 8 MB limit. Web extraction is limited to 2 MB. Individual text reads return at most 300 lines. Folder listings are bounded and may show only the first 400 matches; narrow your source or filter when necessary.

Hidden folders and generated folders such as node_modules, vendor, dist, build, and Learning are excluded from folder source reads. Registered folder reads cannot traverse outside that source folder. These restrictions describe OPERA's source tool; they do not sandbox every tool available in Pi.

Ask for the source file/URL and actual lines or pages. PDF extracted-text line numbers are not PDF page numbers. Re-select a source if you move or rename its original file. A saved registration does not keep a copy of deleted material.

### PDFs

The extractor looks for pdftotext on PATH and checks standard Git for Windows locations as a fallback. You can inspect its availability from a system terminal:

~~~powershell
pdftotext -v
~~~

If no extractor is available, provide a text export. If the PDF contains only scanned images, text extraction alone will not create OCR text. Encrypted, damaged, oversized, or extraction-heavy PDFs may also require a smaller excerpt or supported image.

## 4. Choose a teaching style

Open **/opera → Style**, or describe the style you want in ordinary language.

| Style | Typical behavior |
|---|---|
| balanced | Short explanation with optional application |
| explain | Connected explanation without mandatory quizzes |
| socratic | One fair prediction, then a pause for your answer |
| hands-on | A small implementation or debugging task with verification |
| visual | A useful diagram and explanation of the relationships |

Styles are changeable preferences. They are not diagnoses of a fixed learning type. You can request direct answers, full solutions, or a different style at any point.

## 5. Practise and understand feedback

Use ordinary requests such as:

~~~text
Quiz me on this explanation using written recall.
Give me one multiple-choice question about this distinction.
Ask me to predict what changes if the input is empty.
Give me a small debugging task and clear success criteria.
~~~

Only /learn, /review, and /opera are OPERA slash commands. Use natural language for quizzes, sources, hints, diagrams, and notes; Pi's own built-in commands remain available.

OPERA captures one actual response before assessing it. Good feedback identifies what is correct, the decisive reason, and one main misconception. Say “next” to advance, “idk” when stuck, or ask for a full explanation. You can explicitly request automatic advancement if that is what you want.

Progress distinguishes recognition, explanation, application, independent correct work, assistance, and delayed recall. Attempt counts and study time are not mastery scores. Correctly repeating an answer immediately after seeing it is not independent delayed recall.

### Optional browser interface

Open **/opera → Practice interface → Browser (HTML)**. Choose **Terminal** to switch back. Browser activities open a temporary local page; keep OPERA running, submit the response there, then return to the terminal for feedback.

Prediction activities preserve your first prediction before showing the authored outcome and asking for reflection. These outcomes are examples, not executed simulations. Practical-task pages collect your work and test output; the page itself does not execute code or verify that reported output is true.

Activity URLs bind to 127.0.0.1 and are temporary. A page expires when the activity ends or times out (normally after 30 minutes). If a page stops responding, return to the terminal and request a fresh activity. Reopening an old URL after restarting OPERA will not restore a live activity.

### Audio, when requested

You may request listening or speaking practice. Browser voices and language support vary. Revealing the transcript counts as help. Recording requires browser microphone permission; saving it with the attempt requires the local-save checkbox and submission. Saved recordings go in Learning/Audio.

Optional browser speech recognition is separate and may send audio to the browser's recognition service. A transcript does not establish pronunciation or speaking ability. The tool does not automatically send recorded audio to the model provider; written responses may go to the configured provider.

## 6. Save notes and diagrams

~~~text
Save a focused note on this concept, with the mechanism, one example, and source.
Draw a concept map showing how these ideas connect.
Make a comparison diagram of the two approaches.
Show this process as steps.
~~~

Notes are saved under **Learning/Notes**. They contain the purpose, mechanism, an example, a contrast or limitation, and source attribution. Recall answers should be separated from questions.

Visuals are saved under **Learning/Visuals**, including offline HTML, SVG, and Markdown/Mermaid artifacts. Use **/opera → Open latest visual** to reopen the newest HTML visual. If automatic opening fails, open its saved HTML file manually.

To read notes in Obsidian, open the project's Learning folder as a vault, or open the Markdown files in an existing workflow. Obsidian is optional. OPERA does not automatically move files into a different vault or duplicate entire conversations into Markdown. Pi session history remains the conversation record.

## 7. Checkpoints, resume, and review

### Save a checkpoint

Say “save a checkpoint,” or use **/opera → Save checkpoint**. A checkpoint records the actual objective, selected source/section, observed evidence, weak target, pending question, assistance or answer exposure, and one next action. It is a compact handoff, not a full transcript.

### Resume learning

Launch OPERA and use **/learn** without a topic or **/opera → Resume**. A submitted answer awaiting feedback should take priority over inventing a fresh question or repeating intake.

To reopen Pi conversation history as well, launch:

~~~powershell
npm start -- --resume
~~~

That flag goes to Pi. Pi conversation resumption and OPERA's saved checkpoint are separate features.

### Review

Enter **/review** for one observed weak or due target. Reviews should vary wording or context and use actual captured evidence. If there is no relevant target yet, ask for fresh practice. Dates are scheduling heuristics checked when you use OPERA; they do not create notifications, impose a backlog penalty, or run background lessons.

Choose **/opera → Progress** to refresh Learning/Progress.md and inspect attempt counts, pending feedback, and due targets.

## 8. Where data lives and what to back up

| Location | Purpose |
|---|---|
| .opera/state.json and related backups | Source registrations, preferences, attempts, evidence, checkpoints |
| Learning/Notes | Requested concept notes |
| Learning/Visuals | Requested diagrams |
| Learning/Progress.md | Explicitly refreshed progress snapshot |
| Learning/Audio | Recordings saved with explicit local consent |
| Pi-managed configuration/history | Provider setup and conversations, stored separately by Pi |

Close OPERA before taking a consistent backup. Back up **.opera** and **Learning** together, and preserve Pi configuration/history separately if you need them. Keep source files too: registered paths do not contain the original material. Restoring into a different location may require re-selecting sources.

Do not delete state to fix an error without preserving it. Invalid state should be investigated with its backups. Old .opera/games, .opera/game-content, and Learning/Games folders in an upgraded installation are historical learner data; the current application has no game launcher.

This repository excludes learner data and credentials. Keep .opera, Learning, .env files, session history, recordings, and private backup folders out of commits. A source read or written response may still enter your model-provider conversation; choose material accordingly.

## 9. Update safely

For a fresh installation, download the current repository into an empty folder and run npm ci.

For an existing installation with learner data:

1. Close OPERA.
2. Download or clone the new version into a separate folder.
3. Open PowerShell in that new folder.
4. Run the updater, with the existing installation as Target:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Update-Opera.ps1" -Target "C:\path\to\existing\opera-terminal"
~~~

The updater validates every listed application's SHA-256 before changing installed files. It creates an application backup beside the target, replaces listed application files, and removes only listed obsolete application files. It preserves .opera, Learning, node_modules, unrelated files, and separately managed Pi configuration.

Run npm ci in the existing installation if dependencies are missing, damaged, or changed in the new lockfile. Restart OPERA to load the new code. Keep backups private. Do not extract a clean distribution over the only copy of your learning data or replace the whole old folder.

If checksum validation fails, use a fresh, unmodified download; do not bypass the check. An application backup is not a replacement for a separate backup of learner data.

## 10. Troubleshooting

| Symptom | What to try |
|---|---|
| node or npm is not recognized | Install Node.js from its official distribution, reopen the terminal, and check node --version |
| OPERA requires a newer Node version | Use Node.js 22.19.0 or newer |
| PowerShell blocks npm.ps1 | Use npm.cmd ci and npm.cmd start |
| Dependencies are missing | In the project folder, run npm ci |
| npm ci fails | Check network access and its actual error; preserve package-lock.json and retry from the correct folder |
| /learn or /opera is unavailable | Start through npm start in the extracted project with its .pi folder present; restart after updates |
| Provider or model fails | Check /login and /model in Pi and the provider's account/usage status |
| No supported files appear | Check the extension, hidden/generated folder exclusions, filename filter, and source location |
| Source path no longer works | Re-select the moved or renamed file/folder |
| PDF extraction fails | Check pdftotext, try a text export, or provide a smaller excerpt/image |
| HTTPS page is empty or denied | Export accessible text; sign-in pages, videos, and JavaScript-only pages are not fully extracted |
| Picker does not open | Use the terminal fallback or typed path |
| Browser does not open | Open the displayed URL or saved HTML manually; keep OPERA running for activities |
| Browser activity expired | Return to the terminal and request a new activity |
| No audio voice for a language | Use an available voice or a different activity; transcript use is recorded as help |
| A progress view looks stale | Run /opera → Progress to refresh it |
| No review targets yet | Capture actual practice first; ask “quiz me” |
| State cannot be read | Preserve .opera and its backups, inspect the reported validation error, and avoid resetting the folder |
| Updater checksum mismatch | Download a fresh unmodified copy; application edits require a matching regenerated manifest |

## 11. Development checks

From the application folder:

~~~powershell
npm ci
npm run check
npm test
~~~

Browser tests use an installed Chrome, Edge, or Chromium executable and may skip if none is found. To specify one on Windows:

~~~powershell
$env:OPERA_BROWSER = "C:\Program Files\Google\Chrome\Application\chrome.exe"
npm test
~~~

These tests include simulated learners and headless browser checks. Passing them does not validate a live model-provider session or every native picker. See VALIDATION.md for the earlier project's recorded verification and its limits. Documentation preparation for GitHub does not imply that those checks were rerun in the current environment.
