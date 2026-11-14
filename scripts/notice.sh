#!/bin/sh
# Shows the risky parts of a command awaiting approval outside Claude Code, and
# takes them back once the dialog is answered:
#   notice.sh show    (text in $AUTO_MODE_RED_TEXT)
#   notice.sh clear
# In tmux: the status line is replaced by the text, in red. Where the pane could not open
# ($AUTO_MODE_RED_PANE = 0) and notify-send exists: a desktop notification that
# stays until cleared. $AUTO_MODE_RED_ID names the call.
id_file="${XDG_RUNTIME_DIR:-/tmp}/auto-mode-red-${AUTO_MODE_RED_ID:-call}.notification"

case "$1" in
show)
    if [ -n "$TMUX" ] && [ -n "$TMUX_PANE" ]; then
        text=$(printf %s "$AUTO_MODE_RED_TEXT" | tr '\n' ' ' | sed 's/#/##/g')
        tmux set -t "$TMUX_PANE" status-format[0] \
            "#[fg=red,bold,bg=black,fill=black] $text"
    fi
    if [ "$AUTO_MODE_RED_PANE" = 0 ] && command -v notify-send > /dev/null; then
        notify-send -u critical -p "Claude Code: risky parts" \
            "$AUTO_MODE_RED_TEXT" > "$id_file" 2> /dev/null
    fi
    ;;
clear)
    if [ -n "$TMUX" ] && [ -n "$TMUX_PANE" ]; then
        tmux set -t "$TMUX_PANE" -u status-format
    fi
    if [ -s "$id_file" ] && command -v gdbus > /dev/null; then
        gdbus call --session --dest org.freedesktop.Notifications \
            --object-path /org/freedesktop/Notifications \
            --method org.freedesktop.Notifications.CloseNotification \
            "$(cat "$id_file")" > /dev/null 2>&1
    fi
    rm -f "$id_file"
    ;;
esac
