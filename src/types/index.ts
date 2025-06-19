type Status = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

type ConversationRole = 'agent' | 'user'

type MessageType = 'welcome' | 'request' | 'thinking' | 'transcription' | 'translation' | 'error'

interface Message {
  role: ConversationRole
  type: MessageType
  content: string
  jobId?: string
}

interface JobStatus {
  status: Status
  transcription?: string
  translation?: string
  error?: string
}

interface JobData {
  jobId: string;
  gcsPath?: string;
  youtubeUrl?: string;
}

interface PubSubMessage {
  data: string
}

export type { JobStatus, Message, JobData, PubSubMessage, ConversationRole }
