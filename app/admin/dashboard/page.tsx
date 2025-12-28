'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Users,
  BookOpen,
  DollarSign,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  XCircle,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Trash2,
  Mail,
  Gift,
  Send,
  RotateCcw,
} from 'lucide-react';

interface AdminStats {
  overview: {
    totalUsers: number;
    totalBooks: number;
    completedBooks: number;
    pendingBooks: number;
    generatingBooks: number;
    failedBooks: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    freeBookUsed: boolean;
    createdAt: string;
    booksCount: number;
  }>;
  recentBooks: Array<{
    id: string;
    title: string;
    authorName: string;
    genre: string;
    bookFormat: string;
    status: string;
    paymentStatus: string;
    totalWords: number;
    totalChapters: number;
    createdAt: string;
    completedAt: string | null;
    email: string | null;
    user: { email: string; name: string | null } | null;
  }>;
  booksByFormat: Array<{ format: string; count: number }>;
  booksByGenre: Array<{ genre: string; count: number }>;
  dailyStats: Array<{ date: string; booksCreated: number }>;
}

const formatLabels: Record<string, string> = {
  text_only: 'Novel',
  illustrated: 'Illustrated',
  picture_book: 'Picture Book',
  comic: 'Comic',
};

const genreLabels: Record<string, string> = {
  fantasy: 'Fantasy',
  scifi: 'Sci-Fi',
  romance: 'Romance',
  mystery: 'Mystery',
  thriller: 'Thriller',
  horror: 'Horror',
  literary: 'Literary Fiction',
  historical: 'Historical',
  adventure: 'Adventure',
  comedy: 'Comedy',
  drama: 'Drama',
  childrens: "Children's",
  ya: 'Young Adult',
  nonfiction: 'Non-Fiction',
  selfhelp: 'Self-Help',
  business: 'Business',
  adult: 'Adult',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  generating: 'bg-blue-100 text-blue-800',
  outlining: 'bg-purple-100 text-purple-800',
  failed: 'bg-red-100 text-red-800',
};

const paymentStatusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // User selection and email state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [emailTemplate, setEmailTemplate] = useState<'welcome' | 'free_credit' | 'announcement'>('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [creditsToGift, setCreditsToGift] = useState(1);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGiftingCredits, setIsGiftingCredits] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [restartingBookId, setRestartingBookId] = useState<string | null>(null);
  const [restartResult, setRestartResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStats = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin stats');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };

  const toggleAllBooks = () => {
    if (!stats) return;
    if (selectedBooks.size === stats.recentBooks.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(stats.recentBooks.map(b => b.id)));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleAllUsers = () => {
    if (!stats) return;
    if (selectedUsers.size === stats.recentUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(stats.recentUsers.map(u => u.id)));
    }
  };

  const handleSendEmail = async () => {
    if (selectedUsers.size === 0) return;

    setIsSendingEmail(true);
    setEmailResult(null);

    try {
      const response = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          template: emailTemplate,
          customMessage: emailTemplate === 'announcement' ? customMessage : undefined,
          customSubject: emailTemplate === 'announcement' ? customSubject : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails');
      }

      setEmailResult({
        success: true,
        message: `Sent ${data.sent} email(s) successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
      setSelectedUsers(new Set());
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send emails',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGiftCredits = async () => {
    if (selectedUsers.size === 0) return;

    setIsGiftingCredits(true);
    setEmailResult(null);

    try {
      const response = await fetch('/api/admin/credits/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          credits: creditsToGift,
          sendEmailNotification: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to gift credits');
      }

      setEmailResult({
        success: true,
        message: `Gifted ${creditsToGift} credit(s) to ${data.creditsAdded} user(s), sent ${data.emailsSent} email(s)`,
      });
      setSelectedUsers(new Set());
      await fetchStats(true);
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to gift credits',
      });
    } finally {
      setIsGiftingCredits(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBooks.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${selectedBooks.size} book(s)? This cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/admin/books/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookIds: Array.from(selectedBooks) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete books');
      }

      // Clear selection and refresh stats
      setSelectedBooks(new Set());
      await fetchStats(true);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete books');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestartBook = async (bookId: string, bookTitle: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to restart "${bookTitle}" from scratch?\n\nThis will DELETE all chapters, illustrations, and generated content.\n\nThe original book input (title, premise, characters, etc.) will be kept.`
    );

    if (!confirmed) return;

    setRestartingBookId(bookId);
    setRestartResult(null);

    try {
      const response = await fetch(`/api/admin/books/${bookId}/restart`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restart book');
      }

      setRestartResult({
        success: true,
        message: data.message,
      });
      await fetchStats(true);
    } catch (err) {
      setRestartResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to restart book',
      });
    } finally {
      setRestartingBookId(null);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, [session, sessionStatus, router]);

  if (sessionStatus === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neutral-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-neutral-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-neutral-800"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Admin Dashboard
            </h1>
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Total Users</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.totalBooks.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Total Books</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.completedBooks.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Completed</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-lime-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">${stats.overview.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Revenue ({stats.overview.totalTransactions} orders)</p>
          </div>
        </div>

        {/* Book Status Breakdown */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-neutral-500" />
              Book Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Completed</span>
                </div>
                <span className="font-semibold">{stats.overview.completedBooks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-500" />
                  <span>Generating</span>
                </div>
                <span className="font-semibold">{stats.overview.generatingBooks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>Pending</span>
                </div>
                <span className="font-semibold">{stats.overview.pendingBooks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed</span>
                </div>
                <span className="font-semibold">{stats.overview.failedBooks}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-neutral-500" />
              Books by Format
            </h2>
            <div className="space-y-3">
              {stats.booksByFormat.length > 0 ? (
                stats.booksByFormat.map((item) => (
                  <div key={item.format} className="flex items-center justify-between">
                    <span>{formatLabels[item.format] || item.format}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-neutral-400 text-sm">No books yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Books by Genre */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Books by Genre</h2>
          {stats.booksByGenre.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {stats.booksByGenre.map((item) => (
                <div
                  key={item.genre}
                  className="bg-neutral-50 rounded-lg p-3 text-center"
                >
                  <p className="font-semibold text-lg">{item.count}</p>
                  <p className="text-xs text-neutral-500">{genreLabels[item.genre] || item.genre}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No books yet</p>
          )}
        </div>

        {/* Recent Books */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Books</h2>
            {selectedBooks.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-600">
                  {selectedBooks.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Selected
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          {deleteError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {deleteError}
            </div>
          )}
          {restartResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              restartResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {restartResult.message}
            </div>
          )}
          {stats.recentBooks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBooks.size === stats.recentBooks.length && stats.recentBooks.length > 0}
                        onChange={toggleAllBooks}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Title</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">User</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Format</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Genre</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Payment</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Words</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Created</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBooks.map((book) => (
                    <tr
                      key={book.id}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 ${selectedBooks.has(book.id) ? 'bg-blue-50' : ''}`}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedBooks.has(book.id)}
                          onChange={() => toggleBookSelection(book.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <a
                          href={`/book/${book.id}`}
                          className="font-medium text-neutral-900 hover:text-blue-600 truncate max-w-[200px] block"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {book.title}
                        </a>
                        <p className="text-xs text-neutral-500">{book.authorName}</p>
                      </td>
                      <td className="py-3 px-2 text-neutral-600">
                        {book.user?.email || book.email || 'Anonymous'}
                      </td>
                      <td className="py-3 px-2">
                        {formatLabels[book.bookFormat] || book.bookFormat}
                      </td>
                      <td className="py-3 px-2">
                        {genreLabels[book.genre] || book.genre}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[book.status] || 'bg-neutral-100 text-neutral-800'}`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatusColors[book.paymentStatus] || 'bg-neutral-100 text-neutral-800'}`}>
                          {book.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-neutral-600">
                        {book.totalWords.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(book.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(book.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleRestartBook(book.id, book.title)}
                          disabled={restartingBookId === book.id}
                          title="Restart from scratch (keeps original input)"
                          className="p-2 text-neutral-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {restartingBookId === book.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No books yet</p>
          )}
        </div>

        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Users</h2>
            {selectedUsers.size > 0 && (
              <span className="text-sm text-neutral-600">
                {selectedUsers.size} selected
              </span>
            )}
          </div>

          {/* Email Action Panel */}
          {selectedUsers.size > 0 && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex flex-wrap items-end gap-4">
                {/* Template Select */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Template
                  </label>
                  <select
                    value={emailTemplate}
                    onChange={(e) => setEmailTemplate(e.target.value as typeof emailTemplate)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    <option value="welcome">Thanks for Joining</option>
                    <option value="free_credit">Free Credit Notification</option>
                    <option value="announcement">Custom Announcement</option>
                  </select>
                </div>

                {/* Credits Input (for gift) */}
                <div className="w-24">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={creditsToGift}
                    onChange={(e) => setCreditsToGift(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Email
                  </button>
                  <button
                    onClick={handleGiftCredits}
                    disabled={isGiftingCredits}
                    className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-neutral-900 rounded-lg text-sm font-medium hover:bg-lime-500 disabled:opacity-50 transition-colors"
                  >
                    {isGiftingCredits ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    Gift {creditsToGift} Credit{creditsToGift > 1 ? 's' : ''}
                  </button>
                </div>
              </div>

              {/* Custom Message for Announcement */}
              {emailTemplate === 'announcement' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Your message..."
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Result Message */}
              {emailResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  emailResult.success
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {emailResult.message}
                </div>
              )}
            </div>
          )}

          {stats.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500 w-10">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === stats.recentUsers.length && stats.recentUsers.length > 0}
                        onChange={toggleAllUsers}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Plan</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Free Used</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Books</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 ${selectedUsers.has(user.id) ? 'bg-lime-50' : ''}`}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 font-medium text-neutral-900">
                        {user.email}
                      </td>
                      <td className="py-3 px-2 text-neutral-600">
                        {user.name || '-'}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.plan === 'monthly' || user.plan === 'yearly'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {user.freeBookUsed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-neutral-600">
                        {user.booksCount}
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No users yet</p>
          )}
        </div>
      </main>
    </div>
  );
}
