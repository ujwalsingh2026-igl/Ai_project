# ADR-011: File Threat Scanner & Quarantine Vault Architecture

## Context
Tech enthusiasts and developers frequently download tools, scripts, binaries, and dependencies that require verification before running. However, running active execution or using complex, opaque antivirus tools creates risks:
1. **Safety Boundaries**: The command center is strictly defensive. Files must **never** be executed during inspection.
2. **Privacy & Disk Access**: The scanner must never crawl the user's hard drive silently or upload files to third-party cloud services without explicit consent.
3. **Reversible Actions**: Files flagged as suspicious should not be silently deleted; quarantine must be reversible, and permanent deletion must be a separate, highly conscious user decision.
4. **Platform Compatibility**: Windows 11 with Python 3.14 often encounters compilation issues when installing C/C++ native extensions like `pefile` or `yara-python`.
5. **Honest Security Posture**: Heuristic static scanners cannot detect 100% of malware; the system must clearly state its limitations without false security guarantees.

## Decision

1. **Pure Python Static Heuristic Engine (`core/builtin_tools/file_scanner.py`)**:
   - Zero native C/C++ build dependencies; uses Python's standard library (`struct`, `hashlib`, `math`, `re`, `zipfile`, `pathlib`).
   - **Cryptographic Hashing**: Computes SHA-256 and MD5 for immutable identification.
   - **Shannon Entropy**: Calculates entropy (scale 0.0 to 8.0) for both the entire file and individual PE sections to detect packing/obfuscation (entropy > 7.2).
   - **Pure Python PE Parser**: Inspects DOS headers (`MZ`), PE signatures (`PE\0\0`), machine architectures, COFF timestamps, section flags (writable + executable `IMAGE_SCN_MEM_WRITE | IMAGE_SCN_MEM_EXECUTE`), UPX/packer section names, and imports of process-injection / stealth Windows APIs (`VirtualAlloc`, `WriteProcessMemory`, `CreateRemoteThread`, `SetWindowsHookEx`, etc.).
   - **Script & Macro Heuristics**: Scans for suspicious strings in PowerShell, Bash, Python, and Microsoft Office XML formats (e.g. `Invoke-Expression`, `DownloadString`, `-EncodedCommand`, `AutoOpen`, `AutoExec`).
   - **Zip Bomb & Archive Safety**: Safe inspection of ZIP archives enforcing limits (max 500 files, max 100 MB uncompressed size, max 50x expansion ratio).
   - **YARA-Style Regex Signatures**: Pre-configured signature rules including the standard harmless EICAR test string and destructive script commands.
   - **Threat Scoring**: Aggregates finding weights into a 0-100 score mapped to verdicts: `CLEAN` (0-20), `LOW_RISK` (21-45), `SUSPICIOUS` (46-70), and `LIKELY_MALICIOUS` (71-100).

2. **Risk Levels & Permission Engine Integration**:
   - `security_file_scan`: Risk Level 1 (`USER_DATA`). Auto-`ALLOW` when initiated on user-selected files or confirmed paths.
   - `security_file_quarantine`: Risk Level 4 (`SECURITY_RESPONSE`). Evaluates to `ASK`, requiring explicit single-use approval. Moves target file into `backend/data/quarantine/<uuid>`, changes filesystem permissions to read-only (`0400`), and retains original location metadata.
   - `security_file_restore`: Risk Level 4 (`SECURITY_RESPONSE`). Evaluates to `ASK`. Moves quarantined file back to original location and restores standard permissions.
   - `security_file_delete`: Risk Level 4 (`SECURITY_RESPONSE`). Evaluates to `ASK`. Permanently purges file from disk and marks vault record as `deleted`.

3. **Decoupled Store Pattern**:
   - Defined `QuarantineStore` protocol and `InMemoryQuarantineStore` in `core/builtin_tools/file_scanner.py` for fast, zero-database unit testing.
   - Implemented `DjangoQuarantineStore` in `apps/security/store.py` backed by `ScanFinding` and `QuarantineItem` models.

4. **REST API & Multipart Upload Handling**:
   - `POST /api/security/scan/`: Handles both direct file uploads (via `request.FILES`) and server-side local path scans.
   - `POST /api/security/quarantine/`, `.../restore/`, `.../delete/`: Triggers approval flows, returning `needs_approval` and `pending_action_id` when approval is pending.
   - `POST /api/security/hash-lookup/`: Fast local database lookup against previously recorded scans.
   - Frontend API client updated to avoid overriding `Content-Type` on `FormData` uploads, preserving browser-generated multipart boundaries.

5. **Cockpit UI Integration**:
   - **Threat Scanner Tab**: Drag-and-drop file upload zone, local path input, "Load Harmless EICAR Sample" quick action, threat score bar, entropy meter, PE section table, suspicious import badges, evidence cards, and prominent "Heuristic Scan Limits" disclaimer.
   - **Quarantine Vault Tab**: Filterable table of quarantined files, one-click SHA-256 copy, inline Level 4 approval cards for Restore and Permanent Delete.
   - Added command palette shortcuts (`Ctrl+K`) for direct navigation.

## Consequences
- Guarantees zero execution risk: analyzed files are read strictly as static binary streams.
- Full immunity to zip bombs and unpack crashes.
- Clean operation on Windows 11 without C++ compiler prerequisites.
- All quarantine/restore/delete mutations are fully audited, owner-locked, and gatekept behind Level 4 approvals.
