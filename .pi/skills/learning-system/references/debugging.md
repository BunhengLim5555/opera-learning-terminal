# Debugging as evidence gathering

1. Record expected behavior, observed behavior, and exact relevant environment/error. Redact secrets.
2. Separate observations from hypotheses. Rank at most a few plausible explanations; do not turn a symptom into a confirmed cause.
3. Choose the smallest safe test that distinguishes hypotheses. In practice ask for the learner's prediction; in direct troubleshooting perform authorized checks.
4. Interpret the actual output. If tools cannot run, label suggested commands and expected possibilities; never invent a result.
5. Propose the smallest supported repair and a verification that tests the original failure plus a relevant boundary condition.
6. Ask for a later explanation or variation only after the learner advances in learning mode. A successful fix alone does not prove the learner understands why.

For code: separate syntax, types, control flow, state mutation, algorithm, and environment. For networks: isolate client, resolution, route, transport, identity, service, and application evidence without dumping every layer at once. For ML: inspect data split/leakage, baseline, objective, optimization, and evaluation before blindly increasing model complexity.
