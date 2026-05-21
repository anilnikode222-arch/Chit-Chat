import { create } from 'zustand';

export interface ChatMessage {
  messageId: string;
  senderId: string;
  timestamp: any;
  cipherText?: string;
  iv?: string;
  tag?: string;
  decryptedText?: string;
  status: 'sent' | 'delivered' | 'seen';
  replyToMessageId?: string | null;
  reactions?: Record<string, string>;
  isEdited?: boolean;
  deleted?: boolean;
  mediaMetadata?: {
    isMedia: boolean;
    mediaUrl: string;
    mimeType: string;
    fileSize: number;
    thumbnail?: string; // base64 preview
    encryptedAesKey?: string;
    mediaIv?: string;
  };
}

export interface ChatSession {
  chatId: string;
  type: 'private' | 'group';
  members: string[];
  lastMessage?: {
    senderId: string;
    timestamp: any;
    textPreview?: string;
  };
  displayName?: string;
  photoURL?: string;
}

interface ChatState {
  chats: ChatSession[];
  activeChatId: string | null;
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, string[]>; // chatId -> list of userIds
  presenceList: Record<string, { status: 'online' | 'offline'; lastChanged: number }>;
  currentCall: any | null; // Call signaling states
  
  setChats: (chats: ChatSession[]) => void;
  setActiveChatId: (activeChatId: string | null) => void;
  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  addMessage: (chatId: string, message: ChatMessage) => void;
  setTyping: (chatId: string, userIds: string[]) => void;
  updatePresence: (userId: string, status: 'online' | 'offline', lastChanged: number) => void;
  setCurrentCall: (call: any | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  typingUsers: {},
  presenceList: {},
  currentCall: null,

  setChats: (chats) => set({ chats }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  
  setMessages: (chatId, messagesList) => set((state) => ({
    messages: { ...state.messages, [chatId]: messagesList }
  })),

  addMessage: (chatId, message) => set((state) => {
    const list = state.messages[chatId] || [];
    // Prevent duplicate entries
    if (list.some(m => m.messageId === message.messageId)) return state;
    return {
      messages: { ...state.messages, [chatId]: [...list, message] }
    };
  }),

  setTyping: (chatId, userIds) => set((state) => ({
    typingUsers: { ...state.typingUsers, [chatId]: userIds }
  })),

  updatePresence: (userId, status, lastChanged) => set((state) => ({
    presenceList: { ...state.presenceList, [userId]: { status, lastChanged } }
  })),

  setCurrentCall: (currentCall) => set({ currentCall })
}));
