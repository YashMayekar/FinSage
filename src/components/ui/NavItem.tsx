// src/components/NavItem.tsx
import { NavItemType } from '@/types/types';

interface NavItemProps extends NavItemType {
  open: boolean;
  active?: boolean;
  onClick?: () => void;
}

export default function NavItem  ({ icon, text, path, active = false, open, onClick }: NavItemProps) {
  return (
    <li className="mb-1">
      <button
        onClick={onClick}
        className={`flex items-center p-3 rounded-lg transition-colors w-full ${
          active
            ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
            : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
        }`}
      >
        <span className="text-lg">{icon}</span>
        {open && <span className="ml-3">{text}</span>}
      </button>
    </li>
  );
};