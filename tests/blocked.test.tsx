import { expect, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

const DENIAL =
  'Permission for this action was denied by the Claude Code auto mode ' +
  'classifier. Reason: [Unauthorized Access]. If you have other tasks that ' +
  "don't depend on this action, continue working on those. IMPORTANT: ..."

function toolUse(id: string, output?: unknown) {
  return {
    plugin: 'auto-mode-red',
    component: 'ToolUse',
    requestId: id,
    props: {
      tool_use_id: id,
      tool: 'Bash',
      input: { command: 'rm -rf ~/x' },
      isRunning: false,
      isErrored: output !== undefined,
      isInterrupted: false,
      output,
    },
  } as const
}

function toolResult(id: string, output: unknown) {
  return {
    plugin: 'auto-mode-red',
    component: 'ToolResult',
    requestId: id,
    props: { tool_use_id: id, tool: 'Bash', output, isErrored: true },
  } as const
}

function denied(id: string) {
  return {
    tool_name: 'Bash',
    tool_input: { command: 'rm -rf ~/x' },
    tool_use_id: id,
    reason: 'Deletes files outside the project',
  }
}

test('a call the classifier denied is drawn in a red border', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('classic.PermissionDenied', () => ({}))
  await $.classic.PermissionDenied(denied('toolu_1'))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...toolUse('toolu_1'), surface })
    const box = await ui.find({ type: 'Box' })
    expect(box?.props.borderColor).toBe('error')
    expect((await ui.find({ text: /engine/ }))?.text).toBe('engine')
    await ui.unmount()

    const result = await $.ui.mount({ ...toolResult('toolu_1', {}), surface })
    const line = await result.find({ type: 'Text', text: /Blocked by auto mode/ })
    expect(line?.props.color).toBe('error')
    expect(line?.text).toContain('Deletes files outside the project')
    await result.unmount()
  }
})

test('other calls are drawn as the engine draws them', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  on('classic.PermissionDenied', () => ({}))
  await $.classic.PermissionDenied(denied('toolu_1'))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...toolUse('toolu_2', 'Exit code 1'), surface })
    expect(await ui.drawn()).toMatchObject({ type: 'Text' })
    await ui.unmount()

    const result = await $.ui.mount({ ...toolResult('toolu_2', 'Exit code 1'), surface })
    expect((await result.find({ type: 'Text' }))?.text).toBe('engine')
    await result.unmount()
  }
})

test('a denial is recognized from its text alone, as after a resume', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  const ui = await $.ui.mount({ ...toolUse('toolu_3', DENIAL), surface: 'terminal' })
  expect((await ui.find({ type: 'Box' }))?.props.borderColor).toBe('error')
  await ui.unmount()

  const result = await $.ui.mount({ ...toolResult('toolu_3', DENIAL), surface: 'terminal' })
  const line = await result.find({ type: 'Text', text: /Blocked by auto mode/ })
  expect(line?.text).toBe('Blocked by auto mode: [Unauthorized Access]')
  await result.unmount()
})

test('a collapsed group holding a denied call is expanded', async ($, on) => {
  on('ui.render', { component: 'ToolGroup' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.isExpanded ? 'expanded' : 'collapsed'}</Text>
  })
  on('classic.PermissionDenied', () => ({}))
  await $.classic.PermissionDenied(denied('toolu_5'))

  const call = (id: string) => ({
    tool_use_id: id,
    tool: 'Bash',
    input: { command: 'ls' },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
    output: '',
  })
  const group = (ids: string[]) =>
    ({
      plugin: 'auto-mode-red',
      component: 'ToolGroup',
      requestId: ids.join(),
      surface: 'terminal',
      props: { calls: ids.map(call), isActive: false, isExpanded: false },
    }) as const

  const plain = await $.ui.mount(group(['toolu_4']))
  expect((await plain.find({ type: 'Text' }))?.text).toBe('collapsed')
  await plain.unmount()

  const withDenied = await $.ui.mount(group(['toolu_4', 'toolu_5']))
  expect((await withDenied.find({ type: 'Text' }))?.text).toBe('expanded')
  await withDenied.unmount()
})
