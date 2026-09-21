/** 与后端 classifyConfirmUtterance 保持一致 */
const APPROVE_RE =
  /(确认发出|确认发送|可以发|同意发|发出去|发送吧|发吧|批准|准发|确认|同意|可以|好的|行吧|就这样|通过)/
const REJECT_RE = /(先不发|不要发|先别发|暂缓|暂不|取消|驳回|不发|等等|先等等)/

export function classifyConfirmUtterance(
  text: string,
): 'approve' | 'reject' | 'unknown' {
  const t = text.trim().replace(/\s+/g, '')
  if (!t) return 'unknown'
  if (REJECT_RE.test(t)) return 'reject'
  if (APPROVE_RE.test(t)) return 'approve'
  return 'unknown'
}
