import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Tab = "general" | "security";

interface ProfileState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  mfaDismissedToday: boolean;
  setMfaDismissedToday: (val: boolean) => void;
  // Store the date of dismissal to verify if it's still today
  mfaDismissedDate: string | null;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeTab: "general",
      setActiveTab: (tab: Tab) => set({ activeTab: tab }),
      mfaDismissedToday: false,
      mfaDismissedDate: null,
      setMfaDismissedToday: (val) => {
        const today = new Date().toDateString();
        set({ 
          mfaDismissedToday: val, 
          mfaDismissedDate: val ? today : null 
        });
      },
    }),
    {
      name: 'profile-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
