# OPERA — lightweight terminal tutor

Study selected sources, understand mechanisms, practise, review weak concepts, and resume from compact checkpoints. Built on the existing Pi runtime; no new framework or account.

| Command | Purpose |
|---|---|
| /learn [topic] | Start a topic, or resume the current objective; select a source when needed |
| /review | Retrieve one observed weak or due target |
| /opera | Source selection, style, progress, checkpoint, resume and saved artifacts |

Say “quiz me,” “use this source,” “explain directly,” “hint,” “show the answer,” “draw this,” “save a note,” “save a checkpoint,” “next,” or “pause.” After one answer and feedback, OPERA waits. Pi's /login, /model and session commands remain available.

## Start

Requires Node.js 22.19+ (24 LTS works). From this folder:

```powershell
npm ci
npm start
```

Use Pi's existing /login and /model. The launcher still registers a quoted file/folder argument and passes other flags to Pi:

```powershell
npm start -- "C:\Users\you\Documents\Sources"
npm start -- --resume
```

Choose /opera → Select source for native Windows file/folder pickers, saved roots, HTTPS links or a typed path. Terminal browsing is the fallback. Files stay at their original locations. Bounded source tools support text/code, Markdown, CSV/JSON/YAML, notebooks, images, PPTX slides/speaker notes and text PDFs through optional Poppler. MP4 sources return timestamped frame samples and accessible subtitles from a bounded time range. Public HTTPS pages use bounded text extraction; sign-in pages, videos, scans and JavaScript-only pages need an accessible export or transcript.

Choose a flexible style: balanced, explain, socratic, hands-on or visual. Natural style changes use the same progress tool. Written reasoning and choice practice default to the terminal; an optional browser interface remains under /opera. Prediction, practical work and audio remain available only on request through the same practice tool, with narrowly loaded guidance. No games, XP, combat or mastery percentages.

## What is retained

- One assistant and one authoritative teaching contract in AGENTS.md.
- Source attribution and access limits; relevant excerpts rather than whole-vault injection.
- Real submitted answers, hints, answer exposure, independent evidence and delayed recall.
- Evidence-based reviews and compact checkpoints with one next action.
- Focused notes and map/comparison/step visuals, saved as offline HTML, SVG and Markdown/Mermaid.
- Existing provider configuration, launcher path and Pi history.

OPERA no longer duplicates full conversations into Markdown. Existing session logs, game records, notes, visuals and state are preserved as historical learner data. Existing state stays version 1; new checkpoint fields are optional, so no migration or reset is needed. State writes retain the existing backup/validation behavior.

Learning/Notes and Learning/Visuals hold requested artifacts. Learning/Progress.md is refreshed explicitly. .opera/state.json retains sources, styles, attempts and checkpoints. Pi manages conversation history. Review dates are checked on use; they do not schedule notifications.

## Update

The installed project has already been updated in place. Restart OPERA to load it.

For another existing installation, extract OPERA_Lean_1.3.0.zip into a separate folder, close OPERA, then run its updater:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\Update-Opera.ps1" -Target "C:\path\to\existing\opera-terminal"
```

The updater backs up affected application files beside the target, copies application files and removes only listed obsolete application files. It preserves .opera, Learning, node_modules, unrelated files and Pi/provider configuration. Keep private backups private. Never replace the whole old project folder with a clean distribution: the distribution intentionally excludes learner data.

PPTX and MP4 add local parser/media dependencies. They are installed in this updated working project. For another installation or a fresh extraction, run npm ci from the project folder before starting. FFmpeg/FFprobe are supplied locally by npm; no global codec install or extra account is required. Optional PDF extraction requires pdftotext (existing Windows Git fallback remains).

See GUIDE.md for the short workflow and VALIDATION.md for measured payload and verification limits.

## Study a presentation or video

Choose /opera > Select source and select a .pptx or .mp4, or select its containing folder. Ask naturally, for example: 'Explain slides 3-5' or 'Study 02:00-03:00 of this video.' Source reading stays bounded; files remain in place.

PPTX: slide text and speaker notes, with slide-number attribution. Images, chart/SmartArt internals and animations are not OCR-read or rendered. Legacy .ppt/password-protected files need an unencrypted export.

MP4: up to 4 GB, timestamped JPEG frame samples (vision model required), embedded text subtitles and matching .srt/.vtt sidecars from a selected folder. A single-file selection does not grant sibling-file access. Text-only models receive captions and metadata. Search covers accessible sidecar subtitles; it does not search untranscribed speech or image content.

Speech transcription is optional: request it explicitly and install/configure a local Whisper CLI if needed. No speech engine or speech model is bundled; absent subtitles/Whisper, OPERA reports that audio has not been transcribed. Optional environment variables: OPERA_WHISPER, OPERA_WHISPER_MODEL, OPERA_FFMPEG and OPERA_FFPROBE. No audio is sent to a separate cloud transcription service by this reader.

Optional local speech setup, using your preferred Python environment: pip install -U openai-whisper. Set OPERA_WHISPER to that environment\'s whisper.exe if it is not on PATH. The first requested transcription may download its speech model. This optional engine is separate from OPERA\'s tutoring-model/provider choice. See https://github.com/openai/whisper for supported environments and upstream setup requirements.
