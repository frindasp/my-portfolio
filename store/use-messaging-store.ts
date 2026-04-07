import { create } from "zustand";
import { Message, Conversation } from "@prisma/client";

export type ConversationWithLastMessage = Conversation & {
  Message: Message[];
};

interface MessagingState {
  isOpen: boolean;
  messages: Message[];
  conversations: ConversationWithLastMessage[];
  activeConvId: string | null;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  isRegistered: boolean;
  hasCheckedEmail: boolean;
  toggleOpen: () => void;
  setUser: (user: { id: string; name: string | null; email: string }) => void;
  setMessages: (messages: Message[]) => void;
  setConversations: (conversations: ConversationWithLastMessage[]) => void;
  setActiveConv: (convId: string | null) => void;
  addMessage: (message: Message) => void;
  setEmail: (email: string) => void;
  clearSession: () => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  isOpen: false,
  messages: [],
  conversations: [],
  activeConvId: null,
  userEmail: null,
  userId: null,
  userName: null,
  isRegistered: false,
  hasCheckedEmail: false,
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setUser: (user) => set({ 
    userId: user.id, 
    userName: user.name, 
    userEmail: user.email, 
    isRegistered: true,
    hasCheckedEmail: true
  }),
  setMessages: (messages) => set({ messages }),
  setConversations: (conversations) => set({ conversations }),
  setActiveConv: (activeConvId) => set({ activeConvId }),
  addMessage: (message) => set((state) => {
    // Prevent duplicates
    if (state.messages.some(m => m.id === message.id)) return state;
    return { messages: [...state.messages, message] };
  }),
  setEmail: (email) => set({ userEmail: email, hasCheckedEmail: true }),
  clearSession: () => set({ 
    userEmail: null, 
    userId: null, 
    userName: null, 
    isRegistered: false, 
    hasCheckedEmail: false,
    conversations: [],
    activeConvId: null,
    messages: []
  }),
}));
