import { Fragment } from "react";

/**
 * 轻量 Markdown 渲染：支持行内 `code`、```代码块```、段落。
 * 课程数据文字为纯文本，这里只做基础格式化，避免引入额外依赖。
 */
export default function Markdown({ content }: { content: string }) {
  const parts = content.split(/```/);
  return (
    <div className="text-sm text-slate-700 leading-relaxed space-y-3">
      {parts.map((part, idx) => {
        // 偶数索引 = 普通文本，奇数索引 = 代码块
        if (idx % 2 === 1) {
          // 去掉首行可能的语言标记
          const lines = part.replace(/^\n/, "").split("\n");
          if (lines.length && /^[a-zA-Z]+$/.test(lines[0].trim())) {
            lines.shift();
          }
          return (
            <pre
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto font-mono text-xs text-slate-800"
            >
              <code>{lines.join("\n").replace(/\n$/, "")}</code>
            </pre>
          );
        }
        // 普通文本：处理行内 code
        return (
          <Fragment key={idx}>
            {part.split(/\n/).map((line, li) => (
              <p key={li} className="whitespace-pre-wrap">
                {renderInline(line)}
              </p>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <code
        key={k++}
        className="bg-slate-100 text-primary px-1 py-0.5 rounded text-xs font-mono"
      >
        {m[1]}
      </code>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
