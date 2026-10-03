# ADR-002 Pure-Python `core/` separate from Django
**Decision:** orchestrator, permission engine, tools, providers live in `backend/core` with no Django imports; `apps/` is a thin layer.
**Reason:** safety logic must be testable fast and independent of web framework/database.
**Alternatives:** put everything in Django apps (simpler folders, but tests need a DB and framework).
**Advantages:** 44 tests run in ~1s without Django; replaceable pieces. **Disadvantages:** a small wiring layer (`services.py`, `audit.py`).
**Future impact:** agents and tools added in `core/` keep the same guarantees.
