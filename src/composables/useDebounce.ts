import { ref, watch, type Ref } from 'vue'

/**
 * 输入防抖组合式函数
 * @param source - 被监听的响应式值
 * @param delay - 防抖延迟（ms），默认 300
 * @returns debounced 后的响应式值
 */
export function useDebounce<T>(source: Ref<T>, delay = 300): Ref<T> {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(source, (val, _oldVal, onCleanup) => {
    timer = setTimeout(() => {
      debounced.value = val
    }, delay)
    onCleanup(() => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    })
  })

  return debounced
}