/**
 * Markdown → 真正的 .docx（OOXML 包）。
 * 纯前端实现：用 zip.ts 打包，不引入 docx / jszip 等依赖。
 */
import { renderMarkdown } from './markdown'
import { createZipBlob, type ZipEntry } from './zip'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface RunStyle {
  bold?: boolean
  italic?: boolean
  mono?: boolean
  /** 半磅值：22 = 11pt */
  size?: number
  color?: string
  font?: string
}

function run(text: string, style: RunStyle): string {
  if (!text) return ''
  const props: string[] = []
  if (style.font) {
    props.push(
      `<w:rFonts w:ascii="${style.font}" w:hAnsi="${style.font}" w:eastAsia="${style.font}"/>`,
    )
  }
  if (style.bold) props.push('<w:b/>')
  if (style.italic) props.push('<w:i/>')
  if (style.size) props.push(`<w:sz w:val="${style.size}"/><w:szCs w:val="${style.size}"/>`)
  if (style.color) props.push(`<w:color w:val="${style.color}"/>`)
  const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function para(runsXml: string, pPr = ''): string {
  const props = pPr ? `<w:pPr>${pPr}</w:pPr>` : ''
  return `<w:p>${props}${runsXml}</w:p>`
}

const LINE = '<w:spacing w:after="120" w:line="340" w:lineRule="auto"/>'

/** 行内内容 → run 序列（strong/em/code/br 映射为对应字形） */
function inlineRuns(node: Node, style: RunStyle): string {
  let out = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += run(child.textContent ?? '', style)
      return
    }
    if (child.nodeType !== 1) return
    const el = child as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'ul' || tag === 'ol') return // 嵌套列表单独处理
    if (tag === 'br') {
      out += '<w:r><w:br/></w:r>'
      return
    }
    const next: RunStyle = { ...style }
    if (tag === 'strong' || tag === 'b') next.bold = true
    if (tag === 'em' || tag === 'i') next.italic = true
    if (tag === 'code') {
      next.mono = true
      next.font = 'Consolas'
      next.size = 20
    }
    if (tag === 'a') next.color = '1A7A92'
    out += inlineRuns(el, next)
  })
  return out
}

function tableXml(el: Element): string {
  const rows = Array.from(el.querySelectorAll('tr'))
  if (!rows.length) return ''
  const colCount = Math.max(
    1,
    ...rows.map((row) => row.querySelectorAll('th, td').length),
  )
  const width = Math.floor(5000 / colCount)
  const borders =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`)
      .join('') +
    '</w:tblBorders>'

  const body = rows
    .map((row) => {
      const cells = Array.from(row.querySelectorAll('th, td'))
      const header = cells.some((cell) => cell.tagName.toLowerCase() === 'th')
      const tcs = cells
        .map((cell) => {
          const cellPara = para(
            inlineRuns(cell, { bold: header, size: 20 }),
            '<w:spacing w:after="0"/>',
          )
          const shading = header
            ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F5F7"/>'
            : ''
          return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="pct"/>${shading}</w:tcPr>${cellPara}</w:tc>`
        })
        .join('')
      return `<w:tr>${tcs}</w:tr>`
    })
    .join('')

  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${borders}</w:tblPr>${body}</w:tbl>${para('')}`
}

function listXml(el: Element, depth = 0): string {
  const ordered = el.tagName.toLowerCase() === 'ol'
  const indent = 420 + depth * 300
  let out = ''
  let index = 0
  Array.from(el.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== 'li') return
    index += 1
    const prefix = ordered ? `${index}. ` : '• '
    const nested = Array.from(child.children).filter((c) =>
      ['ul', 'ol'].includes(c.tagName.toLowerCase()),
    )
    const itemXml = para(
      run(prefix, {}) + inlineRuns(child, {}),
      `<w:ind w:left="${indent}" w:hanging="260"/><w:spacing w:after="60"/>`,
    )
    out += itemXml
    for (const sub of nested) out += listXml(sub, depth + 1)
  })
  return out
}

function blockXml(el: Element): string {
  const tag = el.tagName.toLowerCase()
  switch (tag) {
    case 'h1':
      return para(
        inlineRuns(el, { bold: true, size: 36, font: 'SimHei' }),
        '<w:jc w:val="center"/><w:spacing w:after="240"/>',
      )
    case 'h2':
      return para(
        inlineRuns(el, { bold: true, size: 28, font: 'SimHei' }),
        '<w:spacing w:before="240" w:after="120"/>',
      )
    case 'h3':
      return para(
        inlineRuns(el, { bold: true, size: 24, font: 'SimHei' }),
        '<w:spacing w:before="200" w:after="100"/>',
      )
    case 'h4':
    case 'h5':
    case 'h6':
      return para(
        inlineRuns(el, { bold: true, size: 22 }),
        '<w:spacing w:before="160" w:after="80"/>',
      )
    case 'ul':
    case 'ol':
      return listXml(el)
    case 'table':
      return tableXml(el)
    case 'blockquote':
      return para(
        inlineRuns(el, { italic: true, color: '444444' }),
        '<w:ind w:left="360"/><w:spacing w:after="120"/>',
      )
    case 'pre':
      return para(
        run(el.textContent ?? '', { mono: true, font: 'Consolas', size: 20 }),
        '<w:shd w:val="clear" w:color="auto" w:fill="F5F7F9"/><w:spacing w:after="120"/>',
      )
    case 'hr':
      return para(
        '',
        '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr>',
      )
    default:
      return para(inlineRuns(el, {}), LINE)
  }
}

function bodyXml(html: string): string {
  const doc = new DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html',
  )
  let out = ''
  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      const text = (node.textContent ?? '').trim()
      if (text) out += para(run(text, {}), LINE)
      return
    }
    if (node.nodeType !== 1) return
    out += blockXml(node as Element)
  })
  return out
}

function stampText(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** 组装 .docx 包内的各部件 */
export function buildDocxEntries(
  title: string,
  bodyHtml: string,
  generatedAt: Date = new Date(),
): ZipEntry[] {
  const contentXml = bodyXml(bodyHtml)
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${contentXml}${para(
    run(`智枢 · 个人助手生成 · ${stampText(generatedAt)}`, {
      size: 18,
      color: '666666',
    }),
    '<w:spacing w:before="360"/><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="CCCCCC"/></w:pBdr>',
  )}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1134" w:bottom="1247" w:left="1134" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr></w:body></w:document>`

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`

  const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`

  const iso = generatedAt.toISOString()
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escapeXml(title)}</dc:title><dc:creator>智枢</dc:creator><cp:lastModifiedBy>智枢</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`

  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>智枢</Application><Company>智枢政务协同平台</Company></Properties>`

  return [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'word/document.xml', data: documentXml },
    { name: 'word/_rels/document.xml.rels', data: documentRels },
    { name: 'docProps/core.xml', data: core },
    { name: 'docProps/app.xml', data: app },
  ]
}

/** Markdown → .docx Blob */
export function buildDocxBlob(
  title: string,
  markdown: string,
  generatedAt: Date = new Date(),
): Blob {
  const bodyHtml = renderMarkdown(markdown || '')
  return createZipBlob(buildDocxEntries(title, bodyHtml, generatedAt), DOCX_MIME)
}

/** 触发浏览器下载 .docx */
export function downloadDocx(
  fileName: string,
  title: string,
  markdown: string,
): void {
  const blob = buildDocxBlob(title, markdown)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** .docx 的 base64（用于上报时随请求提交，服务端原样归档） */
export async function buildDocxBase64(
  title: string,
  markdown: string,
): Promise<string> {
  const blob = buildDocxBlob(title, markdown)
  const buffer = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk))
  }
  return btoa(binary)
}
