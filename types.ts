export interface TranscriptionEntry {
  speaker: 'user' | 'bot';
  text: string;
}

export interface User {
  email: string;
  password?: string; // Should be hashed in a real app
  isAdmin: boolean;
  isSocial?: boolean; // Flag for simulated social logins
  mfaEnabled?: boolean; // User preference for MFA
  mobile?: string;
  countryCode?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  history: TranscriptionEntry[];
}

export interface UserChatHistory {
  userEmail: string;
  sessions: ChatSession[];
}

export interface KnowledgeFile {
  name: string;
  type: string;
  content: string; // Base64 encoded content for PDFs, raw for text
}
