# PPTX and MP4 sources

Use the existing opera_source workflow. No additional slash commands.

## PPTX
Read/search/list local .pptx files, including native file/folder picker selection. Extract text and speaker notes in presentation order, not numeric filename order. Cite slide numbers from returned labels. Hidden slides are labelled. Rich text, table-cell text and Unicode are preserved; visual shape order can differ from intended reading order. No OCR, embedded chart/SmartArt interpretation, animations or rendering. For visual-only content ask for screenshots or an accessible text export. Legacy .ppt and encrypted files require an unencrypted .pptx or PDF export.

Use start/lines to read bounded excerpts (1-300 lines, around 18,000 characters), and nextLine to continue. Full extraction is cached for at most two unchanged decks; SHA-256 invalidates the cache after edits. Limits: 20 MB archive, 8 MB per XML part, 32 MB XML total, 4 MB extracted text. Unrelated media parts are not decompressed.

## MP4
Use startSeconds (default 0), seconds (default 30, max 300), frames (default 3, range 0-6) and optional transcribe (default false). Frames are JPEG samples near reported timestamps, not proof of continuous coverage. Ask for a narrower/new time window when needed. Cite timestamps and distinguish visual observations from caption/transcript claims.

Metadata gives duration and nextSeconds. Local MP4 files up to 4 GB are read without loading the whole recording into memory. A vision-capable model is needed to inspect frames. Text-only models get captions/metadata; never claim to have seen a frame that was not supplied.

Use embedded text subtitles when present. Matching .srt/.vtt sidecars are available only when the containing folder was selected; a single MP4-file selection does not authorize sibling-file reads. Search covers accessible sidecar captions only, not visual content, embedded subtitles or untranscribed speech. Subtitle files can also be registered/read directly. No remote MP4 downloading is bundled.

Speech is not inferred from frames. With transcribe=true and an installed local Whisper CLI, only the requested audio clip is transcribed. This may download the selected Whisper model on first use and may take time. OPERA_WHISPER selects the CLI executable; OPERA_WHISPER_MODEL defaults to base. No Whisper engine/model is bundled or silently installed. If unavailable, report that audio was not transcribed and use supplied captions. Generated transcripts are fallible source material, not learner evidence.

FFmpeg and FFprobe are supplied through the application's npm dependencies (no global installation). Existing binaries can be selected with OPERA_FFMPEG and OPERA_FFPROBE. Child processes use argument arrays, local-file protocols, bounded buffers/timeouts and cancellation. No shell execution, video player, server, or learner-state migration is required.
