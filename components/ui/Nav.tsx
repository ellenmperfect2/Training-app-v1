'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/checkin', label: 'Check-In' },
  { href: '/log/strength', label: 'Strength' },
  { href: '/log/climbing', label: 'Climbing' },
  { href: '/log/conditioning', label: 'Conditioning' },
  { href: '/upload', label: 'Cardio' },
  { href: '/activity', label: 'Activity' },
  { href: '/objectives', label: 'Objectives' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/preferences', label: 'Preferences' },
  { href: '/zones', label: 'HR Zones' },
  { href: '/settings', label: 'Settings' },
];

export default function Nav() {
  const pathname = usePathname();
  const { theme: T, themeId, toggleTheme } = useTheme();

  const today = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <nav
      style={{ borderBottom: `1px solid ${T.line}`, background: T.bg }}
      className="sticky top-0 z-10"
    >
      <div className="max-w-3xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
        <div className="flex gap-1 overflow-x-auto flex-1">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: active ? T.ink : T.inkMid,
                  borderBottom: active ? `2px solid ${T.moss}` : '2px solid transparent',
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '0.04em',
                  padding: '6px 12px',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Date + theme toggle */}
        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
          <span
            style={{
              fontSize: 9,
              color: T.inkDim,
              letterSpacing: '0.1em',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {today}
          </span>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: T.inkDim,
              lineHeight: 1,
            }}
          >
            {themeId === 'dark' ? (
              /* Sun icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" />
                <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="2.93" y1="2.93" x2="4.34" y2="4.34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11.66" y1="11.66" x2="13.07" y2="13.07" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="2.93" y1="13.07" x2="4.34" y2="11.66" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="11.66" y1="4.34" x2="13.07" y2="2.93" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            ) : (
              /* Moon icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
