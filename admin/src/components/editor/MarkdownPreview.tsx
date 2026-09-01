import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

export interface MarkdownPreviewProps {
  value: string;
  className?: string;
  emptyText?: string;
}

const markdownSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./, "math-inline", "math-display"],
    ],
  },
};

export function MarkdownPreview({
  value,
  className = "",
  emptyText = "暂无可预览内容",
}: MarkdownPreviewProps) {
  if (!value.trim()) {
    return (
      <div className={`md-preview md-preview--empty ${className}`.trim()}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`md-preview ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // Sanitize untrusted Markdown before the trusted renderers add their
        // KaTeX/highlight markup. Raw HTML is not enabled.
        rehypePlugins={[
          [rehypeSanitize, markdownSchema],
          rehypeKatex,
          rehypeHighlight,
        ]}
        components={{
          a: ({ href, children, node: _node, ...props }) => {
            void _node;
            const external = Boolean(href && /^https?:\/\//i.test(href));
            return (
              <a
                {...props}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
          img: ({ alt, node: _node, ...props }) => {
            void _node;
            return <img {...props} alt={alt ?? ""} loading="lazy" />;
          },
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
