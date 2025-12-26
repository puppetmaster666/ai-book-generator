'use client';

import Link from 'next/link';
import { Menu, X, ChevronDown, LogOut, User, BookOpen } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <>
      <nav className="w-full px-6 py-6 border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Nav */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <Link href="/how-it-works" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              How it works
            </Link>
            <Link href="/pricing" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              Pricing
            </Link>
          </div>

          {/* Center Logo */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight md:absolute md:left-1/2 md:-translate-x-1/2"
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            draftmybook
          </Link>

          {/* Right Nav */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            <Link href="/faq" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              FAQ
            </Link>

            {status === 'loading' ? (
              <div className="w-10 h-10 rounded-full bg-neutral-200 animate-pulse" />
            ) : session?.user ? (
              // Logged in state
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Profile'}
                      className="w-10 h-10 rounded-full object-cover border-2 border-neutral-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-medium">
                      {getInitials(session.user.name, session.user.email)}
                    </div>
                  )}
                  <ChevronDown className={`h-4 w-4 text-neutral-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="font-medium text-sm truncate">{session.user.name || 'User'}</p>
                      <p className="text-xs text-neutral-500 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <BookOpen className="h-4 w-4" />
                      My Books
                    </Link>
                    <Link
                      href="/create"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Create New Book
                    </Link>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Logged out state
              <>
                <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-neutral-900 text-white px-5 py-2.5 rounded-full hover:bg-neutral-800 transition-colors font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 -mr-2"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-semibold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Menu
              </span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {session?.user && (
                <div className="flex items-center gap-3 pb-4 mb-2 border-b border-neutral-200">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'Profile'}
                      className="w-12 h-12 rounded-full object-cover border-2 border-neutral-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-medium">
                      {getInitials(session.user.name, session.user.email)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{session.user.name || 'User'}</p>
                    <p className="text-xs text-neutral-500 truncate">{session.user.email}</p>
                  </div>
                </div>
              )}

              <Link href="/how-it-works" className="text-lg" onClick={() => setMenuOpen(false)}>
                How it works
              </Link>
              <Link href="/pricing" className="text-lg" onClick={() => setMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/faq" className="text-lg" onClick={() => setMenuOpen(false)}>
                FAQ
              </Link>

              {session?.user ? (
                <>
                  <div className="h-px bg-neutral-200 my-4" />
                  <Link href="/dashboard" className="text-lg" onClick={() => setMenuOpen(false)}>
                    My Books
                  </Link>
                  <Link href="/create" className="text-lg" onClick={() => setMenuOpen(false)}>
                    Create New Book
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleSignOut();
                    }}
                    className="text-lg text-red-600 text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="h-px bg-neutral-200 my-4" />
                  <Link href="/login" className="text-lg" onClick={() => setMenuOpen(false)}>
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-lg bg-neutral-900 text-white px-5 py-3 rounded-full text-center font-medium"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
