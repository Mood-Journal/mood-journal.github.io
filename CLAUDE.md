# Mood Journal

A personal app for tracking mood and journal entries over time.

## Core Principles

### I. Code Quality

All production code MUST be clean, readable, and maintainable. Every function and module MUST have
a single, clear responsibility. Code MUST pass linting and static analysis with zero errors before
committing. Dependencies MUST be explicit and minimized; unused imports and dead code are not
permitted. Every abstraction beyond what the immediate task requires MUST be justified — undocumented
complexity is a defect.

### II. Testing Standards

Every feature MUST include tests covering the happy path and all documented edge cases. Integration
tests MUST cover all cross-boundary interactions: API contracts, database writes, and external
service calls. Test coverage MUST NOT regress; removing tests requires documented justification.

### III. User Experience Consistency

All UI interactions MUST follow the established design patterns and component conventions — no
one-off patterns without documented rationale. Error messages MUST be human-readable, actionable,
and formatted consistently. Every user-facing flow MUST handle loading, empty, and error states;
shipping a flow with unhandled states is a defect, not a deferred task.

### IV. Performance Requirements

All user-facing operations MUST complete within defined latency budgets. Default budgets:
API responses ≤ 200 ms at p95; page or screen loads ≤ 2 s on a standard connection.
Performance regressions MUST be treated as blocking defects, not warnings.
Background and batch operations are exempt from interactive latency budgets but MUST define
explicit throughput or completion-time targets before work starts.

## Quality Gates

Before committing, all of the following MUST pass:

- Linting and static analysis: zero errors
- All existing tests pass; no test deletions without documented justification
- New code has accompanying tests
- No performance budget regressions
- Every user-facing flow handles loading, empty, and error states
- Zero unresolved `TODO(<FIELD_NAME>)` markers in code that ships to production
- Any abstraction beyond the immediate task is justified in a comment

## Git commits

Never include AI attribution in commit messages. Do not add `Co-Authored-By`, `Generated-by`, or any other trailer or note that identifies an AI tool as a contributor.

## Session Self-Evaluation

At the end of each session, evaluate how well these instructions served the work and offer concrete suggestions for improvement. Specifically consider:

- Were any instructions missing, ambiguous, or contradicted each other?
- Did you need to discover something (a command, a file location, a convention) that should be documented here?
- Did any instruction cause unnecessary friction or repeated tool calls?
- Is the tech stack, source layout, or commands section still accurate?

Always present suggestions as specific proposed diffs — not vague observations — even when auto-committing.

**Committing self-improvement suggestions**: For each suggestion, show the proposed diff. If it is a pure addition (new section, new rule, new convention — no existing text modified or removed) and you are certain it is correct and beneficial, apply it and commit immediately. If it modifies or removes any existing content, wait for explicit approval before committing.
