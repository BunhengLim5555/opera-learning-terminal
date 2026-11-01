# Codex Task: Enable PDF rendering with Poppler

## Goal
Make the PDF source reader work with the Poppler installation already downloaded on this Windows machine. The reader currently reports that `pdftoppm` is unavailable.

## First inspect
1. Find the PDF-rendering code and determine how it locates and invokes `pdftoppm`.
2. Check the installed Poppler folder and confirm where `pdftoppm.exe` is located. Do not assume a fixed installation path; inspect the machine/configuration.
3. Identify the smallest reliable fix. Prefer resolving the executable from `PATH` or an explicit configuration setting over hard-coding a user-specific path.

## Implement
- Ensure the renderer can invoke `pdftoppm.exe` on Windows, including paths containing spaces.
- If Poppler is installed but its `bin` directory is not on `PATH`, support a documented configuration option (for example, a Poppler `bin` path environment variable) or provide a clear diagnostic explaining how to configure it.
- Preserve behavior on platforms where `pdftoppm` is already available on `PATH`.
- Handle missing executable and invocation errors with an actionable message. Avoid swallowing the underlying error.
- Do not install software automatically, alter global `PATH`, or hard-code this machine’s user directory.

## Verify
- Add or update focused tests for executable resolution, including a Windows path with spaces and the missing-Poppler case. Mock process execution where practical; tests must not require a real PDF or Poppler installation.
- Run the relevant tests and report their results.
- If a real Poppler installation is available, verify `pdftoppm -v` and perform a small smoke test against a sample PDF without modifying the original file.

## Constraints
Keep the change narrowly scoped to Poppler discovery and PDF rendering. Do not change unrelated source-reading behavior. In the final report, list changed files, configuration needed (if any), and verification performed, clearly distinguishing automated tests from any real-machine smoke test.
