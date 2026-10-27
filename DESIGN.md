# OPERA lean implementation

The existing Pi launcher and extension are retained. There are three OPERA commands and five model-facing tools. No provider is selected by the application.

AGENTS.md is the sole authoritative teaching contract, loaded through Pi's normal project-context mechanism. before_agent_start sends only compactContext: current style/interface, topic/objective, source, checkpoint, at most one pending submission and three recent relevant attempts. The complete attempt history remains on disk. A single supporting skill points to narrowly loaded activity, debugging and per-domain references; it does not reload a second teaching core.

Bookkeeping remains deterministic in Store. Version-1 state, unknown fields, provider settings and historical attempts are preserved. Checkpoints add optional fields without replacing old evidence. Failed validation never resets state. Showing an answer records exposure without creating an attempt. A subsequent identical question cannot become independent evidence simply by restarting the turn or asking for a hint.

Source selection is shared by /opera, source-driven /learn and opera_source select, which also supports natural requests. Existing source readers remain bounded. Notes and visuals use their existing artifact paths. Browser practice remains temporary and loopback-only; maps, comparisons and steps remain offline exports.

Game code, old offline worlds, game tests/assets, role prompts, five redundant skills, the alternate track/review queue, full-session logging and decorative 3D overlay were removed. Existing learner records were left untouched. The core Pi/typebox dependencies remain necessary; no direct dependency was game-only.

Update-Opera.ps1 uses an explicit application manifest, backs up affected files and leaves learner/configuration trees intact. A clean distribution includes no dependency folders, credentials, learner state or personal notes.

PPTX source extraction uses bounded in-memory ZIP/XML parsing (fflate and xmldom), ordered slide relationships and notes, with a two-deck content-hash cache. MP4 uses local FFmpeg/FFprobe for metadata, timestamped JPEGs and text subtitles. Optional Whisper CLI transcription is bounded to the requested clip; no speech engine is installed automatically. Images remain separate image content blocks and are omitted for text-only models. These formats share source confinement, native selection and existing read/search/list tools.
