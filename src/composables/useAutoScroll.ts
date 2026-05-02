import { watch, nextTick, ref, type Ref } from 'vue'

/**
 * 自动滚动到底部
 * 监听数组变化后自动将容器滚动到最底部。
 * 当用户手动向上滚动时暂停自动滚动，滚回底部后恢复。
 *
 * @param source - 被监听的响应式数组
 * @param containerRef - 滚动容器的模板引用
 */
export function useAutoScroll<T>(source: Ref<T[]>, containerRef: Ref<HTMLElement | null>) {
  const userScrolledUp = ref(false)

  const isNearBottom = (el: HTMLElement) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const scrollToBottom = () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
      userScrolledUp.value = false
    }
  }

  const onScroll = () => {
    if (containerRef.value) {
      userScrolledUp.value = !isNearBottom(containerRef.value)
    }
  }

  watch(containerRef, (el, _prev, onCleanup) => {
    if (el) {
      el.addEventListener('scroll', onScroll)
      onCleanup(() => el.removeEventListener('scroll', onScroll))
    }
  })

  watch(
    source,
    async () => {
      await nextTick()
      if (containerRef.value && !userScrolledUp.value) {
        containerRef.value.scrollTop = containerRef.value.scrollHeight
      }
    },
    { deep: true },
  )

  return { scrollToBottom }
}
