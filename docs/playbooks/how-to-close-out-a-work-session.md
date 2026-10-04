# How to close out a work session

Use this when a stretch of agent work is finished and you want a fresh pass over everything it touched, plus a note you can pick up next time. One chat is enough. So is a pile of closed chats and a long local git history.

You do not have to remember which files changed. The agent reads local commit times and, once you have closed out at least once, the last commit whose message contains a `SESSION:` line.

## When you are done for now

Open a new agent chat and send:

```text
/session

<what you are thinking, how this feels, and what you want to focus on next>
```

In Cursor, attach the rule instead of the slash command: type **`@`** → **Rules** → **Session close-out**. The brain dump can be the rest of the same message. Write it however it comes out. Say `skip` if you have nothing to add.

The agent will:

1. Decide the window (your words, else the last `SESSION:` commit, else a 6-hour gap in commit times, else the reflog).
2. Re-read the files in that window and split them into quick fixes and later work.
3. Append a stop entry to `docs/plans/sessions/log.md`.
4. Commit **only that file**, with a message like:

```text
docs(session): stop pet-editor

SESSION: stop
Start: 2026-09-30T18:12:00-04:00
Stop: 2026-09-30T23:43:00-04:00
```

That commit is the bookmark. The next `/session` starts after it.

Code edits from the stretch stay uncommitted. If you also want the obvious fixes applied before the bookmark, say so in the same message: `/session and fix the small stuff`.

## The other three commands

Use these when you want one piece of the close-out, not the whole thing.

| You want | Cursor rule | Slash command | What you get |
|---|---|---|---|
| A re-read and a split, nothing written | Session review | `/session-review` | A report in the chat. No commit. |
| Only the obvious, local fixes | Session fix | `/session-fix` | Code edits. Not the session commit. |
| Only the log entry and the bookmark | Session next | `/session-next` | One new entry in `docs/plans/sessions/log.md`, then the `SESSION: stop` commit. |

## If it asks you something

Answer in plain language. It asks only when it cannot tell the window apart, or when you left out a brain dump.

- It shows two time ranges: say which one, or give a start commit, a date, or "the last N commits".
- It asks what is on your mind: answer, or say `skip`.
- It says there is nothing new since the last stop: you are already closed out. No second commit.

If writing or committing fails, the entry stays in the chat or in the log file, and the agent stops. The next close-out can commit the log. It will not invent a different file or skip git hooks.

## What the log entry is for

Each stop in `docs/plans/sessions/log.md` records the start and stop times, your brain dump, what the stretch changed, any quick fixes, and a short itinerary for the next session. Open that file when you start again, or point a new chat at the latest entry.
