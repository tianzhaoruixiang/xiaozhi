export type ParticipantConfirmationStatus = 'pending' | 'confirmed'

export interface ParticipantConfirmation {
  participantId: string
  status: ParticipantConfirmationStatus
  confirmedAt?: string
}

export interface ConfirmationActivity {
  id: number
  time: string
  title: string
  detail: string
  type: 'running' | 'success' | 'info'
}
