"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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

export const LanguageProvider = ({ 
  children, 
  initialLocale 
}: { 
  children: React.ReactNode, 
  initialLocale?: string 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  
  const defaultLang = (initialLocale?.toUpperCase() as SupportedLanguage) || "EN";
  const [lang, setLangState] = useState<SupportedLanguage>(defaultLang);

  // Sync state if server prop changes
  useEffect(() => {
    if (initialLocale) {
      setLangState(initialLocale.toUpperCase() as SupportedLanguage);
    }
  }, [initialLocale]);

  const changeLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    // Persist via cookie for the middleware to pick up instantly
    document.cookie = `NEXT_LOCALE=${newLang.toLowerCase()}; path=/; max-age=31536000`;
    
    // Replace the locale segment in the URL routing
    const pathParts = pathname.split("/");
    if (pathParts.length >= 2) {
      pathParts[1] = newLang.toLowerCase(); // pathParts[1] is the locale folder since it always starts with /
      router.push(pathParts.join("/"));
    } else {
      router.push(`/${newLang.toLowerCase()}`);
    }
  };

  const t = (key: string): string => {
    return dictionaries[lang]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
