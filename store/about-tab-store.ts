import { create } from "zustand";

export type AboutTab = "about" | "experience";

interface AboutTabState {
  activeTab: AboutTab;
  setActiveTab: (tab: AboutTab) => void;
}

export const useAboutTab = create<AboutTabState>((set) => ({
  activeTab: "about",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
