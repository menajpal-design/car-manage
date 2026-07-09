"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, getStoredLanguage, setStoredLanguage, t, TranslationKeys } from "@/lib/i18n";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  tr: TranslationKeys;
}

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  tr: t("en"),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    setLangState(getStoredLanguage());
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    setStoredLanguage(newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, setLang, tr: t(lang) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
