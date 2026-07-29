'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function TabNav({ id, tabs }: { id: string; tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const base = `/activos/${id}`;

  return (
    <div className="flex gap-1 overflow-x-auto border-b">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const activo = tab.href === '' ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              activo ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
