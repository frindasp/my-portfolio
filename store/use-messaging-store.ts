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
  isAnonymous: boolean;
  messageCount: number;
  toggleOpen: () => void;
  setUser: (user: { id: string; name: string | null; email: string }) => void;
  setAnonymousUser: (userId: string) => void;
  incrementMessageCount: () => void;
  setMessages: (messages: Message[]) => void;
  setConversations: (conversations: ConversationWithLastMessage[]) => void;
  setActiveConv: (convId: string | null) => void;
  addMessage: (message: Message) => void;
  setEmail: (email: string) => void;
  setUnreadCount: (count: number) => void;
  setGuestSessionId: (id: string) => void;
  clearSession: () => void;
  isGuestDialogOpen: boolean;
  setGuestDialogOpen: (open: boolean) => void;
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
      isAnonymous: false,
      messageCount: 0,
      isGuestDialogOpen: false,
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
      setUser: (user) => set({ 
        userId: user.id, 
        userName: user.name, 
        userEmail: user.email, 
        isRegistered: true,
        hasCheckedEmail: true,
        isAnonymous: false
      }),
      setAnonymousUser: (userId) => set({
        userId,
        isAnonymous: true,
        isRegistered: false
      }),
      incrementMessageCount: () => set((state) => ({ messageCount: state.messageCount + 1 })),
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
      setGuestDialogOpen: (isGuestDialogOpen) => set({ isGuestDialogOpen }),
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
        guestSessionId: null,
        isAnonymous: false,
        messageCount: 0,
        isGuestDialogOpen: false
      }),
    }),
    {
      name: 'messaging-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
