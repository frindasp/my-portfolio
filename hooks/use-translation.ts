import { useLanguageStore, Language } from "@/store/use-language-store";
import { en } from "@/lib/i18n/en";
import { id } from "@/lib/i18n/id";
import { TranslationType } from "@/lib/i18n/types";

const translations: Record<Language, TranslationType> = {
  en,
  id,
};

export const useTranslation = () => {
  const { lang, setLang } = useLanguageStore();
  const t = translations[lang];
  
  // Shortcuts for commonly used translation blocks
  const t_display = t.settings.display;
  const t_lang = t.settings.language;

  return { lang, setLang, t, t_display, t_lang };
};
