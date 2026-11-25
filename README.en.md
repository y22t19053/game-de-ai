# game-de-ai

> Make the games AI helps you build a little less AI-flavored.

An acceptance apparatus for "AI-assisted game development". Three parts:

| Path | What it is | What backs it |
|---|---|---|
| [`skills/game-de-ai/`](skills/game-de-ai/) | A visual & copy workflow the agent follows (Markdown skill, Chinese) | 15 iron rules, 3 tiers, A–H pipeline, 59 institutional archives |
| [`court/`](court/) | A delivery court: zero-dependency Node, every claim gets evidence, every ruling gets a reason | 20 case files, 53 evidence items, 468 hash-chained log entries, 27 tests |
| [`docs/`](docs/) | The specs that connect them | multi-agent parallelism / evidence tiers / shipping gates |

## The problem

AI made building games faster. It also made *sloppiness* faster. These sentences became cheap:

- "I looked at the screenshot, it's done." — that screenshot is six months old.
- "Tests are green, ship it." — green tests prove the tests cover what they cover.
- "It's on the store, finished." — being downloadable is not being playable.
- "The AI reviewer gave it 8/10." — the AI reviewer shares a base model with the AI author.

This repo adds no features. It does one thing: **turns those sentences into checkable facts.** "Done" needs a screenshot and a real run. "Fun" needs a human who played it. "Finished" needs someone who did not write the code to sign off against a checklist.

## 30 seconds

```bash
git clone https://github.com/y22t19053/game-de-ai && cd game-de-ai
npm test                                              # 27 tests
node court/bin/court.mjs metrics show --root court
node court/bin/court.mjs audit verify --root court    # currently red — by design, see below
node court/bin/court.mjs case list --root court
```

Argument order is **group → action → options**: `case list --root court` works, `--root court case list` prints usage.
Groups: `case evidence brief dispute cross jury judge task precedent redteam cost audit metrics log`.

## What the court enforces

Not "an agent with a judge's title" — common-law adversarial procedure, Iceland's free-state distributed enforcement, and Zhang Juzheng's performance-ledger system, written as code that **rejects you**. Zero dependencies, one `src/court.mjs` plus a CLI.

Rules locked by tests (each test violates the rule first, then asserts the rejection):

- The proposal's author may not judge; neither may counsel — `JUDGE_IS_AUTHOR` / `JUDGE_IS_ADVOCATE`
- Nobody verifies their own deliverable — `SELF_VERIFICATION`
- Model inference may not be marked "independently verified" — `EVIDENCE_LAUNDERING`
- A ruling needs ≥20 characters of reasoning, and every argument must cite admitted evidence
- Each juror seals an independent file with a sha; flipping one character turns the audit red — `JURY_SEAL_BROKEN`
- Cross-project precedents are never binding; dead or overruled precedents cannot be cited
- A task needs a deadline and an acceptance criterion a third party can execute, or it cannot be dispatched
- A case cannot close with open tasks; an unrung case cannot dispatch work — `NO_RULING`

## Measured, not claimed

20 cases (8 major / 10 ordinary / 2 high-risk), 53 evidence items, 31 cross-examination rounds, 65 jury ballots, 22 tasks, 43 recorded defects, 468 hash-chained log entries.

**`audit verify` is red right now**: 64 problems = 9 overdue tasks + 55 late initial rulings (recorded after the briefs were filed). That is not a bug. The institution records "you did not do it on time" instead of hiding it; overdue is logged, not auto-collected. **An auditor that is always green is worth nothing.**

Red team: 23 attacks, 21 blocked. The two that get through are documented and intentionally not fixed:

- **A4 — win by sheer volume**: no word cap at the discipline layer; 800 words making one point still passes the gate (known weakness I-01)
- **A11 — batch-filing turns the gate green**: the gate protects provenance, not convergence (design boundary acknowledged in ruling C-001)

Weaknesses belong in the docs, not in a post-mortem.

## Limits (up front)

- "Independence" only means independent context + different input packet. Judges on the same base model are partly independent.
- A jury of 5 is not a statistical guarantee. It is one more pair of eyes.
- Token cost is not instrumented. `"tokens": "unavailable"` is the honest value; we do not invent one.
- Overdue tasks are logged, not notified. No cross-case dependencies, no concurrent-writer tests.

## The skill

A visual and copy workflow for the agent: art direction, UI, asset production, player-facing copy, and "does this look AI-generated". Chinese-language; the history archive is a 59-document source library on how historical bureaucracies turned procedure into executable rules.

Install: drop `skills/game-de-ai/` into your agent's skills directory (`~/.dsh/skills/` for DeepSeek Harness, `.claude/skills/` for Claude Code).

## Docs

- [`docs/WHY.md`](docs/WHY.md) — why a court instead of a checklist
- [`docs/MULTI_AGENT.md`](docs/MULTI_AGENT.md) — several agents editing one game project without stepping on each other
- [`docs/EVIDENCE_TIERS.md`](docs/EVIDENCE_TIERS.md) — mechanical / human / release evidence must not be mixed
- [`docs/GATES.md`](docs/GATES.md) — merge, export, and submission gates

## License

MIT, see [LICENSE](LICENSE). `skills/game-de-ai/references/impeccable/` is adapted from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0, modified), see [THIRD_PARTY.md](THIRD_PARTY.md).

Project names in the case files (roll-cut-die, 1-6, bistro-rush, diceverse …) are the author's own games, kept as real case files — not demo data.
