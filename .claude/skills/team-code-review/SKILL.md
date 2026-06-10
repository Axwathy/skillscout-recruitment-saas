---
name: team-code-review
description: >-
  Structured, security-first code review against this team's standards. Use
  whenever the user asks to review code, check or critique a pull request / diff,
  audit a change before merging, or asks whether code is safe, correct, or ready
  to ship — even if they don't say the word "review" but are clearly asking for
  feedback on written code. Produces findings grouped Security → Error Handling →
  Performance → Code Quality → Testing, each tagged Severity / Location / Issue /
  Fix.
---

# Team Code Review

Review code against the team's standards and report findings in a consistent,
skimmable format. Work through the sections **in order** — Security first,
because a security hole that ships is far more expensive than a style nit, so it
should never be buried under lower-priority comments.

## How to run a review

1. Identify what's under review. If the user didn't paste code, look at the diff
   (`git diff`, the named files, or the PR). Review the **changed** lines and the
   code they touch — not the whole repo.
2. Walk the five sections below, top to bottom.
3. Report every finding using the **Finding format**. If a section is clean, say
   so briefly rather than padding it.
4. End with a one-line verdict: is the change safe to merge, or are there blockers?

Be specific and actionable. A finding the author can't act on is noise. When you
assert something is a bug, point to the exact line and explain the consequence.

## Review sections

### 1. Security (always first)
- SQL/NoSQL injection, unvalidated or untrusted input reaching queries/commands
- Missing authentication or authorization checks on an endpoint or action
- Secrets, tokens, or keys committed in code or config
- CORS misconfiguration, overly permissive origins, or leaked credentials

### 2. Error Handling
- Async operations wrapped in try/catch (or equivalent) where they can fail
- Errors logged with enough context to debug, not swallowed
- Consistent error shape/format returned to callers
- No empty catches that hide failures

### 3. Performance
- N+1 queries (loops issuing one query per item)
- Missing indexes on columns used for filtering/sorting/joins
- Unbounded queries or loops over unbounded data
- Large payloads returned without pagination

### 4. Code Quality
- Functions stay focused (roughly under 30 lines); split when they do too much
- No unexplained magic numbers — name them
- No `any` types (or equivalent escape hatches) where a real type fits
- Dead code, commented-out blocks, and unused imports removed

### 5. Testing
- Is the change testable as written? If not, note what makes it hard.
- If there are no tests, suggest **specific** cases (happy path, the edge cases
  you can see, and the failure modes), not just "add tests."

## Finding format

Report each finding as:

- **Severity** — CRITICAL / WARNING / SUGGESTION
- **Location** — `file:line`
- **Issue** — what's wrong and why it matters
- **Fix** — the concrete change to make

Severity guide: **CRITICAL** = security hole, data loss, or a real bug that will
bite in production (a merge blocker). **WARNING** = likely to cause problems or
clearly violates a standard. **SUGGESTION** = improvement worth considering, not
a blocker.

**Example:**

Input: a view that builds a SQL string from a request parameter.

Output:
- **Severity:** CRITICAL
- **Location:** `apps/jobs/views.py:142`
- **Issue:** `search` query param is concatenated straight into raw SQL — SQL injection. An attacker can read or drop tables.
- **Fix:** Use the ORM (`.filter(title__icontains=search)`) or a parameterized query; never interpolate request data into SQL.

## Output structure

Group findings under the five section headings, in order. Within a section, list
CRITICAL findings first. If nothing is found in a section, write
"No issues found." Close with a verdict line, e.g. *"Verdict: 1 CRITICAL blocker
— do not merge until the injection is fixed."*
