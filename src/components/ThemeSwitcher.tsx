'use client';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSwitcher() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    // Check for user's preferred color scheme and saved preference
    useEffect(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDarkMode(savedTheme === 'dark');
            document.documentElement.classList.toggle('dark', savedTheme === 'dark');
        } else {
            // Fallback to system preference
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(isDark);
            document.documentElement.classList.toggle('dark', isDark);
        }
    }, []);

    // Toggle dark mode
    const toggleTheme = () => {
        setIsDarkMode(prevMode => {
            const newMode = !prevMode;
            // Update class and localStorage
            document.documentElement.classList.toggle('dark', newMode);
            localStorage.setItem('theme', newMode ? 'dark' : 'light');
            return newMode;
        });
    };

    return (
        <button
            onClick={toggleTheme}
            className="rounded-lg transition-colors hover:cursor-pointer "
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDarkMode ? (
                <Moon className="w-5 h-5" /> // Fixed icon size
            ) : (
                <Sun className="w-5 h-5" /> // Fixed icon size
            )}
        </button>
    );
}