import { atom, read, update } from 'claude-code'
import type { Register, StateDollar } from 'claude-code'

import type { Blocked } from '../types'

// The start of what the model reads for a call the classifier blocked, which
// is all a session resumed from before this mod loaded has to go on.
const MARKER = 'denied by the Claude Code auto mode classifier'

const blocked = atom({ plugin: 'auto-mode-red', key: 'blocked' } as const, {} as Blocked)

function textOf(output: unknown): string | undefined {
  if (typeof output === 'string') {
    return output
  }
  if (Array.isArray(output)) {
    return output.map(textOf).filter(t => t !== undefined).join('\n')
  }
  if (typeof output === 'object' && output !== null && 'text' in output) {
    return typeof output.text === 'string' ? output.text : undefined
  }
  return undefined
}

/** Returns the classifier's reason for blocking the call ('' if it gave none),
 * or undefined if the classifier did not block it.
 */
async function blockReason(
  $: StateDollar,
  toolUseId: string | undefined,
  output: unknown,
): Promise<string | undefined> {
  if (toolUseId !== undefined) {
    const reason = (await read($, blocked))[toolUseId]
    if (reason !== undefined) {
      return reason
    }
  }
  const text = textOf(output)
  const at = text?.indexOf(MARKER) ?? -1
  if (text === undefined || at < 0) {
    return undefined
  }
  return /Reason: ([^\n]*)/.exec(text.slice(at))?.[1]?.trim() ?? ''
}

export const register: Register = on => {
  on('classic.PermissionDenied', async ($, e, next) => {
    const reason = e.reason.split('\n')[0]?.trim() ?? ''
    await update($, blocked, map => ({ ...map, [e.tool_use_id]: reason }))

    return next(e)
  }).catch(($, e, next) => next(e))

  // The call's own row, inside a red border.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if ((await blockReason($, e.props.tool_use_id, e.props.output)) === undefined) {
      return next(e)
    }
    const { Box } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" borderStyle="round" borderColor="error">
        {await next(e)}
      </Box>
    )
  })

  // The engine's dim "Blocked by auto mode" line under it, redrawn in red.
  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const reason = await blockReason($, e.props.tool_use_id, e.props.output)
    if (reason === undefined) {
      return next(e)
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Text dimColor>{'  ⎿  '}</Text>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Text color="error">
            <Text bold>Blocked by auto mode</Text>
            {reason === '' ? '' : `: ${reason}`}
          </Text>
          <Text dimColor>/permissions to review</Text>
        </Box>
      </Box>
    )
  })

  // A collapsed group ("Ran 3 commands") would hide the blocked call's row, so
  // such a group is drawn with each call on its own row.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    if (e.props.isExpanded) {
      return next(e)
    }
    for (const call of e.props.calls) {
      if ((await blockReason($, call.tool_use_id, call.output)) !== undefined) {
        return next({ ...e, props: { ...e.props, isExpanded: true } })
      }
    }
    return next(e)
  })
}
