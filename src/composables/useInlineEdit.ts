import { ref, nextTick, type Ref } from 'vue'

/**
 * 行内编辑组合式函数
 * 封装"点击 → 输入 → Enter确认 / Esc取消 / 失焦取消"的通用模式
 *
 * @param onConfirm - 确认回调，接收编辑后的值
 * @param containerRef - 编辑容器元素的模板引用，用于聚焦内部输入框
 */
export function useInlineEdit(
  onConfirm: (value: string) => void,
  containerRef?: Ref<HTMLElement | null>,
) {
  const editing = ref(false)
  const editValue = ref('')

  const startEdit = async (currentValue: string) => {
    if (editing.value) return
    editValue.value = currentValue
    editing.value = true
    await nextTick()
    const wrapper = containerRef?.value
    const input = wrapper?.querySelector('input') as HTMLInputElement | null
    input?.focus()
    input?.select()
  }

  const confirmEdit = () => {
    if (!editing.value) return
    if (editValue.value.trim()) {
      onConfirm(editValue.value.trim())
    }
    editing.value = false
    editValue.value = ''
  }

  const cancelEdit = () => {
    editing.value = false
    editValue.value = ''
  }

  return { editing, editValue, startEdit, confirmEdit, cancelEdit }
}
