'use client';

import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Header() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Fetch user info from the same endpoint that returns both user and transactions
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/user');
        const data = await res.json();

        if (res.ok && data.user) {
          setUser(data.user);
        } else {
          console.error('Failed to load user');
        }
      } catch (err) {
        console.error('Error fetching user', err);
      }
    };

    fetchUser();
    console.log('User data fetched successfully!', user);
  }, []);

  const handleProfileClick = () => {
    setIsProfileOpen((prev) => !prev);
  };

  const handleLogout = () => {
    alert('Logged out!');
    setUser(null);
    // Redirect or clear session
  };

  const handleUpgrade = () => {
    alert('Upgrade to Premium clicked!');
    // Navigate to upgrade page or call upgrade API
  };

  return (
    <header className="p-4 flex items-center justify-between relative bg-background text-foreground">

      <div className="flex items-center space-x-4">
        <h1 className="text-3xl font-bold">FinSage</h1>
        
      </div>

      <div className="relative">
        <FiSearch className="ml-auto absolute left-3 top-1/2 transform -translate-y-1/2 text-black dark:text-white" />
          <input
          type="text"
          placeholder="Search..."
          className="pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:w-64
               bg-white dark:bg-card text-black dark:text-foreground border border-input"
          />
        </div>

      <div className="flex items-center space-x-4 relative">
        <ThemeToggle />
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleProfileClick}>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="font-medium text-xl hidden md:inline">
            {user?.name || 'Username'}
          </span>
        </div>

        {isProfileOpen && user && (
          <div className="absolute right-0 top-16 mt-2 w-64  shadow-lg rounded-lg border p-4 z-10">
            <h2 className="font-bold text-2xl">{user.name}</h2>
            <p className="text-xl ">{user.email}</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={handleUpgrade}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              >
                Upgrade to Premium
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
