/**
 * 移动端侧边栏抽屉逻辑
 * 管理折叠状态、遮罩显示
 */
import { ref, computed, watch } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'

export function useSidebarDrawer() {
  const { isMobile } = useBreakpoint(768)

  const isCollapsed = ref(false)
  const isUserCollapsed = ref(false)

  // 移动端自动折叠
  watch(
    isMobile,
    (mobile) => {
      if (mobile) {
        isCollapsed.value = true
      } else if (!isUserCollapsed.value) {
        isCollapsed.value = false
      }
    },
    { immediate: true },
  )

  const showBackdrop = computed(() => isMobile.value && !isCollapsed.value)

  function expand() {
    isCollapsed.value = false
    isUserCollapsed.value = false
  }

  function collapse() {
    isCollapsed.value = true
    isUserCollapsed.value = true
  }

  function closeDrawer() {
    collapse()
  }

  return {
    isMobile,
    isCollapsed,
    showBackdrop,
    expand,
    collapse,
    closeDrawer,
  }
}
