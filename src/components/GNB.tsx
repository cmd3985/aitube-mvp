"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Film, Clapperboard, Home } from "lucide-react";

export function GNB() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "Movies", path: "/movies", icon: Film },
    { name: "Dramas", path: "/dramas", icon: Clapperboard },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center font-bold text-black neon-shadow-blue">
              AI
            </div>
            <span className="text-xl font-black tracking-tighter text-gradient">
              Tube
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.path}
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
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
