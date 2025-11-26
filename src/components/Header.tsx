'use client';

import { useState } from 'react';
import { redirect } from "next/navigation";
import ThemeSwitcher from './ThemeSwitcher';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [open, setOpen] = useState(false);

  const handleNav = (path: string) => {
    setOpen(false);
    redirect(path);
  };

  return (
    <header className="border-b border-[var(--border)] p-4 bg-[var(--background)] sticky top-0 z-50">
      <div className="flex items-center justify-between">
        
        {/* Logo */}
        <h1 className="transition-text duration-300 text-3xl font-bold text-[var(--foreground)]">
          FinSage
        </h1>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => handleNav('/dashboard')}
            className="text-xl transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('/transactions')}
            className="text-xl transition"
          >
            Transactions
          </button>
          {/* <button
            onClick={() => handleNav('/insights')}
            className="text-xl transition"
          >
            Insights
          </button> */}

          <ThemeSwitcher />
        </nav>

        {/* Hamburger (Mobile Only) */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle Menu"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden mt-4 flex flex-col gap-4 pb-4 animate-slideDown">
          <button
            onClick={() => handleNav('/dashboard')}
            className="text-lg transition text-left"
          >
            Dashboard
          </button>
          <button
            onClick={() => handleNav('/transactions')}
            className="text-lg transition text-left"
          >
            Transactions
          </button>
          {/* <button
            onClick={() => handleNav('/insights')}
            className="text-lg transition text-left"
          >
            Insights
          </button> */}

          <div className="pt-2">
            <ThemeSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
