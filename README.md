# claude-auto-mode-red

A [Claude Code](https://claude.com/claude-code) plugin that shows tool calls the auto mode
classifier blocked in red, so they stand out from the dim lines around them. Each blocked
call gets a red border, and the "Blocked by auto mode" line under it turns red and gives
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

- The blocked call's row gets a red rounded border.
- The "Blocked by auto mode" line under it is drawn in red, with the classifier's reason,
  and a dim reminder that `/permissions` lists recent blocks.
- A collapsed group of calls ("Ran 3 commands") that holds a blocked call is drawn with
  each call on its own row, so the block can't hide inside the summary.

Only calls auto mode actually blocked are restyled. Permission dialogs aren't, because
Claude Code doesn't let plugins draw those.

Blocks are recognized from the `PermissionDenied` hook event, which fires only when auto
mode denies a call. For a session resumed from before the plugin was installed, it falls
back to matching the denial message the model received.

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
