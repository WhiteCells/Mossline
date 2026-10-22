export interface MomentAttachment {
  id: string | number
  name: string
  url: string
  mime_type: string
}
export interface Moment {
  id: string | number
  content: string
  visibility: 'public' | 'private' | 'unlisted'
  published_at: string | null
  created_at: string
  attachments: MomentAttachment[]
}
