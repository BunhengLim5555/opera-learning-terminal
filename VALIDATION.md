# OPERA 1.3.0 source-reader verification

Implemented both requested source formats in the existing project and source workflow. The command list remains /learn, /review and /opera.

## PPTX

- File and folder selection, Windows picker filter, listing, bounded reading and literal search.
- Slide text and speaker notes follow presentation relationships, including reordered filenames, rich text, table-cell paragraphs, decoded Unicode/entities and labelled hidden slides.
- Read excerpts and search hits cite slide numbers; notes are marked separately. Blank/image-only slides have an explicit limitation marker.
- Tested standard and strict OOXML namespaces, changed-file cache invalidation, missing/malformed/encrypted/legacy files, external/escaping relationships, expansion/text bounds and a real Pi tool invocation.
- Images, animations, embedded objects and chart/SmartArt internals are not rendered or OCR-read. No PowerPoint desktop session was used.

## MP4

- File/folder selection, Windows picker filter and time-window reading. Defaults: 30 seconds and three sampled frames; configurable 0-6 frames, up to 300 seconds per read.
- Real local FFmpeg/FFprobe processes decoded generated H.264/AAC MP4s and embedded mov_text subtitles, returned timestamped JPEG image blocks, and read/searched matching SRT sidecars from an authorized folder.
- Single-file source selection does not authorize sibling subtitles. A file-symlink escape test is present but skipped on this Windows host because file-symlink privileges are unavailable. Existing folder/junction confinement tests still pass.
- Video files bypass the 20 MB text-source cap and are supported up to 4 GB without loading the whole recording into memory. A >20 MB fixture was read successfully.
- Frame payloads stay in image blocks; base64 is omitted from metadata/details. Text-only models receive captions and metadata without images.
- Invalid time windows/files, missing tools, cancellation, WebVTT parsing, caption bounds and missing-transcription behavior are tested.
- Local Whisper integration was tested with an injected CLI response while actual FFmpeg extracted the bounded audio clip. Timestamp offsets and temporary-file cleanup were verified. Whisper is not installed on this machine, so actual speech recognition/model quality was not tested. The reader does not infer spoken content from frames.
- Video search covers accessible sidecar subtitles only. Embedded captions and optional local speech are available through bounded reads. No remote-video downloader or always-running service was added.

## Results

Windows, Node.js v24.22.1, pinned Pi 1.4.0:

- npm test: 105 tests, 104 passed, zero failed, one skipped (file-symlink privilege).
- npm run check: passed.
- node opera.mjs --help: passed; the three OPERA commands are unchanged.
- Existing Chromium activity/dashboard checks and earlier teaching/progress tests still pass.
- New source readers use fflate 0.8.3, @xmldom/xmldom 0.9.12, ffmpeg-static 5.3.0 and @ffprobe-installer/ffprobe 2.1.2. Installed local codec executables were exercised; no global installation was made.
- npm audit reports the existing Pi/undici advisories; no advisory was reported against the new parser/media packages. No unrelated Pi/provider upgrade was attempted.

The earlier private backup and current learner records differ at state.json, its backup and Progress.md: current records contain newer topics, source registrations and attempts. All earlier attempt IDs, source IDs and topic IDs are still present; the other 50 snapshotted files are unchanged. The current learner files were preserved and separately snapshotted before packaging; no state migration or rollback was performed. Final packaging compares against this current SHA-256 snapshot. Distribution packaging verifies its inventory and checksums and excludes learner data, dependencies, credentials and private backups. The updater is verified against a simulated previous installation, preserving learner/configuration files and the dependency directory. Another installation must run npm ci after updating application files.

No live model/provider session, manual native file dialog, real learner video/deck or audio-recognition model was used. Synthetic fixtures exercised the actual source tool and codec processes. Reading-order/vision quality and arbitrary media codecs remain format/model dependent.

## Use and update

This working installation already has the new dependencies. Restart OPERA, select a PPTX or MP4 through /opera > Select source, and ask for slides or a time range.

For video images use a vision-capable tutoring model. For speech without captions, optional local Whisper must be installed/configured; otherwise OPERA explicitly reports that audio was not transcribed. The optional setup is described in README.md and the narrowly loaded media reference.

For another installation, extract OPERA_Lean_1.3.0.zip separately, close OPERA, run Update-Opera.ps1 -Target with the old project path, then run npm ci in that target folder. Existing .opera, Learning, provider configuration and Pi history are preserved.
