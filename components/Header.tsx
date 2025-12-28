'use client';

import Link from 'next/link';
import { Menu, X, ChevronDown, LogOut, User, BookOpen, Loader2, Check, AlertCircle, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useGeneratingBook } from '@/contexts/GeneratingBookContext';

interface HeaderProps {
  variant?: 'default' | 'transparent';
}

export default function Header({ variant = 'default' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [genDropdownOpen, setGenDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navDropdownRef = useRef<HTMLDivElement>(null);
  const genDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const { generatingBook } = useGeneratingBook();

  // Check if user is admin
  useEffect(() => {
    if (session?.user) {
      fetch('/api/admin/check')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [session]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (navDropdownRef.current && !navDropdownRef.current.contains(event.target as Node)) {
        setNavDropdownOpen(false);
      }
      if (genDropdownRef.current && !genDropdownRef.current.contains(event.target as Node)) {
        setGenDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate progress percentage
  const progress = generatingBook?.totalChapters
    ? Math.round((generatingBook.currentChapter / generatingBook.totalChapters) * 100)
    : 0;

  const isGenerating = generatingBook?.status === 'generating' || generatingBook?.status === 'outlining' || generatingBook?.status === 'pending';
  const isCompleted = generatingBook?.status === 'completed';
  const isFailed = generatingBook?.status === 'failed';

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
      <nav className={`w-full px-6 py-6 ${
        variant === 'transparent'
          ? 'absolute top-0 left-0 right-0 z-40'
          : 'relative bg-white'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Nav - Hamburger Menu */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <div className="relative" ref={navDropdownRef}>
              <button
                onClick={() => setNavDropdownOpen(!navDropdownOpen)}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  variant === 'transparent'
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
              </button>

              {navDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl border border-neutral-200 shadow-lg py-2 z-50">
                  <Link
                    href="/how-it-works"
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    onClick={() => setNavDropdownOpen(false)}
                  >
                    How it works
                  </Link>
                  <Link
                    href="/pricing"
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    onClick={() => setNavDropdownOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    href="/faq"
                    className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    onClick={() => setNavDropdownOpen(false)}
                  >
                    FAQ
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Center Logo */}
          <Link
            href="/"
            className={`text-2xl font-bold tracking-tight md:absolute md:left-1/2 md:-translate-x-1/2 ${
              variant === 'transparent' ? 'text-white' : 'text-neutral-900'
            }`}
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            draftmybook
          </Link>

          {/* Right Nav */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            {/* Generating Book Notification */}
            {generatingBook && (
              <div className="relative" ref={genDropdownRef}>
                <button
                  onClick={() => setGenDropdownOpen(!genDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  {isGenerating && (
                    <>
                      <div className="relative">
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <span className="text-sm font-medium text-neutral-700 max-w-[120px] truncate">
                        {generatingBook.title}
                      </span>
                    </>
                  )}
                  {isCompleted && (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Ready!</span>
                    </>
                  )}
                  {isFailed && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Failed</span>
                    </>
                  )}
                </button>

                {genDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-neutral-200 shadow-lg py-3 px-4 z-50">
                    <div className="mb-3">
                      <p className="font-medium text-sm text-neutral-900 truncate">{generatingBook.title}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {isGenerating && `Chapter ${generatingBook.currentChapter} of ${generatingBook.totalChapters}`}
                        {isCompleted && 'Generation complete!'}
                        {isFailed && 'Generation failed - click to retry'}
                      </p>
                    </div>

                    {isGenerating && (
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-neutral-500 mb-1">
                          <span>Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neutral-900 transition-all duration-500 rounded-full"
                            style={{ width: `${Math.max(progress, 3)}%` }}
                          />
                        </div>
                        <p className="text-xs text-neutral-400 mt-2">
                          {generatingBook.totalWords.toLocaleString()} words written
                        </p>
                      </div>
                    )}

                    <Link
                      href={generatingBook.isVisualBook ? `/generate-comic?bookId=${generatingBook.id}` : `/book/${generatingBook.id}`}
                      className="block w-full text-center py-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                      onClick={() => setGenDropdownOpen(false)}
                    >
                      {isCompleted ? 'View Book' : 'View Progress'}
                    </Link>
                  </div>
                )}
              </div>
            )}

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
                    {isAdmin && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
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
                <Link href="/login" className={`text-sm animated-underline ${
                  variant === 'transparent'
                    ? 'text-white/80 hover:text-white'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}>
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className={`text-sm px-5 py-2.5 rounded-full transition-colors font-medium ${
                    variant === 'transparent'
                      ? 'bg-white text-neutral-900 hover:bg-white/90'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`md:hidden p-2 -mr-2 ${variant === 'transparent' ? 'text-white' : ''}`}
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
              {/* Mobile Generating Book Notification */}
              {generatingBook && (
                <Link
                  href={generatingBook.isVisualBook ? `/generate-comic?bookId=${generatingBook.id}` : `/book/${generatingBook.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-neutral-100 mb-2"
                  onClick={() => setMenuOpen(false)}
                >
                  {isGenerating && (
                    <>
                      <div className="relative">
                        <Loader2 className="h-5 w-5 animate-spin text-neutral-700" />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate">{generatingBook.title}</p>
                        <p className="text-xs text-neutral-500">
                          Chapter {generatingBook.currentChapter}/{generatingBook.totalChapters} • {progress}%
                        </p>
                      </div>
                    </>
                  )}
                  {isCompleted && (
                    <>
                      <Check className="h-5 w-5 text-green-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-600">Book Ready!</p>
                        <p className="text-xs text-neutral-500 truncate">{generatingBook.title}</p>
                      </div>
                    </>
                  )}
                  {isFailed && (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-600">Generation Failed</p>
                        <p className="text-xs text-neutral-500">Tap to retry</p>
                      </div>
                    </>
                  )}
                </Link>
              )}

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
                  {isAdmin && (
                    <Link href="/admin/dashboard" className="text-lg text-purple-700" onClick={() => setMenuOpen(false)}>
                      Admin Dashboard
                    </Link>
                  )}
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
