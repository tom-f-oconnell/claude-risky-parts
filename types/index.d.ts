/** One Bash call with a permission dialog open. */
export type AskingCall = {
  /** The parts of the command a model named as risky, verbatim. */
  snippets: readonly string[]
  /** The lines that name the risky parts: a header, then one per part. */
  lines: readonly string[]
}

/** The Bash calls with a permission dialog open, by tool_use_id. */
export type Asking = Readonly<Record<string, AskingCall>>

declare module 'claude-code' {
  interface PluginState {
    'risky-parts': { asking: Asking }
  }
}
