import { UserButton } from '@clerk/nextjs'
import ThemeSwitcher from './ThemeSwitcher';

export default function Header() {

  return (
    <header className="border-b border-[var(--border)] p-4 flex items-center justify-between relative bg-[var(--background)]">
      <div className="flex items-center space-x-4">
        <h1 className=" text-3xl font-bold text-[var(--foreground)]">FinSage</h1>
      </div>
      <div className='ml-auto flex items-center space-x-4'>
        <ThemeSwitcher />
        <UserButton
          showName
          appearance={{
            elements: {
              userButtonOuterIdentifier: {
                color: 'var(--sidebar-foreground)',
                fontSize: '1.2rem',
              },
              userButtonBox: {
                color: 'var(--foreground)',
                padding: '0.5rem',
                paddingRight: '0.8rem',
                border: '1px solid rgb(70, 70, 70, 0)',
                borderRadius: '0.5rem',
                "&:hover": {
                  border: '1px rgb(70, 70, 70) solid',
                  borderRadius: '0.5rem',
                },
                transitionProperty: 'all',
                transitionTimingFunction: 'ease-out',
                transitionDuration: '0.25s',
              },
            },
          }}
        />
      </div>
    </header>
  );
}
