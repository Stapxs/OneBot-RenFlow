import DOMPurify, { type Config } from 'dompurify'

export function useSanitizeHtml() {
  // DOMPurify 配置：允许 CSS，但禁止 JS
  const purifyConfig: Config = {
    ADD_TAGS: ['style'], // 允许 <style>
    ALLOWED_ATTR: ['style', 'class', 'id', 'href', 'src', 'title', 'alt'],
    // 不允许事件属性（onclick 等），也不允许自定义协议
    ALLOW_UNKNOWN_PROTOCOLS: false,
  }

  // Hook：移除危险的链接和事件属性
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const name = data.attrName?.toLowerCase()
    const value = String(data.attrValue || '').toLowerCase()

    // 禁止所有 onXXX
    if (name && /^on.*/.test(name)) {
      node.removeAttribute(data.attrName!)
      return
    }

    // 禁止 javascript: data: vbscript:
    if (
      ['href', 'src'].includes(name!) &&
      /^(javascript|vbscript|data):/.test(value)
    ) {
      node.removeAttribute(data.attrName!)
      return
    }

    // 禁止 style 中的 url(javascript:...)
    if (name === 'style' && /url\s*\(\s*['"]?\s*(javascript|data|vbscript):/i.test(value)) {
      node.removeAttribute(data.attrName!)
      return
    }
  })

  const sanitize = (html: string) =>
    DOMPurify.sanitize(html, purifyConfig)

  return { sanitize }
}
