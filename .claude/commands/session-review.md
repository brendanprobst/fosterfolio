# Session review (global)

Re-read the work from this stretch. Report only. Do not edit code, tests, or plan files. Do not commit.

## Bound the work session

Use an explicit bound when the user gave one (commit range, branch vs base, date, file list, or named chats). Label it `user`.

Otherwise infer it. Do not ask for a range first. Try these in order and stop at the first one that yields a window:

1. **Session marker.** `git log -40 --format='%H%n%ci%n%B%n---'` and take the newest commit whose message has a `SESSION:` trailer (`stop`, `start`, or `note`). The open stretch is everything after that commit, plus staged, unstaged, and untracked files. Inside that stretch, keep walking backward from HEAD on committer time and stop at a gap of **6 hours** or more, so an older unmarked cluster is not swallowed. Label `session-marker`.
2. **Time gap.** If no `SESSION:` trailer exists, `git log -40 --format='%ci %h %s'`. Walk backward from HEAD until a gap of **6 hours** or more. A same-afternoon run is one session even when it came from several chats. Label `time-gap`.
3. **Reflog.** If those dates are unusable (every commit shares one timestamp, or the user said the branch was amended or rebased), use `git reflog -20 --date=iso` for when the moves happened on this machine. Apply the same 6-hour gap. Label `reflog`.

Always add staged, unstaged, and untracked files that sit in the window. Skip secrets (`.env*`, credentials, keys). Uncommitted work has no commit timestamp: use each file's mtime, and keep files in the same 6-hour cluster as the newest dirty file.

Say the window in one line (label, start, end, commit count, dirty file count), then review.

Git is the file list. Closed chats explain intent only when the user points at them.

## If inference fails

Ask. Do not guess a window.

- No `SESSION:` trailer, and the newest 40 commits never hit a 6-hour gap: show the oldest and newest committer times and ask for a start commit, a date, or the last N commits.
- Two clusters from the same calendar day sit under 6 hours apart: show both windows and ask which one.
- A session marker exists but nothing is after it and the tree is clean: stop. There is no open session.
- `git log` or `git reflog` errors: quote the error and ask them to name the bound.

## Brain dump

If they already wrote what they are thinking, feeling, or wanting next, keep that wording. Do not ask them to rewrite it.

If they did not, ask once before judging the code:

> Before I review: what's on your mind — what you're thinking, how this feels, and what you want to focus on next? Say "skip" to review without that.

Do not invent a brain dump. "Skip" means the later itinerary is ordered by the findings alone. Quote their dump back, short, at the top of the report.

If they do not answer and do not say "skip", review anyway and mark the dump `missing`. Do not block the file read on it.

## Re-read

Read each touched file, not only the diff. The diff says what changed. The file says whether the result holds together with its callers, tests, and neighbors.

Group by concern, not by file:

- **Fix now** — the correct change is obvious, local, and safe: no product decision, no schema, no new dependency. Name the file and the change.
- **Next session** — needs a decision, spans a feature, or matches the brain dump. Say why it waits.
- **Fine** — one or two sentences if the stretch is sound. Do not list every clean file.

Call out incomplete work, contradictions across files, missing tests for behavior that changed, and behavior the diff claims but the file does not do.
