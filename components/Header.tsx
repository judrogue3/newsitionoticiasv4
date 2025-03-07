'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Newspaper, Sun, Moon, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const providers = [
  { name: 'DF.cl', href: '/provider/df.cl' },
  { name: 'WSJ', href: '/provider/wsj' },
  { name: 'Reuters', href: '/provider/reuters' },
  { name: 'Banco Central', href: '/provider/banco-central' },
  { name: 'CMF', href: '/provider/cmf' },
  { name: 'Bloomberg', href: '/provider/bloomberg' },
  { name: 'Financial Times', href: '/provider/ft' },
];

export default function Header() {
  const [activeProvider, setActiveProvider] = useState('');
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Newspaper className="h-6 w-6" />
            <span className="font-bold text-xl">NewsHub</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 ml-6">
            {providers.map((provider) => (
              <Link
                key={provider.name}
                href={provider.href}
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  activeProvider === provider.name
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
                onClick={() => setActiveProvider(provider.name)}
              >
                {provider.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/login">
            <Button variant="ghost" className="flex items-center space-x-2">
              <LogIn className="h-4 w-4" />
              <span>Login</span>
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="default" className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="transition-colors"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}