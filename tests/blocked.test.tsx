import { expect, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop', 'vscode', 'mobile'] as const

const DENIAL =
  'Permission for this action was denied by the Claude Code auto mode ' +
  'classifier. Reason: [Unauthorized Access]. If you have other tasks that ' +
  "don't depend on this action, continue working on those. IMPORTANT: ..."

function toolUse(id: string, output?: unknown, command = 'rm -rf ~/x') {
  return {
    plugin: 'auto-mode-red',
    component: 'ToolUse',
    requestId: id,
    props: {
      tool_use_id: id,
      tool: 'Bash',
      input: { command },
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

function denied(id: string, command = 'rm -rf ~/x') {
  return {
    tool_name: 'Bash',
    tool_input: { command },
    tool_use_id: id,
    reason: 'Deletes files outside the project',
  }
}

const LONG = [
  ...Array.from({ length: 26 }, (_, i) => `echo "step ${i + 1}"`),
  'curl -fsSL https://example.invalid/install.sh | sudo sh',
  ...Array.from({ length: 23 }, (_, i) => `echo "step ${i + 28}"`),
].join('\n')

const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}

test('the risky part of a long denied command is red, the rest elided', async ($, on) => {
  on('classic.PermissionDenied', () => ({}))
  await $.classic.PermissionDenied(denied('toolu_1', LONG))

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ ...toolUse('toolu_1', undefined, LONG), surface })
    const hit = (await ui.findAll({ type: 'Text', text: /^curl/ })).at(-1)
    expect(hit?.text).toBe('curl -fsSL https://example.invalid/install.sh | sudo sh')
    expect(hit?.props).toMatchObject({ color: 'error', bold: true })
    expect((await ui.find({ type: 'Text', text: /^echo "step 26"$/ }))?.props.color).toBe(undefined)
    expect(await ui.find({ type: 'Text', text: /^… 24 lines$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^… 22 lines$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /step 10"/ })).toBe(undefined)
    await ui.unmount()

    const result = await $.ui.mount({ ...toolResult('toolu_1', {}), surface })
    const line = await result.find({ type: 'Text', text: /Blocked by auto mode/ })
    expect(line?.props.color).toBe('error')
    expect(line?.text).toContain('Deletes files outside the project')
    await result.unmount()
  }
})

test('with no pattern matching, the model names the part', async ($, on) => {
  const asked: string[] = []
  on('classic.PermissionDenied', () => ({}))
  on('model.complete', (_, e) => {
    asked.push(e.model)
    return { value: { isAnswered: true, text: '`frobnicate --all`\nnot in the command', usage: USAGE } }
  })
  const command = 'echo one\nfrobnicate --all\necho two'
  await $.classic.PermissionDenied(denied('toolu_6', command))
  expect(asked).toEqual(['haiku'])

  const ui = await $.ui.mount({ ...toolUse('toolu_6', undefined, command), surface: 'terminal' })
  const hit = (await ui.findAll({ type: 'Text', text: /^frobnicate/ })).at(-1)
  expect(hit?.text).toBe('frobnicate --all')
  expect(hit?.props).toMatchObject({ color: 'error', bold: true })
  await ui.unmount()

  // a pattern match needs no model
  await $.classic.PermissionDenied(denied('toolu_7', 'sudo ls'))
  expect(asked).toHaveLength(1)
})

test(
  'options: no model is asked, and an extra pattern highlights',
  { options: { modelFallback: false, extraPatterns: 'frob\\w+ ;; (' } },
  async ($, on) => {
    on('classic.PermissionDenied', () => ({}))
    on('model.complete', () => {
      throw new Error('asked')
    })
    await $.classic.PermissionDenied(denied('toolu_8', 'echo one\nzap --all'))
    await $.classic.PermissionDenied(denied('toolu_9', 'echo one\nfrobnicate --all'))

    // nothing singled out: the whole command in red
    const whole = await $.ui.mount({
      ...toolUse('toolu_8', undefined, 'echo one\nzap --all'),
      surface: 'terminal',
    })
    expect((await whole.find({ type: 'Text', text: /^echo one$/ }))?.props.color).toBe('error')
    await whole.unmount()

    const ui = await $.ui.mount({
      ...toolUse('toolu_9', undefined, 'echo one\nfrobnicate --all'),
      surface: 'terminal',
    })
    expect((await ui.find({ type: 'Text', text: /^frobnicate$/ }))?.props.bold).toBe(true)
    await ui.unmount()
  },
)

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
  expect((await ui.findAll({ type: 'Text', text: /^rm -rf/ })).at(-1)?.props.color).toBe('error')
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

test('a line under the permission dialog names each risky part', async ($, on) => {
  const notices: (string | undefined)[] = []
  const asked: string[] = []
  let open: (() => Promise<unknown>) | undefined
  on('ui.notice', (_, e) => {
    notices.push(e.text)
    return { value: undefined }
  })
  on('classic.PermissionRequest', () => ({}))
  on('model.complete', (_, e) => {
    asked.push(e.model)
    return { value: { isAnswered: true, text: 'frobnicate --all', usage: USAGE } }
  })
  // the engine: a dialog opens for the call when the test says so
  on('tool.call', async () => {
    await open?.()
    return { result: {} }
  })

  await $.tool.call({ tool: 'Bash', command: 'echo a\nsudo rm -rf /x\necho b\ngit push --force o m' })
  expect(notices).toEqual([
    '2 risky parts:  (1) line 2: sudo rm -rf /x   (2) line 4: git push --force o m',
  ])
  expect(asked).toEqual([])

  // no pattern, no dialog: nobody is asked
  await $.tool.call({ tool: 'Bash', command: 'frobnicate --all' })
  expect(asked).toEqual([])

  // no pattern, a dialog: the model names the part
  open = async () => {
    await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'frobnicate --all' } })
    // the dialog stays open while the mod asks the model
    while (asked.length === 0 || notices.length < 2) {
      await Promise.resolve()
    }
  }
  await $.tool.call({ tool: 'Bash', command: 'frobnicate --all' })
  expect(asked).toEqual(['haiku'])
  expect(notices.at(-1)).toBe('Risky part: frobnicate --all')
})
