'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/checkin', label: 'Check-In' },
  { href: '/log/strength', label: 'Strength' },
  { href: '/log/climbing', label: 'Climbing' },
  { href: '/log/conditioning', label: 'Conditioning' },
  { href: '/upload', label: 'Cardio' },
  { href: '/objectives', label: 'Objectives' },
  { href: '/preferences', label: 'Preferences' },
  { href: '/zones', label: 'HR Zones' },
  { href: '/settings', label: 'Settings' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-glacier-edge bg-glacier-bg sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto py-2">
        {links.map((link) => {
          const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-1.5 rounded-[20px] text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                active
                  ? 'bg-glacier-accent text-glacier-bg font-semibold'
                  : 'text-glacier-secondary hover:bg-glacier-card hover:text-glacier-primary'
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
