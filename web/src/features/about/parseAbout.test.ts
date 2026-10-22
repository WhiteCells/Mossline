import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAbout } from './parseAbout.ts'

test('关于页接受空正文并拒绝非文本内容', () => {
  assert.deepEqual(parseAbout({ content: '' }), { content: '' })
  assert.throws(() => parseAbout({ content: {} }), /无效的关于页数据/)
})
