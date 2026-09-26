# Workflow graphs and Jev

Research checked September 26, 2026. Architecture options, not selected infrastructure.

## Distinct responsibilities

- Jev can answer bounded classification questions about a proposal description. Keep explicit unknown outcomes, user confirmation and tested routing criteria. Its probabilities are not permission probabilities or Development Ease scores.
- An evidence and dependency model connects source observations, proposal versions, findings and next actions. Relationships should record what a finding depends on and which task supplies missing information. This is the product's domain model, independent of a workflow library.
- LangGraph can execute a sequence of functions with branches, retries, persistent checkpoints and pauses for human input. A function can call a Jev API adapter; this composition is an engineering proposal, not a verified ready-made integration.
- A database stores projects, evidence versions, findings and task progress. A graph-shaped domain model does not itself require a graph database. Postgres with explicit relationship tables is a candidate, not a selected service.

## Example

Describe work -> classify activities -> confirm inputs -> resolve authoritative jurisdiction -> retrieve relevant evidence -> run supported checks -> save findings and next actions.

A saved task can later receive an outcome or evidence reference. The system checks which proposal and evidence versions that outcome concerns, marks affected findings stale, and recomputes them. A completed request does not establish a favorable response. One waiting task should not block unrelated project work.

For v1, evidence can be entered as structured response details and source references. General file/packet extraction remains v2. Old assessments should remain inspectable after a rerun.

## Tradeoffs

Ordinary application functions plus persisted task states are sufficient for a simple guided form and manual resume. LangGraph becomes more valuable when model and source calls branch, retry independently, and resume across several human decisions. It adds checkpoint schemas, replay behavior, workflow versioning and deployment/runtime choices to maintain.

LangGraph interrupts require durable checkpoint storage in production. On resume the interrupted node starts again, so effects before the pause must be idempotent or separated. A checkpoint does not refresh stale sources or validate the evidence supplied by a user. Those are application responsibilities. In-memory examples do not survive process restarts and are not suitable for saved project promises.

A serverless request should not wait days for a human task. Persist the state, return to the UI, and invoke work again on a later authenticated request or event. No background worker platform or long-running agent deployment is selected yet.

## Primary sources

- TypeSafe patterns: https://docs.typesafe.ai/patterns
- TypeSafe model limitations: https://docs.typesafe.ai/model-jaggedness/jev-1.13
- LangGraph functions and workflow design: https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph
- LangGraph persistence: https://docs.langchain.com/oss/javascript/langgraph/persistence
- LangGraph interrupts and replay: https://docs.langchain.com/oss/javascript/langgraph/interrupts
