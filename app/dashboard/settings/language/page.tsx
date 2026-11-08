"use client";

import { useTranslation } from "@/hooks/use-translation";
import { Language } from "@/store/use-language-store";
import { Globe, Check } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";

export default function LanguageSettingsPage() {
  const { lang, setLang, t_lang } = useTranslation();

  const languages = [
    { id: "id" as Language, name: "Bahasa Indonesia", flag: "🇮🇩" },
    { id: "en" as Language, name: "English", flag: "🇺🇸" },
    { id: "ja" as Language, name: "日本語", flag: "🇯🇵" },
    { id: "zh" as Language, name: "中文", flag: "🇨🇳" },
  ];

  const languageOptions = languages.map((l) => ({
    value: l.id,
    label: `${l.flag} ${l.name}`,
  }));

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang as Language);
    const selected = languages.find((l) => l.id === newLang);
    toast.success(`${t_lang.toast}: ${selected?.name}`, { icon: selected?.flag });
  };

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          Language Settings
        </h1>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
          Pilih bahasa preferensi antarmuka aplikasi
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Bahasa (Combobox Autocomplete)
          </label>
          <Combobox
            options={languageOptions}
            value={lang}
            onChange={handleLanguageChange}
            placeholder="Pilih bahasa..."
            searchPlaceholder="Cari bahasa..."
            className="w-full h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          {languages.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLanguageChange(l.id)}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                lang === l.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{l.flag}</span>
                <span className="text-sm font-bold">{l.name}</span>
              </div>
              {lang === l.id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

