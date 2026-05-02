import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 右键上下文菜单组合式函数
 * 提供菜单显示/隐藏控制，以及点击外部关闭的功能。
 * 使用模块级单例 listener + Set 支持多实例并存。
 */
let listenerCount = 0
const closeMenus = new Set<() => void>()

function ensureGlobalListener() {
  if (listenerCount > 0) return
  document.addEventListener('click', onGlobalClick)
}

function teardownGlobalListener() {
  if (listenerCount > 0) return
  document.removeEventListener('click', onGlobalClick)
}

function onGlobalClick() {
  // 遍历关闭所有打开的菜单（用副本遍历，因为 close 会修改 Set）
  const pending = Array.from(closeMenus)
  closeMenus.clear()
  pending.forEach((close) => close())
}

export function useContextMenu() {
  const menuVisible = ref(false)

  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation()
    if (menuVisible.value) {
      closeMenu()
    } else {
      menuVisible.value = true
      closeMenus.add(closeMenu)
    }
  }

  const closeMenu = () => {
    menuVisible.value = false
    closeMenus.delete(closeMenu)
  }

  onMounted(() => {
    listenerCount++
    ensureGlobalListener()
  })

  onUnmounted(() => {
    listenerCount--
    teardownGlobalListener()
    closeMenus.delete(closeMenu)
    menuVisible.value = false
  })

  return { menuVisible, toggleMenu, closeMenu }
}
