/**
 * Markdown 渲染组合式函数
 * 提供通用的 Markdown 渲染器和配置
 */

import { marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'

const renderer = new Renderer()

// 配置代码块渲染
renderer.code = function ({
  text,
  lang,
}: {
  text: string
  lang?: string
}): string {
  let highlighted: string
  const language = lang || ''
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(text, { language }).value
  } else {
    highlighted = hljs.highlightAuto(text).value
  }
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${language || 'code'}</span>
      <button class="code-copy-btn" data-code="${encodeURIComponent(text)}">复制</button>
    </div>
    <pre><code>${highlighted}</code></pre>
  </div>`
}

// 对所有 target="_blank" 的链接自动补齐 rel="noopener noreferrer"，防止 tabnabbing
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

marked.use({ renderer })

// 导出 Markdown 渲染函数
export function useMarkdown() {
  const renderMarkdown = (text: string): string => {
    const raw = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(raw.trimEnd(), {
      ADD_ATTR: ['target', 'rel', 'data-code'],
    })
  }

  return { renderMarkdown }
}
