import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Message, Conversation } from "@prisma/client";

export type ConversationWithLastMessage = Conversation & {
  Message: any[];
  userState?: {
    isRead?: boolean;
    isPinned?: boolean;
    isFavorite?: boolean;
    isArchived?: boolean;
    isMuted?: boolean;
  };
  userAlias?: string | null;
  adminAlias?: string | null;
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
  unreadCount: number;
  guestSessionId: string | null;
  toggleOpen: () => void;
  setUser: (user: { id: string; name: string | null; email: string }) => void;
  setMessages: (messages: Message[]) => void;
  setConversations: (conversations: ConversationWithLastMessage[]) => void;
  setActiveConv: (convId: string | null) => void;
  addMessage: (message: Message) => void;
  setEmail: (email: string) => void;
  setUnreadCount: (count: number) => void;
  setGuestSessionId: (id: string) => void;
  clearSession: () => void;
}

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      conversations: [],
      activeConvId: null,
      userEmail: null,
      userId: null,
      userName: null,
      isRegistered: false,
      hasCheckedEmail: false,
      unreadCount: 0,
      guestSessionId: null,
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
        if (state.messages.some(m => m.id === message.id)) return state;
        return { messages: [...state.messages, message] };
      }),
      setEmail: (email) => set({ userEmail: email, hasCheckedEmail: true }),
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      setGuestSessionId: (id) => set({ guestSessionId: id }),
      clearSession: () => set({ 
        userEmail: null, 
        userId: null, 
        userName: null, 
        isRegistered: false, 
        hasCheckedEmail: false,
        conversations: [],
        activeConvId: null,
        messages: [],
        unreadCount: 0,
        guestSessionId: null
      }),
    }),
    {
      name: 'messaging-storage',
      storage: createJSONStorage(() => localStorage),
      // We don't need to persist messages and conversations to localstorage if they are fetched from server,
      // but the prompt says: "di sisi user hanya akan disimpan di localstorage menggunakan state managa=ement zustand di sisi user".
      // Usually, it's better to persist 'guestSessionId', 'activeConvId', 'conversations', 'messages'.
      // If we persist everything, the state is correctly restored for anonymous users.
    }
  )
);
