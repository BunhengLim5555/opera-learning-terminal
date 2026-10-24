# Optional browser activities

Choice/recall use the saved terminal/browser preference. Other modes use a temporary loopback browser page, one activity and one captured submission per learner turn. No separate model request is needed to grade; the current assistant handles it.

Prediction: supply 1–6 coach-authored scenarios with id, label, setup and outcome. A committed prediction must precede outcome and reflection. An optional visual shows only the initial situation. These are examples, not executed simulations. Preserve the original prediction; reflection after outcome is assisted.

Task: supply 1–6 observable rubric criteria. Assess every criterion with result and reason using opera_progress. Unverified execution is not_observed. Use authorized tools for actual verification; never automatically execute untrusted submitted code. Agent-generated work is not independent learner implementation.

Audio: supply audio{text,language,goal:listen|speak}. Do not put the listening reference in the question. Playback depends on available browser/OS voices. Listening with zero playback requests and speaking without qualified audio analysis require not_assessed. A transcript cannot certify speaking or listening. Recording needs permission and explicit local-save consent; browser speech recognition has separate consent. No audio analysis provider is bundled. Saved historical audio remains learner data.

Hints, outcome/reference exposure, recent teaching and tool assistance must remain distinct from independent answers. Cancellation, skips and technical failures do not establish inability. After feedback pause.
