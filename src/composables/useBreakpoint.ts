import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 响应式断点检测组合式函数
 * 根据窗口宽度判断当前是否为移动端
 *
 * @param breakpoint - 断点阈值（像素），默认为 768px
 * @returns { isMobile } - 是否为移动端的响应式状态
 */
export function useBreakpoint(breakpoint = 768) {
  // 是否为移动端（setup 阶段即初始化，避免首帧闪烁）
  const isMobile = ref(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  )

  // 检查窗口宽度
  const check = () => {
    isMobile.value = window.innerWidth < breakpoint
  }

  // 组件挂载时监听 resize 事件
  onMounted(() => {
    window.addEventListener('resize', check)
  })

  // 组件卸载时移除事件监听
  onUnmounted(() => {
    window.removeEventListener('resize', check)
  })

  return { isMobile }
}
