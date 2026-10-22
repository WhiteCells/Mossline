import assert from 'node:assert/strict'
import { afterEach, beforeEach, mock, test } from 'node:test'
import { ApiError, apiGet } from './api.ts'

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { location: { origin: 'http://localhost:5173' } },
  })
})

afterEach(() => {
  mock.restoreAll()
  Reflect.deleteProperty(globalThis, 'window')
})

test('解包接口数据并保留有效查询参数和取消信号', async () => {
  const controller = new AbortController()
  const fetchMock = mock.method(globalThis, 'fetch', async () =>
    Response.json({ code: 200, data: { id: 1 } }),
  )
  const result = await apiGet('/api/post', {
    query: {
      q: '中文 & TS',
      page: 0,
      active: false,
      empty: '',
      missing: undefined,
      nil: null,
    },
    signal: controller.signal,
  })
  assert.deepEqual(result, { id: 1 })
  const call = fetchMock.mock.calls[0]
  assert.ok(call)
  const [path, options] = call.arguments
  const url = new URL(String(path), 'http://localhost:5173')
  assert.equal(url.searchParams.get('q'), '中文 & TS')
  assert.equal(url.searchParams.get('page'), '0')
  assert.equal(url.searchParams.get('active'), 'false')
  assert.equal(url.searchParams.has('empty'), false)
  assert.equal(url.searchParams.has('missing'), false)
  assert.equal(url.searchParams.has('nil'), false)
  assert.equal(options?.signal, controller.signal)
})

test('HTTP 和业务错误均保留服务端消息与状态', async () => {
  mock.method(globalThis, 'fetch', async () =>
    Response.json({ code: 403, msg: '无权访问' }, { status: 403 }),
  )
  await assert.rejects(apiGet('/api/post'), {
    name: 'ApiError',
    message: '无权访问',
    status: 403,
  })
  mock.method(globalThis, 'fetch', async () =>
    Response.json({ code: 409, msg: '内容冲突' }),
  )
  await assert.rejects(apiGet('/api/post'), {
    name: 'ApiError',
    message: '内容冲突',
    status: 409,
  })
})

test('拒绝非 JSON、缺失状态码和无效状态码响应', async () => {
  for (const payload of [null, {}, { code: '200', data: [] }, { code: null }]) {
    mock.method(globalThis, 'fetch', async () => Response.json(payload))
    await assert.rejects(apiGet('/api/post'), /无效的响应格式/)
  }
  mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>proxy error</html>'),
  )
  await assert.rejects(apiGet('/api/post'), /无效的响应格式/)
})

test('区分网络错误与主动取消', async () => {
  mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('offline')
  })
  await assert.rejects(
    apiGet('/api/post'),
    (error: unknown) => error instanceof ApiError && error.status === 0,
  )
  const aborted = new DOMException('cancelled', 'AbortError')
  mock.method(globalThis, 'fetch', async () => {
    throw aborted
  })
  await assert.rejects(
    apiGet('/api/post'),
    (error: unknown) => error === aborted,
  )
})
