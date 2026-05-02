/**
 * SSE 流解析器
 * 将 ReadableStream 的原始字节解析为结构化事件流
 */
export async function* parseSSEStream<T = unknown>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) break

      // 竞速 reader.read() 与 abort 信号
      let result: ReadableStreamReadResult<Uint8Array>
      try {
        if (signal) {
          result = await Promise.race([
            reader.read(),
            new Promise<never>((_, reject) => {
              const onAbort = () => reject(new DOMException('已取消', 'AbortError'))
              signal.addEventListener('abort', onAbort, { once: true })
            }),
          ])
        } else {
          result = await reader.read()
        }
      } catch (e) {
        // AbortError → 正常退出
        if (e instanceof DOMException && e.name === 'AbortError') break
        throw e
      }

      if (result.done) break

      const decoded = decoder.decode(result.value, { stream: true })
      buffer += decoded

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const lines = event.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6)) as T
            yield data
          } catch {
            // 忽略解析失败的行（流式传输中可能被截断）
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}
