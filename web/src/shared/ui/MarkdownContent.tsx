import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'

const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ['className', 'math-inline', 'math-display'],
    ],
  },
}

interface MarkdownContentProps {
  children?: string | null
}

/** 先清理用户内容，再渲染受信任的 KaTeX 标记，保留公式所需的 MathML */
export function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeSanitize, markdownSchema], rehypeKatex]}
        components={{
          a: ({ href, children: label }) => (
            <a
              href={href}
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noreferrer' : undefined}
            >
              {label}
            </a>
          ),
          img: ({ alt, ...props }) => (
            <img {...props} alt={alt || ''} loading="lazy" />
          ),
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  )
}
