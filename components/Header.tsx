'use client';

// Using <a> tags instead of next/link to prevent stale client-side navigation on long-lived pages
import { Menu, X, ChevronDown, LogOut, User, BookOpen, Loader2, Check, AlertCircle, Shield, Bell, Gift, Plus, Coins } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import { useGeneratingBook } from '@/contexts/GeneratingBookContext';
import { APP_VERSION, getLatestChangelog } from '@/lib/version';

interface HeaderProps {
  variant?: 'default' | 'transparent';
}

const LATEST_CHANGELOG = getLatestChangelog();

export default function Header({ variant = 'default' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [genDropdownOpen, setGenDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [freeCredits, setFreeCredits] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditDropdownOpen, setCreditDropdownOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const creditDropdownRef = useRef<HTMLDivElement>(null);
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const genDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();
  const { generatingBook, clearGeneratingBook } = useGeneratingBook();

  // Check if user is admin and fetch notifications
  useEffect(() => {
    if (session?.user) {
      fetch('/api/admin/check')
        .then(res => res.json())
        .then(data => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false));

      // Fetch notifications
      fetch('/api/user/notifications')
        .then(res => res.json())
        .then(data => {
          if (data.notifications) {
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount || 0);
            setFreeCredits(data.freeCredits || 0);
            setPaidCredits(data.credits || 0);
            setCreditBalance(data.creditBalance || 0);
          }
        })
        .catch(() => {});
    } else {
      setIsAdmin(false);
      setNotifications([]);
      setUnreadCount(0);
      setFreeCredits(0);
      setPaidCredits(0);
    }
  }, [session]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
if (genDropdownRef.current && !genDropdownRef.current.contains(event.target as Node)) {
        setGenDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (creditDropdownRef.current && !creditDropdownRef.current.contains(event.target as Node)) {
        setCreditDropdownOpen(false);
      }
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setLoginDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      await fetch('/api/user/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

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
          {/* Left Nav - Using <a> tags instead of <a> to prevent stale navigation on long-lived pages */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <a
              href="/how-it-works"
              className={`text-sm transition-colors ${
                variant === 'transparent'
                  ? 'text-white/80 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              How It Works
            </a>
            <a
              href="/pricing"
              className={`text-sm transition-colors ${
                variant === 'transparent'
                  ? 'text-white/80 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Pricing
            </a>
            <a
              href="/faq"
              className={`text-sm transition-colors ${
                variant === 'transparent'
                  ? 'text-white/80 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              FAQ
            </a>
            <a
              href="/blog"
              className={`text-sm transition-colors ${
                variant === 'transparent'
                  ? 'text-white/80 hover:text-white'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Blog
            </a>
          </div>

          {/* Center Logo + Version */}
          <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-2">
            <a
              href="/"
              className={`text-2xl font-bold tracking-tight ${
                variant === 'transparent' ? 'text-white' : 'text-neutral-900'
              }`}
              style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
            >
              draftmybook
            </a>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              variant === 'transparent'
                ? 'bg-white/10 text-white/60'
                : 'bg-neutral-100 text-neutral-400'
            }`}>
              v{APP_VERSION}
            </span>
          </div>

          {/* Right Nav */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            {/* Generating Book Notification */}
            {generatingBook && (
              <div className="relative" ref={genDropdownRef}>
                <button
                  onClick={() => setGenDropdownOpen(!genDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${
                    variant === 'transparent'
                      ? 'bg-white/10 hover:bg-white/20'
                      : 'bg-neutral-100 hover:bg-neutral-200'
                  }`}
                >
                  {isGenerating && (
                    <>
                      <div className="relative">
                        <Loader2 className={`h-4 w-4 animate-spin ${variant === 'transparent' ? 'text-white' : 'text-neutral-700'}`} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium max-w-[100px] truncate ${variant === 'transparent' ? 'text-white' : 'text-neutral-700'}`}>
                          {generatingBook.title}
                        </span>
                        <span className={`text-xs font-mono tabular-nums ${variant === 'transparent' ? 'text-white/70' : 'text-neutral-500'}`}>
                          {progress}%
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className={`w-12 h-1 rounded-full overflow-hidden ${variant === 'transparent' ? 'bg-white/20' : 'bg-neutral-200'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${variant === 'transparent' ? 'bg-lime-400' : 'bg-neutral-900'}`}
                          style={{ width: `${Math.max(progress, 3)}%` }}
                        />
                      </div>
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
                        {isGenerating && `${generatingBook.bookFormat === 'screenplay' || generatingBook.bookFormat === 'tv_series' ? 'Sequence' : 'Chapter'} ${generatingBook.currentChapter} of ${generatingBook.totalChapters}`}
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

                    <a
                      href={generatingBook.isVisualBook ? `/generate-comic?bookId=${generatingBook.id}` : `/book/${generatingBook.id}`}
                      className="block w-full text-center py-2 px-4 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                      onClick={() => setGenDropdownOpen(false)}
                    >
                      {isCompleted ? 'View Book' : 'View Progress'}
                    </a>
                    <button
                      onClick={() => { clearGeneratingBook(); setGenDropdownOpen(false); }}
                      className="block w-full text-center py-2 px-4 text-neutral-500 text-xs hover:text-neutral-700 transition-colors mt-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Credit Counter + Notification Bell (always visible when logged in) */}
            {session?.user && (
              <div className="flex items-center gap-1.5">
                {/* Credit Counter */}
                <div className="relative" ref={creditDropdownRef}>
                  <button
                    onClick={() => setCreditDropdownOpen(!creditDropdownOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      variant === 'transparent'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    <Coins className="h-4 w-4" />
                    <span className="text-sm font-medium">{creditBalance || (freeCredits + paidCredits)}</span>
                  </button>

                  {creditDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-neutral-200 shadow-lg py-3 z-50">
                      <div className="px-4 pb-3 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">Your Credits</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">Balance</span>
                            <span className="font-medium">{creditBalance || (freeCredits + paidCredits)}</span>
                          </div>
                          {creditBalance === 0 && freeCredits === 0 && paidCredits === 0 && (
                            <p className="text-sm text-neutral-400">No credits available</p>
                          )}
                        </div>
                      </div>
                      <div className="px-3 pt-3">
                        <a
                          href="/create"
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                          onClick={() => setCreditDropdownOpen(false)}
                        >
                          <Plus className="h-4 w-4" />
                          Create a Book
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <div className="relative" ref={notifDropdownRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className={`relative p-2 rounded-full transition-colors ${
                      variant === 'transparent'
                        ? 'hover:bg-white/10 text-white'
                        : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-neutral-200 shadow-lg py-2 z-50">
                      <div className="px-4 py-2 border-b border-neutral-100 flex items-center justify-between">
                        <p className="font-medium text-sm">Notifications</p>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllNotificationsRead}
                            className="text-xs text-neutral-500 hover:text-neutral-900"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Credit Gift Banner */}
                      {freeCredits > 0 && (
                        <a
                          href="/create"
                          className="mx-3 my-2 p-3 bg-lime-50 border border-lime-200 rounded-lg flex items-center gap-2 hover:bg-lime-100 transition-colors"
                          onClick={() => setNotifDropdownOpen(false)}
                        >
                          <Gift className="h-5 w-5 text-lime-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-lime-900">
                              {freeCredits} Free Credit{freeCredits > 1 ? 's' : ''} Available
                            </p>
                            <p className="text-xs text-lime-700">Tap to create a book</p>
                          </div>
                        </a>
                      )}

                      {/* Patch Notes */}
                      <a
                        href="/changelog"
                        className="mx-3 my-2 p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center gap-2 hover:bg-neutral-100 transition-colors"
                        onClick={() => setNotifDropdownOpen(false)}
                      >
                        <span className="w-2 h-2 bg-lime-400 rounded-full flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900">v{APP_VERSION}: {LATEST_CHANGELOG.title}</p>
                          <p className="text-xs text-neutral-500">View patch notes</p>
                        </div>
                      </a>

                      {/* Notifications List */}
                      <div className="max-h-48 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              className={`px-4 py-3 hover:bg-neutral-50 transition-colors ${!notif.read ? 'bg-blue-50/50' : ''}`}
                            >
                              <p className="text-sm font-medium text-neutral-900">{notif.title}</p>
                              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <p className="text-xs text-neutral-400 mt-1">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="px-4 py-4 text-sm text-neutral-400 text-center">
                            No other notifications
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                    <a
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <BookOpen className="h-4 w-4" />
                      My Books
                    </a>
                    <a
                      href="/create"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Create New Book
                    </a>
                    {isAdmin && (
                      <a
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        Admin Dashboard
                      </a>
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
              // Logged out state - inline sign-in dropdown (no page navigation)
              <div className="relative" ref={loginDropdownRef}>
                <button
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  className={`text-sm animated-underline ${
                    variant === 'transparent'
                      ? 'text-white/80 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Log in
                </button>
                <a
                  href="/signup"
                  className={`ml-3 text-sm px-5 py-2.5 rounded-full transition-colors font-medium ${
                    variant === 'transparent'
                      ? 'bg-white text-neutral-900 hover:bg-white/90'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Get Started
                </a>

                {loginDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-neutral-200 shadow-xl p-5 z-50">
                    <h3 className="font-semibold text-neutral-900 mb-4">Log in to your account</h3>

                    {/* Google Sign In */}
                    <button
                      onClick={() => signIn('google', { callbackUrl: window.location.href })}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-sm font-medium text-neutral-700 mb-3 transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Continue with Google
                    </button>

                    <div className="relative my-3">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-200"></div></div>
                      <div className="relative flex justify-center text-xs"><span className="px-2 bg-white text-neutral-400">or</span></div>
                    </div>

                    {/* Email/Password */}
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setLoginLoading(true);
                      setLoginError('');
                      try {
                        const result = await signIn('credentials', {
                          email: loginEmail,
                          password: loginPassword,
                          redirect: false,
                        });
                        if (result?.error) {
                          setLoginError('Invalid email or password');
                        } else {
                          setLoginDropdownOpen(false);
                          window.location.reload();
                        }
                      } catch {
                        setLoginError('Something went wrong');
                      } finally {
                        setLoginLoading(false);
                      }
                    }}>
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm mb-2 focus:border-neutral-900 focus:outline-none"
                        required
                      />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm mb-3 focus:border-neutral-900 focus:outline-none"
                        required
                      />
                      {loginError && <p className="text-red-600 text-xs mb-2">{loginError}</p>}
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        {loginLoading ? 'Logging in...' : 'Log in'}
                      </button>
                    </form>

                    <p className="text-xs text-neutral-500 text-center mt-3">
                      No account? <a href="/signup" className="text-neutral-900 underline">Sign up</a>
                    </p>
                  </div>
                )}
              </div>
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
                <a
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
                </a>
              )}

              {session?.user && (
                <>
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

                  {/* Mobile Credit + Notification Bar */}
                  <div className="flex items-center gap-3 pb-4 mb-2 border-b border-neutral-200">
                    <a
                      href="/create"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium"
                    >
                      <Coins className="h-4 w-4" />
                      {freeCredits + paidCredits} Credit{freeCredits + paidCredits !== 1 ? 's' : ''} — Create
                    </a>
                    {unreadCount > 0 && (
                      <a
                        href="/dashboard"
                        className="relative p-2.5 bg-neutral-100 rounded-lg"
                      >
                        <Bell className="h-5 w-5 text-neutral-600" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      </a>
                    )}
                  </div>
                </>
              )}

              <a href="/how-it-works" className="text-lg">
                How it works
              </a>
              <a href="/pricing" className="text-lg">
                Pricing
              </a>
              <a href="/faq" className="text-lg">
                FAQ
              </a>
              <a href="/blog" className="text-lg">
                Blog
              </a>

              {session?.user ? (
                <>
                  <div className="h-px bg-neutral-200 my-4" />
                  <a href="/dashboard" className="text-lg">
                    My Books
                  </a>
                  <a href="/create" className="text-lg">
                    Create New Book
                  </a>
                  {isAdmin && (
                    <a href="/admin/dashboard" className="text-lg text-purple-700">
                      Admin Dashboard
                    </a>
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
                  <button
                    onClick={() => signIn('google', { callbackUrl: window.location.href })}
                    className="text-lg flex items-center gap-2"
                  >
                    Log in with Google
                  </button>
                  <a href="/login" className="text-lg text-neutral-500">
                    Log in with email
                  </a>
                  <a
                    href="/signup"
                    className="text-lg bg-neutral-900 text-white px-5 py-3 rounded-full text-center font-medium"
                  >
                    Get Started
                  </a>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
