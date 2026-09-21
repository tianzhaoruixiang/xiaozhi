import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { Hono } from 'hono'

export const hrbpRoute = new Hono()

function reportDir() {
  const dir = process.env.HRBP_REPORT_DIR || '/data/hrbp-reports'
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

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

/** 把 HTML 正文包成 Word 可直接打开的 .doc 文档 */
function wordDocument(title: string, bodyHtml: string, stamp: Date) {
  const generatedAt = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(stamp)
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
<p class="doc-meta">智枢 · 个人助手生成 · ${escapeHtml(generatedAt)}</p>
</body>
</html>
`
}

hrbpRoute.post('/report', async (c) => {
  let body: {
    title?: string
    markdown?: string
    html?: string
    /** 前端生成的 .docx 包（base64），优先归档 */
    docxBase64?: string
    taskId?: string
    fileName?: string
    kind?: string
  }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '无效的 JSON 请求体' }, 400)
  }

  const markdown = body.markdown?.trim()
  if (!markdown) {
    return c.json({ error: 'markdown 不能为空' }, 400)
  }

  const title = (body.title || '交付方案').trim()
  const kind = (body.kind || 'report').trim()
  const stamp = new Date()
  const stampText = stamp
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  const safeBase = (body.fileName || title)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 48)
  const dir = reportDir()

  // 交付物优先归档为真正的 .docx（前端生成后 base64 上传）；
  // 其次退回 Word-HTML(.doc)，最后退回 Markdown
  const docxBase64 = body.docxBase64?.trim()
  const html = body.html?.trim()
  const ext = docxBase64 ? 'docx' : html ? 'doc' : 'md'
  const fileName = `${stampText}_${safeBase || 'report'}.${ext}`
  const filePath = join(dir, fileName)

  if (docxBase64) {
    try {
      writeFileSync(filePath, Buffer.from(docxBase64, 'base64'))
    } catch {
      return c.json({ error: 'docx 内容无效，归档失败' }, 400)
    }
  } else if (html) {
    writeFileSync(filePath, wordDocument(title, html, stamp), 'utf8')
  } else {
    const header = [
      `---`,
      `title: ${JSON.stringify(title)}`,
      `kind: ${JSON.stringify(kind)}`,
      `reportedTo: HRBP`,
      `taskId: ${JSON.stringify(body.taskId || '')}`,
      `reportedAt: ${stamp.toISOString()}`,
      `status: submitted`,
      `---`,
      ``,
    ].join('\n')
    writeFileSync(filePath, `${header}${markdown}\n`, 'utf8')
  }

  return c.json({
    ok: true,
    id: fileName,
    fileName,
    title,
    kind,
    format: ext,
    reportedTo: 'HRBP',
    reportedAt: stamp.toISOString(),
    message: ext === 'md' ? '方案已上报 HRBP' : 'Word 交付物已确认并上报 HRBP',
  })
})
