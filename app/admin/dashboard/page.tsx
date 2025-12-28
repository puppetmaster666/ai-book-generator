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
          <h2 className="text-lg font-semibold mb-4">Recent Books</h2>
          {stats.recentBooks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Title</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">User</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Format</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Genre</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Payment</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Words</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBooks.map((book) => (
                    <tr key={book.id} className="border-b border-neutral-100 hover:bg-neutral-50">
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
                        {new Date(book.createdAt).toLocaleDateString()}
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
          <h2 className="text-lg font-semibold mb-4">Recent Users</h2>
          {stats.recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
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
                    <tr key={user.id} className="border-b border-neutral-100 hover:bg-neutral-50">
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
                        {new Date(user.createdAt).toLocaleDateString()}
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
