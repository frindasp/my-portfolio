import { common } from "./common";

export const settings = {
  title: "Pengaturan",
  subtitle: "Portfolio OS / Pusat Konfigurasi",
  version: "Versi Sistem 2.4.0",
  display: {
    title: "Tampilan & Antarmuka",
    light: common.themes.light,
    dark: common.themes.dark,
    system: common.themes.system,
    activated: common.status.activated,
    switchTo: common.status.switch,
  },
  language: {
    title: "Lokalisasi & Bahasa",
    id: {
      name: common.languages.id,
      desc: "Konfigurasi bawaan",
      detail: "Formal / Standar",
    },
    en: {
      name: common.languages.en,
      desc: "Konfigurasi global",
      detail: "Standar Internasional",
    },
    toast: "Bahasa Sistem",
  },
};
