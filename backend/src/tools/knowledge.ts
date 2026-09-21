import {
  MEETING_ARCHIVES,
  type MeetingArchiveDoc,
} from '../data/meetingKnowledge.js'

export type { MeetingArchiveDoc }

function scoreDoc(doc: MeetingArchiveDoc, query: string): number {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const tokens = q.split(/[\s,，、；;]+/).filter(Boolean)
  const hay = [
    doc.title,
    doc.meetingType,
    doc.summary,
    ...doc.topics,
    ...doc.keywords,
    ...doc.decisions,
    ...doc.attendees,
    String(doc.year),
    doc.date,
  ]
    .join(' ')
    .toLowerCase()

  let score = 0
  for (const t of tokens) {
    if (hay.includes(t)) score += 3
    if (doc.keywords.some((k) => k.toLowerCase().includes(t))) score += 2
    if (doc.topics.some((k) => k.toLowerCase().includes(t))) score += 2
    if (doc.title.toLowerCase().includes(t)) score += 4
  }
  return score
}

export function searchMeetingArchives(options: {
  query: string
  year?: number
  meetingType?: string
  limit?: number
}): Array<MeetingArchiveDoc & { score: number }> {
  const limit = options.limit ?? 5
  let list = [...MEETING_ARCHIVES]

  if (options.year) {
    list = list.filter((d) => d.year === options.year)
  }
  if (options.meetingType) {
    const t = options.meetingType.toLowerCase()
    list = list.filter((d) => d.meetingType.toLowerCase().includes(t))
  }

  const ranked = list
    .map((d) => ({ ...d, score: scoreDoc(d, options.query) }))
    .filter((d) => (options.query.trim() ? d.score > 0 : true))
    .sort((a, b) => b.score - a.score || b.year - a.year)
    .slice(0, limit)

  // 无关键词命中时，按年份倒序返回近期资料
  if (!ranked.length && !options.query.trim()) {
    return list
      .sort((a, b) => b.year - a.year)
      .slice(0, limit)
      .map((d) => ({ ...d, score: 1 }))
  }

  if (!ranked.length) {
    return list
      .sort((a, b) => b.year - a.year)
      .slice(0, Math.min(3, limit))
      .map((d) => ({ ...d, score: 0 }))
  }

  return ranked
}

export function getMeetingArchiveById(id: string): MeetingArchiveDoc | null {
  return MEETING_ARCHIVES.find((d) => d.id === id) ?? null
}

export function formatArchiveBrief(doc: MeetingArchiveDoc): string {
  return [
    `【${doc.date} · ${doc.meetingType}】${doc.title}`,
    `议题：${doc.topics.join('、')}`,
    `摘要：${doc.summary}`,
    `决议：${doc.decisions.map((d, i) => `${i + 1}.${d}`).join('；')}`,
    `附件：${doc.attachments.join('、')}`,
  ].join('\n')
}

export function compileMeetingBackground(docs: MeetingArchiveDoc[]): string {
  if (!docs.length) {
    return '（未检索到相关历年会议资料）'
  }
  return docs
    .map(
      (d, i) => `### ${i + 1}. ${d.title}（${d.date}）
- 类型：${d.meetingType}
- 议题：${d.topics.join('、')}
- 背景摘要：${d.summary}
- 关键决议：
${d.decisions.map((x) => `  - ${x}`).join('\n')}
- 参考附件：${d.attachments.join('、')}`,
    )
    .join('\n\n')
}
