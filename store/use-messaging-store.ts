import { create } from "zustand";
import { Message } from "@prisma/client";

interface MessagingState {
  isOpen: boolean;
  messages: Message[];
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  isRegistered: boolean;
  hasCheckedEmail: boolean;
  toggleOpen: () => void;
  setUser: (user: { id: string; name: string | null; email: string }) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setEmail: (email: string) => void;
  clearSession: () => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  isOpen: false,
  messages: [],
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
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setEmail: (email) => set({ userEmail: email, hasCheckedEmail: true }),
  clearSession: () => set({ 
    userEmail: null, 
    userId: null, 
    userName: null, 
    isRegistered: false, 
    hasCheckedEmail: false 
  }),
}));
