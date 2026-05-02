/**
 * StreamParser 单元测试
 */
import { describe, it, expect } from 'vitest'
import { parseSSEStream } from '../StreamParser'

/** 用字符串数组创建模拟 SSE ReadableStream */
function createMockStream(...events: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < events.length) {
        controller.enqueue(encoder.encode(events[index]!))
        index++
      } else {
        controller.close()
      }
    },
  })
}

interface TestChunk {
  type: string
  content?: string
  conversationId?: string
}

describe('parseSSEStream', () => {
  it('解析单个 data chunk', async () => {
    const stream = createMockStream('data: {"type":"chunk","content":"你好"}\n\n')
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({ type: 'chunk', content: '你好' })
  })

  it('解析多个 SSE 事件', async () => {
    const stream = createMockStream(
      'data: {"type":"chunk","content":"Hello"}\n\n',
      'data: {"type":"chunk","content":" World"}\n\n',
      'data: {"type":"end","conversationId":"abc"}\n\n',
    )
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(3)
    expect(results[0]!.content).toBe('Hello')
    expect(results[1]!.content).toBe(' World')
    expect(results[2]!.type).toBe('end')
  })

  it('数据跨多个 Uint8Array 分片到达时正确拼接', async () => {
    const encoder = new TextEncoder()
    const part1 = encoder.encode('data: {"type":"c')
    const part2 = encoder.encode('hunk","content":"split"}\n\n')

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(part1)
        controller.enqueue(part2)
        controller.close()
      },
    })
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(1)
    expect(results[0]!.content).toBe('split')
  })

  it('忽略非 data: 开头的行（注释/心跳）', async () => {
    const stream = createMockStream(
      ': heartbeat\n\n',
      'data: {"type":"chunk","content":"keep"}\n\n',
      ': another comment\n\n',
    )
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(1)
    expect(results[0]!.content).toBe('keep')
  })

  it('忽略 JSON 解析失败的行', async () => {
    const stream = createMockStream(
      'data: {broken json}\n\n',
      'data: {"type":"chunk","content":"valid"}\n\n',
    )
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(1)
    expect(results[0]!.content).toBe('valid')
  })

  it('已 abort 的信号在读取前直接退出', async () => {
    const controller = new AbortController()
    controller.abort() // 提前 abort

    // 永不结束的流（但不会被读取因为 signal 已 abort）
    const stream = new ReadableStream<Uint8Array>({
      pull() {
        // 不关闭
      },
      cancel() {},
    })
    const reader = stream.getReader()

    const results: TestChunk[] = []
    for await (const chunk of parseSSEStream<TestChunk>(reader, controller.signal)) {
      results.push(chunk)
    }

    expect(results).toHaveLength(0)
  })

  it('流读取过程中 abort 信号触发时中断', async () => {
    const controller = new AbortController()
    const encoder = new TextEncoder()

    // 先发送一个 chunk，然后阻塞
    let pulled = false
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (!pulled) {
          pulled = true
          controller.enqueue(encoder.encode('data: {"type":"chunk","content":"first"}\n\n'))
        }
        // 后续不 close，模拟阻塞流
      },
      cancel() {},
    })
    const reader = stream.getReader()

    const results: TestChunk[] = []
    const parsePromise = (async () => {
      for await (const chunk of parseSSEStream<TestChunk>(reader, controller.signal)) {
        results.push(chunk)
      }
    })()

    // 等待第一个 chunk 被解析
    await new Promise((r) => setTimeout(r, 50))
    expect(results).toHaveLength(1)

    // 在 reader.read() 阻塞时触发 abort
    controller.abort()
    await parsePromise

    // 已解析的 chunk 保留，abort 后不再有新数据
    expect(results).toHaveLength(1)
  })
})
