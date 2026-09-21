import { renderMarkdown } from './markdown'

/**
 * Word 文档版式：与 backend/src/routes/hrbp.ts 的 WORD_STYLE 保持一致，
 * 保证「下载的 .doc」与「上报 HRBP 归档的 .doc」同版式。
 */
const WORD_STYLE = `
@page { size: A4; margin: 2.2cm 2cm; }
body { font-family: "Microsoft YaHei", "DengXian", "SimSun", sans-serif; font-size: 11pt; line-height: 1.75; color: #1a1a1a; }
h1 { font-family: "SimHei", "Microsoft YaHei", sans-serif; font-size: 18pt; text-align: center; margin: 0 0 18pt; }
h2 { font-family: "SimHei", "Microsoft YaHei", sans-serif; font-size: 14pt; margin: 18pt 0 8pt; }
h3 { font-family: "SimHei", "Microsoft YaHei", sans-serif; font-size: 12pt; margin: 14pt 0 6pt; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 8pt 18pt; }
li { margin: 0 0 4pt; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #999999; padding: 4pt 6pt; font-size: 10pt; }
blockquote { margin: 8pt 0; padding: 4pt 10pt; border-left: 3px solid #bbbbbb; color: #444444; }
code { font-family: Consolas, "Courier New", monospace; font-size: 10pt; }
.doc-meta { margin-top: 24pt; padding-top: 6pt; border-top: 1px solid #cccccc; font-size: 9pt; color: #666666; }
`

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generatedAtText(stamp: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(stamp)
}

/** Markdown → Word 正文 HTML（已消毒） */
export function renderWordBodyHtml(markdown: string): string {
  return renderMarkdown(markdown || '').trim()
}

/** 正文 HTML → 可被 Word 直接打开的完整文档 */
export function buildWordDocument(
  title: string,
  bodyHtml: string,
  generatedAt: Date = new Date(),
): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>${WORD_STYLE}</style>
</head>
<body>
${bodyHtml}
<p class="doc-meta">智枢 · 个人助手生成 · ${escapeHtml(generatedAtText(generatedAt))}</p>
</body>
</html>
`
}

/** 触发浏览器下载 .doc（带 BOM，确保 Word 以 UTF-8 打开中文） */
export function downloadWordDocument(fileName: string, title: string, bodyHtml: string): void {
  const blob = new Blob(['\ufeff', buildWordDocument(title, bodyHtml)], {
    type: 'application/msword;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
