import { common } from "./common";

export const settings = {
  title: "Settings",
  subtitle: "Portfolio OS / Configuration Center",
  version: "System Version 2.4.0",
  display: {
    title: "Display & Appearance",
    light: common.themes.light,
    dark: common.themes.dark,
    system: common.themes.system,
    activated: common.status.activated,
    switchTo: common.status.switch,
  },
  language: {
    title: "Localisation & Language",
    id: {
      name: common.languages.id,
      desc: "Native configuration",
      detail: "Formal / Standard",
    },
    en: {
      name: common.languages.en,
      desc: "Global configuration",
      detail: "International Standard",
    },
    toast: "System Language",
  },
};
