import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Tab = "general" | "security";

interface ProfileState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeTab: "general",
      setActiveTab: (tab: Tab) => set({ activeTab: tab }),
    }),
    {
      name: 'profile-settings-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
