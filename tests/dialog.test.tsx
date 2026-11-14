import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const LONG = [
  ...Array.from({ length: 23 }, (_, i) => `echo "step ${i + 1}"`),
  'sudo rm -rf --no-preserve-root /nonexistent',
  'echo "step 25"',
  'git push --force no-such-remote master',
  ...Array.from({ length: 24 }, (_, i) => `echo "step ${i + 27}"`),
].join('\n')

const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
}

type Run = { argv: readonly string[]; env?: Record<string, string> }

/** Stands for the engine: a Bash call for which `whileOpen` runs while its
 * permission dialog is open, and the calls the mod makes on `$` meanwhile.
 */
function engine(
  $: Parameters<TestBody>[0],
  on: Parameters<TestBody>[1],
  whileOpen?: (id: string) => Promise<void>,
) {
  const seen = { runs: [] as Run[], opened: 0, closed: 0, placed: [] as string[], asked: [] as string[] }
  let isPaneOpen = false
  on('command.register', () => ({ value: { command: 'risky' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('classic.PermissionRequest', () => ({}))
  on('ui.place', (_, e) => {
    seen.placed.push(e.id)
    return { value: { isPlaced: true, requestId: e.id } }
  })
  on('ui.panes', () => ({
    value: isPaneOpen
      ? [{ id: 'risky', title: 'Risky parts', isShown: true, isFocused: false, isPlaced: true }]
      : [],
  }))
  on('ui.open', () => {
    seen.opened += 1
    isPaneOpen = true
    return { value: { isPlaced: true } }
  })
  on('ui.close', () => {
    seen.closed += 1
    isPaneOpen = false
    return { value: undefined }
  })
  on('process.run', (_, e) => {
    seen.runs.push({ argv: e.argv, env: e.init?.env })
    return {
      value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false },
    }
  })
  on('model.complete', (_, e) => {
    seen.asked.push(e.model)
    return { value: { isAnswered: true, text: '`frobnicate --all`\nnot in the command', usage: USAGE } }
  })
  on('tool.call', async (_, e) => {
    if (whileOpen !== undefined && e.tool === 'Bash') {
      await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: e.command } })
      await whileOpen(e.tool_use_id)
    }
    return { result: {} }
  })
  return seen
}

function row(id: string, command: string) {
  return {
    plugin: 'auto-mode-red',
    component: 'ToolUse',
    requestId: id,
    surface: 'terminal',
    props: {
      tool_use_id: id,
      tool: 'Bash',
      input: { command },
      isRunning: true,
      isErrored: false,
      isInterrupted: false,
    },
  } as const
}

test('a risky command that runs with no dialog shows nothing', async ($, on) => {
  const seen = engine($, on)
  await $.tool.call({ tool: 'Bash', command: LONG })
  expect(seen).toMatchObject({ runs: [], opened: 0, placed: [], asked: [] })
})

test('while the dialog is open the risky parts are named, then taken back', async ($, on) => {
  let drawn = 0
  const seen = engine($, on, async id => {
    // wait for the mod to have shown everything
    while (seen.runs.length === 0) {
      await Promise.resolve()
    }
    const placed = await $.ui.mount({
      plugin: 'auto-mode-red',
      component: 'Placed',
      requestId: id,
      surface: 'terminal',
      props: { id, plugin: 'auto-mode-red' },
    })
    const lines = (await placed.findAll({ type: 'Text' })).map(found => found.text)
    expect(lines).toEqual([
      '2 risky parts:',
      '(1) line 24/50: sudo rm -rf …',
      '(2) line 26/50: git push --force …',
    ])
    expect((await placed.find({ type: 'Text' }))?.props).toMatchObject({ color: 'error', bold: true })
    await placed.unmount()

    const ui = await $.ui.mount(row(id, LONG))
    const hit = (await ui.findAll({ type: 'Text', text: /^sudo rm/ })).at(-1)
    expect(hit?.text).toBe('sudo rm -rf --no-preserve-root /nonexistent')
    expect(hit?.props).toMatchObject({ color: 'error', bold: true })
    expect(await ui.find({ type: 'Text', text: /^… 21 lines$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /step 10"/ })).toBe(undefined)
    await ui.unmount()
    drawn += 1
  })

  await $.tool.call({ tool: 'Bash', command: LONG })
  expect(drawn).toBe(1)
  expect(seen.asked).toEqual([])
  expect(seen).toMatchObject({ opened: 1, closed: 1 })
  expect(seen.runs.map(run => run.argv[2])).toEqual([
    'sh "$AUTO_MODE_RED_ROOT/scripts/notice.sh" show',
    'sh "$AUTO_MODE_RED_ROOT/scripts/notice.sh" clear',
  ])
  expect(seen.runs[0]?.env).toMatchObject({
    AUTO_MODE_RED_TEXT: '2 risky parts:\n(1) line 24/50: sudo rm -rf …\n(2) line 26/50: git push --force …',
    AUTO_MODE_RED_PANE: '1',
  })
})

test('with no pattern matching, the model names the part once a dialog opens', async ($, on) => {
  const seen = engine($, on, async () => {
    while (seen.runs.length === 0) {
      await Promise.resolve()
    }
  })
  await $.tool.call({ tool: 'Bash', command: 'echo one\nfrobnicate --all' })
  expect(seen.asked).toEqual(['haiku'])
  expect(seen.runs[0]?.env?.AUTO_MODE_RED_TEXT).toBe('Risky part: line 2/2: frobnicate --all')
})

test(
  'options: no model, no commands, an extra pattern',
  { options: { modelFallback: false, noticeCommand: '', extraPatterns: 'frob\\w+ ;; (' } },
  async ($, on) => {
    const seen = engine($, on, async () => {
      while (seen.placed.length === 0) {
        await Promise.resolve()
      }
    })
    await $.tool.call({ tool: 'Bash', command: 'frobnicate --all' })
    expect(seen).toMatchObject({ asked: [], runs: [], opened: 1 })

    // nothing matches and no model: the call goes straight through
    const quiet = seen.placed.length
    await $.tool.call({ tool: 'Bash', command: 'zap --all' }).catch(() => undefined)
    expect(seen.placed).toHaveLength(quiet)
  },
)
