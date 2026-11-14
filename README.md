# claude-auto-mode-red

A [Claude Code](https://claude.com/claude-code) plugin that highlights in red the part of
a command that got it blocked by the auto mode classifier, even when it is one line deep in
a long script. The "Blocked by auto mode" line under the command also turns red and gives
the classifier's reason.

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

## What it changes

- A blocked Bash command is redrawn with the risky part in bold red. Long commands are cut
  down to the first line and the lines around each red part (ctrl+o shows all of it).
- The "Blocked by auto mode" line under it is drawn in red, with the classifier's reason,
  and a dim reminder that `/permissions` lists recent blocks.
- A collapsed group of calls ("Ran 3 commands") that holds a blocked call is drawn with
  each call on its own row, so the block can't hide inside the summary.

Only calls auto mode actually blocked are restyled. Permission dialogs aren't, because
Claude Code doesn't let plugins draw those.

The classifier blocks a command as a whole and gives only a category as its reason, so the
plugin works out the risky part itself, and can get it wrong:

1. It matches a list of risky shapes (`curl … | sh`, `sudo`, `rm -rf`, `git push --force`,
   reads of SSH keys, and so on: `hooks/patterns.ts`).
2. If none match, it asks a small model (Haiku by default) which part caused the block.
   That is one short request per such block, and delays the block's report by a moment.
3. If that finds nothing either, the whole command is drawn in red.

## Options

Set these in `/plugin` (under the plugin's options) or `/config`:

| Option | Default | What it does |
| --- | --- | --- |
| `modelFallback` | on | Ask a model when no pattern matches. Off: the whole command goes red instead. |
| `model` | `haiku` | The model asked: an alias or a full model id. |
| `extraPatterns` | none | More regular expressions to highlight, separated by ` ;; `, e.g. `terraform\s+apply ;; \bprod-db\b`. |

Blocks are recognized from the `PermissionDenied` hook event, which fires only when auto
mode denies a call. For a session resumed from before the plugin was installed, it falls
back to matching the denial message the model received, with the patterns alone.

It is a hooks module (Claude Code's function hooks, still early access), tested with
Claude Code 2.1.325.

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
