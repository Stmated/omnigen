---
name: plan-and-implement
description: Plan and implement a feature with cost-aware sub-agent delegation. Use whenever the user says "plan and implement" or asks for token-efficient investigation, implementation, and critical-path review.
---

# Plan and implement

Delegate the workflow to the `plan-and-implement-coordinator` custom agent. Keep
the parent agent focused on supplying the user's request, receiving the final
handoff, and reporting the result; do not duplicate delegated investigation or
review in the parent context.

The coordinator must:

1. Delegate bounded, read-only investigation to `feature-investigator`.
2. Give the resulting concise handoff to `feature-implementer`, which owns the
   implementation and targeted validation.
3. Decide whether the change touches a critical path.
4. For critical-path changes only, delegate a final diff-focused review to
   `critical-path-reviewer` and send any material findings back to
   `feature-implementer` for correction.
5. Return a compact final result with changed files, behavior, validation, and
   unresolved risks.

Treat plugin execution and context merging, parser-to-model conversion, option
precedence, shared model contracts, ordered transformer pipelines, generated
public APIs, file output, security boundaries, and data-loss risks as critical
paths. Also treat a path as critical when a defect could silently generate
incorrect code across multiple targets or packages.

Optimize context and model usage:

- Give each agent only the request, relevant constraints, and the previous
  agent's concise handoff.
- Delegate distinct objectives once; never ask multiple agents to repeat the
  same repository search or review.
- Prefer targeted file reads and tests over broad context collection.
- Parallelize only independent work.
- Use the heavy reviewer only for critical paths or when targeted validation
  leaves meaningful uncertainty.
- If the runtime supports per-call reasoning effort, use the highest available
  effort for `critical-path-reviewer`; otherwise rely on its pinned model.

Agent profiles pin the intended model tiers. A skill cannot change the model of
an already-running parent session, which is why the lightweight coordinator
owns the substantive orchestration.
