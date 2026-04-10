import { create } from "zustand";
import { persist } from "zustand/middleware";
export type Language = "id" | "en";

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      lang: "id",
      setLang: (lang: Language) => set({ lang }),
    }),
    {
      name: "language-storage",
    }
  )
);

