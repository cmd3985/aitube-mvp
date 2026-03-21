"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries, SupportedLanguage } from "./dictionaries";

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "EN",
  setLang: () => {},
  t: (key) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<SupportedLanguage>("EN");

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("aitube-lang") as SupportedLanguage;
    if (saved && Object.keys(dictionaries).includes(saved)) {
      setLang(saved);
    } else {
      // Basic auto-detect Korean if browser says Korean
      const browserLang = navigator.language;
      if (browserLang.toLowerCase().includes("ko")) setLang("KO");
      else if (browserLang.toLowerCase().includes("ja")) setLang("JA");
      else if (browserLang.toLowerCase().includes("zh")) setLang("ZH");
      else if (browserLang.toLowerCase().includes("es")) setLang("ES");
      else if (browserLang.toLowerCase().includes("pt")) setLang("PT");
      else if (browserLang.toLowerCase().includes("fr")) setLang("FR");
      else if (browserLang.toLowerCase().includes("hi")) setLang("HI");
      else setLang("EN");
    }
  }, []);

  const changeLang = (newLang: SupportedLanguage) => {
    setLang(newLang);
    localStorage.setItem("aitube-lang", newLang);
  };

  const t = (key: string): string => {
    return dictionaries[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
