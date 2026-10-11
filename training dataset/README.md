# AI Assistant Training Dataset — Starter Pack

## What's included
- `all_examples.jsonl`: all 200 examples in one JSONL file.
- `train.jsonl`: 178 examples for training/development.
- `test.jsonl`: 22 held-out examples for evaluation.
- `all_examples.csv`: spreadsheet-friendly master file.
- One JSONL file per task/category.

## Categories and sizes
- `cyber_rag_qa`: 30 examples; labels: access_control, agent_security, ai_architecture, detection, grounding, identity_access, incident_response, llm_security, monitoring, network_security, privacy, risk_management, secrets_management, secure_configuration, secure_execution, security_architecture, supply_chain, vulnerability_management, web_security
- `intent_router`: 40 examples; labels: chat, refuse, tool
- `memory_action`: 20 examples; labels: delete_location_memory, delete_preference, delete_project_fact, delete_study_plan, do_not_save_sensitive, memory_recall, refuse_sensitive_memory, save_device_fact, save_preference, save_project_fact, save_temporary_goal, session_only, update_memory, update_preference, update_project_context
- `prompt_injection`: 20 examples; labels: analyze_as_data, follow_user_scope_only, quote_as_data, treat_as_untrusted
- `safety_boundary`: 30 examples; labels: allow_authorized_testing, allow_defensive, allow_educational, refuse_credential_theft, refuse_data_theft, refuse_evasion, refuse_malware, refuse_unauthorized
- `search_grounding`: 20 examples; labels: answer_directly, answer_with_citation, avoid_overclaim, conflicting_sources, identify_gaps, insufficient_evidence, needs_search, needs_verification, not_in_source, stale_source, uncertain, use_provided_document
- `threat_detection`: 20 examples; labels: benign, benign_or_low, benign_or_needs_context, blocked_probe, brute_force_suspected, credential_theft_suspected, data_access_anomaly, defense_evasion_suspected, possible_campaign, possible_exfiltration, privilege_change_anomaly, ransomware_suspected, scan_or_crawler, suspicious_execution, suspicious_persistence
- `voice_command`: 20 examples; labels: cancel, clarify, clarify_or_call, confirm_destructive_action, device_control, file_search, memory_save, refuse_unauthorized, reminder_create, security_tool, weather, web_search

## Record schema
Each JSONL line is one JSON object:
- `id`: unique example ID
- `task`: dataset component
- `input`: user request, event, or question
- `label`: target class/action
- `target`: optional router sub-intent
- `context`: optional retrieved evidence or task context
- `expected_output`: target behavior/answer for supervised training or review
- `safety_note`: optional safety/interpretation note
- `source`: `synthetic` for generated starter examples

## Important limitations
1. This is a **synthetic starter dataset**, not a production-ready or independently verified corpus.
2. The dataset has only a few dozen examples per component. It is useful for pipeline prototyping, schema testing, and creating an evaluation harness—not enough to claim robust generalization.
3. Have a human review examples, especially safety, threat detection, and cyber Q&A. Validate all factual security answers against current official sources before using them in a RAG knowledge base.
4. Keep the held-out `test.jsonl` separate. Do not train on test examples or use them for prompt tuning.
5. Add real, consented, privacy-scrubbed examples from your own usage. Remove passwords, API keys, tokens, private names, contact details, and other sensitive data.
6. For the router, consider a two-stage design: rules/permissions first, model classification second. The permission engine must be enforced in code and must not rely only on model output.
7. For RAG, store verified source documents separately, chunk them, attach source metadata, and evaluate whether generated claims are supported by retrieved passages.
8. For threat detection, labels are triage suggestions, not definitive conclusions. Correlate evidence and require authorized policy for containment actions.

## Suggested first workflow
1. Inspect `all_examples.csv`.
2. Review and correct labels with a human.
3. Keep `test.jsonl` locked away for evaluation.
4. Expand each class with varied English, Hinglish, spelling errors, and ambiguous cases.
5. Measure per-class precision/recall and confusion matrix before fine-tuning.
6. Only fine-tune after a baseline rules + few-shot + small-classifier system has been measured.

## Training format note
This is a **task-labelled multi-purpose dataset**. It is not directly in every framework's preferred chat format. Convert each task into the target format required by your chosen trainer (for example, prompt/completion or messages JSONL), and do not mix incompatible tasks into one classifier without a task field or clear instruction prefix.
