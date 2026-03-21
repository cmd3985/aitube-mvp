"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Globe } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { SupportedLanguage } from "@/i18n/dictionaries";

export function GNB() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  const navItems = [
    { name: t("home"), path: "/", icon: Home },
  ];
  const languages: SupportedLanguage[] = ["EN", "KO", "JA", "ES", "FR", "PT", "ZH", "HI", "AR", "ID", "RU", "DE"];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href={`/${lang.toLowerCase()}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center font-bold text-black neon-shadow-blue">
              AI
            </div>
            <span className="text-xl font-black tracking-tighter text-gradient">
              Tube
            </span>
          </a>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={`/${lang.toLowerCase()}`}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors relative px-2 py-1 ${
                    isActive ? "text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                  {isActive && (
                    <motion.div
                      layoutId="gnb-active"
                      className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-gradient-to-r from-neon-blue to-neon-purple neon-shadow"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </a>
              );
            })}

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-neon-blue/50 hover:bg-white/5 transition-all text-sm font-medium"
              >
                <Globe className="w-4 h-4 text-neon-blue" />
                {lang}
              </button>
              
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-32 py-2 glass rounded-xl border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] z-50 flex flex-col"
                  >
                    {languages.map(l => (
                      <button
                        key={l}
                        onClick={() => {
                          setLang(l);
                          setLangOpen(false);
                        }}
                        className={`text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${lang === l ? "text-neon-blue font-bold" : "text-gray-300"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
