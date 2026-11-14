/** One call the auto mode classifier blocked. */
export type BlockedCall = {
  /** The classifier's reason, '' if it gave none. */
  reason: string
  /** The parts of the command a model named as the cause, verbatim. */
  snippets?: readonly string[]
}

/** The blocked calls by tool_use_id (a bare string is version 0.1's reason). */
export type Blocked = Readonly<Record<string, BlockedCall | string>>

declare module 'claude-code' {
  interface PluginState {
    'auto-mode-red': { blocked: Blocked }
  }
}
