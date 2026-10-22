import assert from 'node:assert/strict'
import test from 'node:test'
import { parseFriends } from './parseFriends.ts'

test('校验友链必需字段并忽略非法可选字段', () => {
  assert.deepEqual(
    parseFriends({
      items: [{ id: 1, name: '邻居', uri: 'https://example.com', logo: 7 }],
    }),
    [
      {
        id: 1,
        name: '邻居',
        uri: 'https://example.com',
        logo: undefined,
        desc: undefined,
      },
    ],
  )
  assert.throws(
    () => parseFriends({ items: [{ id: 1, name: null, uri: '/' }] }),
    /无效的友链数据/,
  )
})
