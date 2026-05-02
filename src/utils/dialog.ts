/**
 * 对话框工具函数
 * 封装 Element Plus 的确认对话框，简化调用方式
 * 注意：ElMessageBox 由 unplugin-auto-import 自动注入，不要手动 import，否则会干扰 ElMessage 弹窗定位
 */

interface ConfirmOptions {
  message: string
  title?: string
  confirmText?: string
  cancelText?: string
}

/**
 * 弹出确认对话框
 * @param options - 对话框配置
 * @returns 用户是否点击确认
 */
export async function confirmAction(options: ConfirmOptions): Promise<boolean> {
  try {
    await ElMessageBox.confirm(options.message, options.title || '确认', {
      confirmButtonText: options.confirmText || '确定',
      cancelButtonText: options.cancelText || '取消',
      type: 'warning',
    })
    return true
  } catch {
    return false
  }
}
