/**
 * Markdown 渲染组合式函数
 * 提供通用的 Markdown 渲染器和配置
 */
import { marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'

// 仅导入常用语言，避免 highlight.js/lib/common 拖入全部 40+ 语言
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml' // HTML
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import yaml from 'highlight.js/lib/languages/yaml'
import diff from 'highlight.js/lib/languages/diff'
import plaintext from 'highlight.js/lib/languages/plaintext'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('plaintext', plaintext)

const renderer = new Renderer()

renderer.code = function ({
  text,
  lang,
}: {
  text: string
  lang?: string
}): string {
  const language = lang || ''
  // 用 plaintext 回退，避免 highlightAuto 遍历所有语言
  const highlighted = hljs.highlight(text, {
    language: language && hljs.getLanguage(language) ? language : 'plaintext',
  }).value
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${language || 'code'}</span>
      <button class="code-copy-btn" data-code="${encodeURIComponent(text)}">复制</button>
    </div>
    <pre><code>${highlighted}</code></pre>
  </div>`
}

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

marked.use({ renderer })

export function useMarkdown() {
  const renderMarkdown = (text: string): string => {
    const raw = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(raw.trimEnd(), {
      ADD_ATTR: ['target', 'rel', 'data-code'],
    })
  }

  return { renderMarkdown }
}
