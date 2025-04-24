// src/components/ThemeToggle.tsx
'use client';

import { FiMoon, FiSun } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:cursor-pointer transition-colors"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <FiSun className="text-lg text-yellow-300" />
      ) : (
        <FiMoon className="text-lg text-gray-700" />
      )}
    </button>
  );
};