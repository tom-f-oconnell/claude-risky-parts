# claude-auto-mode-red

A [Claude Code](https://claude.com/claude-code) plugin for deciding faster at a permission
dialog. When Claude Code asks you to approve a Bash command, it shows which parts of the
command are risky, in red, so you don't have to read a 50-line script to find the one
`sudo rm -rf`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install auto-mode-red --marketplace tom-f-oconnell/claude-auto-mode-red
```

Answer `y` to add the marketplace, then press Enter to install it for your user. It works
right away, and in every session after that.

From a shell instead:

```
claude plugin install auto-mode-red --marketplace tom-f-oconnell/claude-auto-mode-red
```

In the desktop app, where `/plugin` doesn't run: click + next to the prompt box, then
Plugins, Add marketplace with `tom-f-oconnell/claude-auto-mode-red`, then Add plugin.

To remove it: `/plugin uninstall auto-mode-red`.

## What it shows

While a permission dialog is open for a Bash command with risky parts, they are named like
this, each cut to its first three words, with its line number out of the command's lines:

```
2 risky parts:
(1) line 24/50: sudo rm -rf …
(2) line 26/50: git push --force …
```

That text appears in up to four places, and all of them go away once you answer the dialog
or it times out:

- **Above the dialog**, in red, at the end of the transcript. The command's own row there is
  also redrawn, cut down to the lines around the risky parts, with those parts in red. For a
  long command the dialog pushes both off screen, which is what the rest are for.
- **A side pane**, "Risky parts", which opens beside the conversation and closes again by
  itself. Claude Code only lets a plugin open a pane unasked in a wide terminal (144
  columns, or 110 once you have opened it yourself with `/risky`).
- **A desktop notification**, when the pane could not open. Needs `notify-send` (and
  `gdbus` to remove it again), so Linux desktops.
- **The tmux status line**, replaced by the text in red, when Claude Code runs inside tmux.

Nothing is shown for a command that runs without a dialog, and nothing can be drawn inside
the dialog itself: Claude Code keeps that to itself.

Claude Code doesn't say which part of a command made it ask, so the plugin works that out
itself, and can get it wrong:

1. It matches a list of risky shapes (`curl … | sh`, `sudo`, `rm -rf`, `git push --force`,
   reads of SSH keys, and so on: `hooks/patterns.ts`).
2. If none match, it asks a small model (Haiku by default) once the dialog is opening. That
   is one short request per such dialog, and the text appears when the model has answered.
3. If that finds nothing either, nothing is shown.

## Options

Set these in `/plugin` (under the plugin's options) or `/config`:

| Option | Default | What it does |
| --- | --- | --- |
| `modelFallback` | on | Ask a model when no pattern matches. |
| `model` | `haiku` | The model asked: an alias or a full model id. |
| `extraPatterns` | none | More regular expressions to treat as risky, separated by ` ;; `, e.g. `terraform\s+apply ;; \bprod-db\b`. |
| `noticeCommand` | the bundled script | A shell command run when the dialog opens. Empty turns it off. |
| `noticeClearCommand` | the bundled script | A shell command run when the dialog is answered or times out. |

The bundled script, `scripts/notice.sh`, does the tmux status line and the desktop
notification. To show the text some other way, set the two commands to your own. They get:

- `$AUTO_MODE_RED_TEXT`: the text, one part per line (`noticeCommand` only)
- `$AUTO_MODE_RED_PANE`: `1` if the side pane is showing, else `0` (`noticeCommand` only)
- `$AUTO_MODE_RED_ID`: an id for the command, the same in both
- `$AUTO_MODE_RED_ROOT`: the plugin's folder

It is a hooks module (Claude Code's function hooks, still early access), tested with
Claude Code 2.1.325 in a terminal.

## Development

Run a session with a checkout loaded, without installing it (edits reload as you save):

```
claude --plugin-dir ~/src/claude-auto-mode-red
```

Validate and run the tests:

```
claude plugin validate .
claude plugin test .
```
