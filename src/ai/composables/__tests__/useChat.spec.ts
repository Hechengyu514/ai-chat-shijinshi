/**
 * useChat 单元测试
 * 使用内存 ChatAdapter 解耦，不依赖 Pinia
 */
import { describe, it, expect, vi } from 'vitest'
import { watch } from 'vue'
import { useChat } from '../useChat'
import { createMemoryChatAdapter } from '../useChatAdapter'
import { AIClient } from '../../core/AIClient'
import type { StreamChunk } from '../../core/types'

/** 创建一个轻量 mock AIClient（不使用 vi.spyOn，避免 async generator 兼容问题） */
function mockClient(chunks: StreamChunk[], delayMs = 0): AIClient {
  return {
    streamChat: async function* () {
      for (const chunk of chunks) {
        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs))
        yield chunk
      }
    },
    chat: async () => ({ type: 'end' }),
    use: () => ({}) as AIClient,
  } as unknown as AIClient
}

describe('useChat', () => {
  it('send 添加 AI 消息并通过 adapter 持久化', async () => {
    const adapter = createMemoryChatAdapter()
    const client = mockClient([
      { type: 'chunk', content: '你好，' },
      { type: 'chunk', content: '世界！' },
      { type: 'end' },
    ])
    const { send } = useChat({ adapter, client })

    await send('c1', 'Hello')

    const messages = adapter.getMessages('c1')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.role).toBe('assistant')
    expect(messages[0]!.content).toBe('你好，世界！')
    expect(messages[0]!.isStreaming).toBe(false)
  })

  it('send 过程中 streamingContent 实时更新', async () => {
    const adapter = createMemoryChatAdapter()
    async function* slowStream() {
      yield { type: 'chunk', content: 'Part1' } as StreamChunk
      await new Promise((r) => setTimeout(r, 20))
      yield { type: 'chunk', content: 'Part2' } as StreamChunk
      await new Promise((r) => setTimeout(r, 20))
      yield { type: 'end' } as StreamChunk
    }
    const client = {
      streamChat: slowStream,
      chat: async () => ({ type: 'end' }),
      use: () => client,
    } as unknown as AIClient

    const { send, streamingContent } = useChat({ adapter, client })

    // 使用 watch 捕获中间状态
    const snapshots: string[] = []
    const unwatch = watch(streamingContent, (v) => snapshots.push(v))

    await send('c1', 'test')
    unwatch()

    // 中间状态至少包含 Part1
    expect(snapshots.some((s) => s.includes('Part1'))).toBe(true)
    // 最终 streamingContent 被清空
    expect(streamingContent.value).toBe('')
  })

  it('abort 中断流式请求并保存部分内容', async () => {
    const adapter = createMemoryChatAdapter()
    async function* abortableStream(_req: unknown, signal?: AbortSignal) {
      yield { type: 'chunk', content: 'partial...' } as StreamChunk
      await new Promise((_, reject) => {
        const onAbort = () => {
          signal?.removeEventListener('abort', onAbort)
          reject(new DOMException('用户取消', 'AbortError'))
        }
        signal?.addEventListener('abort', onAbort)
      })
    }
    const client = {
      streamChat: abortableStream,
      chat: async () => ({ type: 'end' }),
      use: () => client,
    } as unknown as AIClient

    const { send, abort, streamingContent } = useChat({ adapter, client })

    // 使用 watch 等待第一个 chunk
    const streamStarted = new Promise<void>((resolve) => {
      const unwatch = watch(streamingContent, (v) => {
        if (v.length > 0) {
          unwatch()
          resolve()
        }
      })
    })

    const sendPromise = send('c1', 'test')
    await streamStarted

    abort()
    await sendPromise

    const messages = adapter.getMessages('c1')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.isStreaming).toBe(false)
  })

  it('send 出错时保存部分内容并设置 isStreaming = false', async () => {
    const adapter = createMemoryChatAdapter()
    async function* errorStream() {
      yield { type: 'chunk', content: 'partial' } as StreamChunk
      throw new Error('网络错误')
    }
    const client = {
      streamChat: errorStream,
      chat: async () => ({ type: 'end' }),
      use: () => client,
    } as unknown as AIClient

    const onError = vi.fn()
    const { send } = useChat({ adapter, client, onError })

    await send('c1', 'test')

    const messages = adapter.getMessages('c1')
    expect(messages).toHaveLength(1)
    expect(messages[0]!.content).toContain('partial')
    expect(messages[0]!.content).toContain('[回复中断]')
    expect(messages[0]!.isStreaming).toBe(false)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('regenerate 找到前一条用户消息并重新发送', async () => {
    const adapter = createMemoryChatAdapter()
    adapter.addMessage('c1', {
      id: 'user-1',
      role: 'user',
      content: '你好',
      timestamp: 1000,
    })
    adapter.addMessage('c1', {
      id: 'ai-old',
      role: 'assistant',
      content: '旧回复',
      timestamp: 2000,
    })

    const client = mockClient([
      { type: 'chunk', content: '新回复' },
      { type: 'end' },
    ])
    const { regenerate } = useChat({ adapter, client })

    await regenerate('c1', 'ai-old')

    const messages = adapter.getMessages('c1')
    expect(messages).toHaveLength(2)
    expect(messages[0]!.id).toBe('user-1')
    expect(messages[1]!.content).toBe('新回复')
  })

  it('并发调用 send 时自动取消上一个请求', async () => {
    const adapter = createMemoryChatAdapter()
    let callCount = 0
    async function* concurrentStream(_req: unknown, signal?: AbortSignal) {
      callCount++
      if (callCount === 1) {
        yield { type: 'chunk', content: 'first...' } as StreamChunk
        await new Promise((_, reject) => {
          signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        })
      } else {
        yield { type: 'chunk', content: 'second' } as StreamChunk
        yield { type: 'end' } as StreamChunk
      }
    }
    const client = {
      streamChat: concurrentStream,
      chat: async () => ({ type: 'end' }),
      use: () => client,
    } as unknown as AIClient

    const { send } = useChat({ adapter, client })

    const p1 = send('c1', 'first')
    await new Promise((r) => setTimeout(r, 20))
    const p2 = send('c1', 'second')

    await Promise.allSettled([p1, p2])
    const messages = adapter.getMessages('c1')
    expect(messages.length).toBeGreaterThanOrEqual(1)
  })

  it('isLoading 在 send 开始时为 true，结束时为 false', async () => {
    const adapter = createMemoryChatAdapter()
    const client = mockClient([{ type: 'end' }])
    const { send, isLoading } = useChat({ adapter, client })

    expect(isLoading.value).toBe(false)
    const p = send('c1', 'test')
    expect(isLoading.value).toBe(true)
    await p
    expect(isLoading.value).toBe(false)
  })
})
