'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/checkin', label: 'Check-In' },
  { href: '/log/strength', label: 'Strength' },
  { href: '/log/climbing', label: 'Climbing' },
  { href: '/log/conditioning', label: 'Conditioning' },
  { href: '/upload', label: 'Upload' },
  { href: '/objectives', label: 'Objectives' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
        {links.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
