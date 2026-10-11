# SOURCES: where the data comes from, what is verified, what is not

Checked on **2026-10-10** by reading the pages named below. "NOT VERIFIED" means I did not confirm the licence or the
details, so check the dataset's own page before you use it. Nothing here is legal advice.

## A. Verified public sources

| Dataset | Use it for | Where | Licence (as read) | Notes / cautions |
|---|---|---|---|---|
| **MASSIVE** (Amazon, 1M utterances, 51 languages, 60 intents, 55 slots) | Intent classification and slot filling for assistant commands (tasks, reminders, alarms, general queries) | https://github.com/alexa/massive , https://huggingface.co/datasets/AmazonScience/massive , paper https://arxiv.org/abs/2204.08582 | CC BY 4.0 (dataset card) | Give attribution. A news report says its dev/test/eval splits were not to be used for training; keep them for evaluation. Check the language list on the card for the languages you need. Its labels are generic assistant intents, not this project's tools, so you must map them. |
| **xLAM function-calling 60k** (Salesforce APIGen) | Teaching the JSON tool-call format; tool selection | https://huggingface.co/datasets/Salesforce/xlam-function-calling-60k , paper https://arxiv.org/abs/2406.18518 | CC BY 4.0 (README); **gated**: log in and accept the terms; cite APIGen | The xLAM *models* have a different licence (one card shows CC BY-NC 4.0). Do not assume dataset terms apply to the models. |
| **deepset/prompt-injections** | Evaluating / training a prompt-injection detector | https://huggingface.co/datasets/deepset/prompt-injections | Apache-2.0 (dataset page) | Small (about 662 rows per a secondary article), partly German-origin phrasing, classic "ignore previous instructions" style. Good for a first test only. |
| **MITRE ATT&CK** (STIX 2.1) | Technique names / ids for detection rules and alert explanations; knowledge for the Security tutor | https://github.com/mitre-attack/attack-stix-data , terms https://attack.mitre.org/resources/legal-and-branding/terms-of-use/ | MITRE grants a royalty-free licence for research, development and commercial use; you must reproduce MITRE's copyright and licence text | MITRE states ATT&CK does not list every technique; covering it does not mean full defence. |

## B. Found but only partly verified

| Dataset | Use it for | Where | What I could confirm | What to check |
|---|---|---|---|---|
| **EMBER2024** | Research-grade malware **classification features** (no binaries needed) for a future file-scanner model | paper https://arxiv.org/abs/2506.05074 ; Python package `thrember` (mentioned by a third-party project) | Dataset has hashes, metadata, feature vectors and labels for more than 3.2M files from six formats | Exact **licence**, download location, and size. Use features only; never fetch or run the underlying binaries. |
| **abuse.ch URLhaus / ThreatFox / MalwareBazaar** | Indicators (malicious URLs, IPs, domains, file hashes) for the Threat-Intelligence store | https://urlhaus.abuse.ch , https://threatfox.abuse.ch , https://bazaar.abuse.ch (APIs under each site) | abuse.ch's own materials say its platform data is free to consume | **Licence text and whether an API key is required.** MalwareBazaar hosts live malware: use hashes and metadata only, **never download samples into this project**. |
| **Open-Prompt-Injection** | Benchmark of prompt-injection attacks and defences | GitHub project from the USENIX Security 2024 paper "Formalizing and Benchmarking Prompt Injection Attacks and Defenses" | A secondary article lists it as MIT licensed | Confirm the licence in the repository itself. |

## C. Candidates, NOT VERIFIED (licence and details unchecked)

Search the name, open the dataset page, read the licence before using.

| Name | Would help with |
|---|---|
| CLINC150, Banking77, SNIPS, ATIS | More intent-classification variety (English) |
| Berkeley Function-Calling Leaderboard (BFCL) | Evaluating tool-calling accuracy |
| Glaive function-calling v2 | More tool-call examples (a Hugging Face copy exists; licence unchecked) |
| AgentDojo, InjecAgent, BIPIA | Prompt injection against tool-using agents (closest to this project's risk) |
| CIC-IDS2017/2018, UNSW-NB15 | Labelled network-intrusion flow data for the future attack-detection research (academic terms usually apply) |
| Tranco top-sites list | Benign domain list to reduce DNS false positives |
| Mozilla Common Voice, Google Speech Commands | Speech data if you ever train or test your own voice model |
| LinCE / Hinglish code-mixing corpora | Hinglish text understanding (find a corpus whose licence allows your use) |
| HumanEval, MBPP | Evaluating the coding assistant (evaluation only) |
| NVD / CISA KEV | CVE and exploited-vulnerability facts for security Q&A and posture checks (read their terms) |

## D. What the datasets in `data/` are

**v2 Q&A (`cyber_qa`, `ai_ml_qa`):** written by me from general knowledge; each row names a reference (for example OWASP cheat sheets, NIST SP 800-63B / 800-61,
MITRE ATT&CK technique ids, RFCs, the LoRA/QLoRA/RAG papers). I did **not** re-read those references while writing, so treat every answer as
"needs human review" and check the named standard (editions and revisions change). Search results in `search_grounding` are synthetic with fictional products.

**Seed set:**

Written by me (synthetic, template-based), so it has **no third-party licence problem**. Sources are marked `synthetic-template-v1`.
`permission_cases` and `approval_scenarios` are generated by running this project's real `PermissionEngine` and `ApprovalService`.

## E. Which data trains or tests which part

| System part | Data to use | How |
|---|---|---|
| Intent router (tool / chat / refuse) | `intents_*`, MASSIVE (mapped), xLAM, your own real chat logs (with your consent, redacted) | Train small classifier or fine-tune/few-shot an LLM; evaluate on `intents_test` |
| Permission engine and approvals | `permission_cases`, `approval_scenarios` | **Deterministic code tests only. Never train a model to make permission decisions.** |
| Prompt-injection safety | `injection_cases`, deepset, Open-Prompt-Injection, AgentDojo/InjecAgent | Evaluate the LLM and the delimiting in the orchestrator |
| Voice commands | `voice_commands` | Test the text-command parser after speech-to-text |
| Security detection rules | `security_events`, ATT&CK ids | Unit-test the rule engine (planned) |
| File scanner / malware ML (future) | EMBER2024 features | Research only; heuristics + user approval stay in front |
| Threat intel store | abuse.ch indicators, your own alerts | Import with source, timestamp, confidence, licence per item |
| Coding / learning tutor | Existing instruct models; HumanEval/MBPP to evaluate | Fine-tune only if evaluation shows a clear gap, and only with licensed data |

## F. Do NOT use

Real malware binaries; leaked or breached data; scraped personal data of real people; data whose licence you cannot find; any
dataset to build tools for attacking, spying on or tracking people.
