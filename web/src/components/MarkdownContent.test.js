import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

let markdownContent
let vite

before(async () => {
  vite = await createServer({
    appType: 'custom',
    logLevel: 'silent',
    server: { hmr: false, middlewareMode: true },
  })
  const module = await vite.ssrLoadModule('/src/components/MarkdownContent.jsx')
  markdownContent = module.MarkdownContent
})

after(async () => {
  await vite?.close()
})

function render(markdown) {
  return renderToStaticMarkup(createElement(markdownContent, null, markdown))
}

test('renders inline math with KaTeX and accessible MathML', () => {
  const html = render(String.raw`Euler 恒等式：$e^{i\pi}+1=0$。`)

  assert.match(html, /class="katex"/)
  assert.match(html, /<math/)
  assert.match(html, /encoding="application\/x-tex"/)
  assert.match(html, /e\^\{i\\pi\}\+1=0/)
})

test('renders display math in a scrollable KaTeX block', () => {
  const html = render(String.raw`$$
\int_0^1 x^2 \, dx
$$`)

  assert.match(html, /class="katex-display"/)
  assert.match(html, /class="katex"/)
  assert.match(html, /<math[^>]*display="block"/)
  assert.match(html, /\\int_0\^1 x\^2 \\, dx/)
})
