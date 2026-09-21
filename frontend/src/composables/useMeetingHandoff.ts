import type { MeetingHandoff } from '../types/handoff'

const apiOrigin = (import.meta.env.VITE_XIAOZHI_API_ORIGIN || '').replace(/\/$/, '')
const basePath = `${apiOrigin}/api/meeting-sessions`

export async function getMeetingHandoff(id: string): Promise<MeetingHandoff | null> {
  if (!id) return null
  try {
    const response = await fetch(`${basePath}/${encodeURIComponent(id)}`)
    if (!response.ok) return null
    return await response.json() as MeetingHandoff
  } catch {
    return null
  }
}

export async function updateMeetingHandoff(id: string, patch: Partial<MeetingHandoff>): Promise<MeetingHandoff | null> {
  if (!id) return null
  try {
    const response = await fetch(`${basePath}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!response.ok) return null
    return await response.json() as MeetingHandoff
  } catch {
    return null
  }
}
