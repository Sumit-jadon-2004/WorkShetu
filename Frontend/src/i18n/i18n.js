import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import hi from "./locales/hn.json";
import hinglish from "./locales/hinglish.json";

i18n.use(initReactI18next).init({
  lng: localStorage.getItem("workshetu-language") || "en",

  fallbackLng: "en",

  interpolation: {
    escapeValue: false,
  },

  resources: {
    en: {
      translation: en,
    },

    hi: {
      translation: hi,
    },

    hinglish: {
      translation: hinglish,
    },
  },
});

export default i18n;