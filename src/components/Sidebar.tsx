'use client';

import { useState, ReactNode } from 'react';
import {
  FiGrid,
  FiCreditCard,
  FiTarget,
  FiPieChart,
  FiUsers,
  FiMenu
} from 'react-icons/fi';
import { Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

interface SidebarSection {
  title: string;
  items: NavItemType[];
}

interface NavItemType {
  icon: ReactNode;
  text: string;
  path: string;
}

interface NavItemProps extends NavItemType {
  open: boolean;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, text, path, active = false, open, onClick }: NavItemProps) {
  return (
    <li className="mb-1">
      <button
        onClick={onClick}
        className={`
          hover:cursor-pointer
          border border-transparent
          hover:border-[var(--sidebar-border)]
          flex items-center p-3 rounded-lg transition-colors w-full
          ${active
            ? 'bg-[var(--sidebar-primary)] border border-[var(--sidebar-border)] text-[var(--sidebar-primary-foreground)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
          }
        `}
      >
        <span className="text-lg">{icon}</span>
        {open && <span className="ml-3 text-[1.2em]">{text}</span>}
      </button>
    </li>
  );
}

export default function Sidebar() {
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
    setActivePath(path);
    router.push(path);
  };

  const isActive = (path: string) => {
    return activePath === path || pathname === path ||
      (path !== '/' && pathname.startsWith(path));
  };

  return (
    <aside className={`transition-[width,margin,padding,transform] duration-400 ease-in-out ${open ? 'w-60 bg-[var(--sidebar)]' : 'w-19 bg-[var(--background)]'}`}>
      <div className="p-4 flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setOpen(!open)}
            className="p-3 rounded-lg border border-transparent hover:cursor-pointer          
          hover:border-[var(--sidebar-border)] text-[var(--sidebar-foreground)]"
          >
            <FiMenu className="text-lg" />
          </button>
        </div>

        <nav className="flex-1">
          {sections.map((section) => (
            <div key={section.title} className={`${open ? 'mb-6' : 'mb-2'}`}>
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

        <div className="mt-auto" style={{ listStyleType: 'none' }}>
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
}
