# ADR-004 Approval flow for ASK decisions
**Decision:** ASK saves a PendingApproval (tool + args server-side, 5-minute expiry). `POST /api/assistant/confirm/` takes only `action_id` + `decision`.
**Reason:** the user stays the final authority; the confirm request must not be able to change what runs.
**Alternatives:** (a) client resends tool+args on confirm (can be tampered), (b) a signed token (no DB row, harder to make single-use and auditable).
**Advantages:** single-use via one atomic UPDATE, owner-only, expiry, full audit trail; approval is not a free pass (engine re-checks, level 5 stays blocked).
**Disadvantages:** one more table; API-only for now.
**Future impact:** security-response tools (level 3/4) will use this exact path. A web UI can show pending actions as buttons.
