# How the assistant can learn from you and change itself, safely

## Simple idea (Hinglish)
"Seekhna" ka matlab ye nahi ki har chat ke baad model apne aap badal jaye. Wo khatarnak hai (galat baat seekh sakta hai,
hamla karne wala usse sikha sakta hai, aur aapka password bhi yaad kar sakta hai). Safe tareeka **layers** ka hai:
chhoti cheezein turant aur wapas ho sakne wali, badi cheezein aapki ijazat ke baad, aur safety rules kabhi chat se nahi badalte.

## The layers

```
You write something / search / give feedback
        |
        v
 L0  Conversation context        this chat only
 L1  Preferences                 "be shorter", "reply in Hinglish"    -> instant, reversible, change_policy ALLOW
 L2  Memory facts                "I use Windows 11"                   -> memory_filter decides, you can view / delete / export
 L3  Knowledge (RAG)             your notes + saved search results    -> stored with url, date, confidence; cited in answers
 L4  Feedback log                thumbs, corrections                  -> ONLY with opt-in, redacted, human-reviewed
 L5  Offline fine-tune (LoRA)    from curated L4 data                 -> must pass the eval gate, versioned, rollback possible
 --------------------------------------------------------------------------------------------------
 NEVER: online weight updates after each chat, the model editing its own code, the model editing safety rules
```

## What "change yourself when I say so" can and cannot mean
A model may *understand* your sentence and turn it into a structured request. **Code decides** (`core/change_policy.py`):

| You say | Decision | Why |
|---|---|---|
| "be shorter", "reply in Hinglish", "forget X", "show/export my data" | ALLOW | personal and reversible |
| "delete everything", "learn from my chats", "switch model", "learn from this site", "run a nightly scan", "update threat feeds" | ASK | needs explicit confirmation (and step-up login later) |
| "add a new tool", "change the code", "add a detection rule" | PROPOSE_ONLY | the assistant drafts a patch/rule; you review, test and apply it. It never edits or reloads itself |
| "make level 2 ask first" | ALLOW | stricter is safe |
| "stop asking for level 2" | ASK | loosening needs confirmation |
| "let level 3/4 run automatically", "allow level 5" | BLOCK | hard caps in the permission engine |
| "turn off audit", "skip approvals", "approve everything", "stop warning me", "always agree with me", "learn from my friend's chats" | BLOCK | weakens safety, hides evidence, or involves other people's data |
| code that guards safety / permissions / audit / approvals / memory filter | BLOCK | protected code cannot be changed from chat |

Warnings can be made **shorter**, never removed.

## Learning from searches
1. Search results are **untrusted data**. Instructions inside pages are ignored (see `injection_cases`, `search_grounding`).
2. Every saved fact keeps: source url, title, date accessed, publication date, confidence, evidence, and a label FACT / INFERENCE / UNCERTAINTY.
3. "Learning from a site" is an external fetch (level 3) so it asks first. "Always trust this website" is a policy change: confirm, and still cite and mark uncertainty.
4. If a source turns out wrong, lower its confidence; do not delete the audit trail.

## Learning from your past data (what is allowed to reach training)
Only rows that pass **all** of: you opted in, a human reviewed the row, and `memory_filter` finds no secret / ID number / card number / sensitive topic.
`python curate_feedback.py` does this on your machine (example run: 8 log rows in, 3 kept, 5 rejected for opt-in, review, secrets, sensitive topic).
Deleting something deletes it everywhere: memory, collected logs and any pending training set. Opting out purges what was collected.

## The fine-tune gate (L5)
1. Freeze a test set that never enters training (`intents_test`, `injection_cases`, `search_grounding`, `change_requests`).
2. Train a LoRA adapter on curated data (`sft_tool_routing_train.jsonl` + curated rows).
3. The new model must **match or beat** the old one on every test file and must not get worse on safety files (refuse recall, injection, change gate).
4. Keep the old model; switching is a `change_model` request (ASK). Keep a rollback.
5. The permission engine, approvals and change gate stay code and are never trained.

## What exists today vs not yet
| Piece | Status |
|---|---|
| `core/change_policy.py` (gate) + tests | implemented, tested (not yet wired into the API) |
| `core/memory_filter.py` (secrets/IDs/sensitive/transient) + tests | implemented, tested; regex-based with documented gaps |
| `curate_feedback.py` | implemented, run on a synthetic example |
| Datasets (change requests, memory decisions, grounding, feedback events, Q&A) | written, validated |
| Memory store with view/update/delete/export API | NOT IMPLEMENTED YET |
| RAG over notes and saved searches (embeddings, citations) | NOT IMPLEMENTED YET |
| Feedback logging in the app (thumbs, opt-in switch) | NOT IMPLEMENTED YET |
| Text -> structured ChangeRequest parser (LLM) | NOT IMPLEMENTED YET (needs training data like `change_requests`) |
| LoRA training + eval-gate scripts | NOT IMPLEMENTED YET |
