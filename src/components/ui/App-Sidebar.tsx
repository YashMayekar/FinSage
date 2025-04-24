// src/components/Sidebar.tsx
'use client';

import { useState } from 'react';
import { 
  FiGrid, 
  FiCreditCard, 
  FiTarget, 
  FiPieChart,
  FiUsers,
  FiMenu
} from 'react-icons/fi';
import { Settings } from 'lucide-react';
import NavItem from '@/components/ui/NavItem';
import { SidebarSection } from '@/types/types';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar () {
  const [open, setOpen] = useState(true);
  const [activePath, setActivePath] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  const sections: SidebarSection[] = [
    {
      title: 'Overview',
      items: [
        { icon: <FiGrid />, text: 'Dashboard', path: '/dashboard' },
        { icon: <FiCreditCard />, text: 'Transactions', path: '/transactions' },
        { icon: <FiTarget />, text: 'Goals', path: '/goals' },
        { icon: <FiPieChart />, text: 'Analysis', path: '/analysis' }
      ]
    },
    {
      title: 'Shared',
      items: [
        { icon: <FiUsers />, text: 'Collaborative', path: '/collaborative' }
      ]
    }
  ];

  const handleItemClick = (path: string) => {
    setActivePath(path); // Set active immediately
    router.push(path); // Navigate to the path
  };

  // Check if path is active (either from state or URL)
  const isActive = (path: string) => {
    return activePath === path || pathname === path || 
           (path !== '/' && pathname.startsWith(path));
  };

  return (
    <aside className={`bg-[var(--sidebar)] transition-all duration-300 ease-in-out ${
      open ? 'w-64' : 'w-20 bg-[var(--background)]'
    }`}>
      <div className="p-4 flex flex-col h-full">
        <div className="mb-8 flex items-center justify-between">
          <button 
            onClick={() => setOpen(!open)}
            className="p-1 rounded-lg hover:bg-gray-700 text-[var(--sidebar-foreground)]"
          >
            <FiMenu className="text-lg" />
          </button>
        </div>

        <nav className="flex-1">
          {sections.map((section) => (
            <div key={section.title} className="mb-6">
              {open && (
                <h2 className="text-xs uppercase text-[var(--sidebar-foreground)] opacity-70 mb-2">
                  {section.title}
                </h2>
              )}
              <ul>
                {section.items.map((item) => (
                  <NavItem 
                    key={item.text} 
                    {...item} 
                    open={open}
                    active={isActive(item.path)}
                    onClick={() => handleItemClick(item.path)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-auto">
          <NavItem 
            icon={<Settings size={20} />} 
            text="Settings" 
            path="/settings" 
            open={open}
            active={isActive('/settings')}
            onClick={() => handleItemClick('/settings')}
          />
        </div>
      </div>
    </aside>
  );
};