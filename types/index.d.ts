/** The auto mode classifier's reason for each call it blocked, by tool_use_id. */
export type Blocked = Readonly<Record<string, string>>

declare module 'claude-code' {
  interface PluginState {
    'auto-mode-red': { blocked: Blocked }
  }
}
