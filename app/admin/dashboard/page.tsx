'use client';

import React, { useEffect, useState } from 'react';
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
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Star,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import ConfirmModal from '@/components/ConfirmModal';

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
    revenueBreakdown?: Array<{ type: string; amount: number; count: number }>;
  };
  recentPayments?: Array<{
    id: string;
    email: string;
    amount: number;
    status: string;
    productType: string;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    freeBookUsed: boolean;
    freeCredits: number;
    createdAt: string;
    booksCount: number;
    authMethod: 'email' | 'google';
    emailVerified: string | null;
  }>;
  usersPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  books: Array<{
    id: string;
    title: string;
    authorName: string;
    genre: string;
    bookFormat: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    totalWords: number;
    totalChapters: number;
    currentChapter: number;
    illustrationCount: number;
    createdAt: string;
    completedAt: string | null;
    email: string | null;
    // Original book input
    premise: string | null;
    beginning: string | null;
    middle: string | null;
    ending: string | null;
    errorMessage: string | null;
    downloadedAt: string | null;
    downloadFormat: string | null;
    isFeaturedSample: boolean;
    samplePdfUrl: string | null;
    coverImageUrl: string | null;
    user: { email: string; name: string | null; plan: string; freeBookUsed: boolean } | null;
  }>;
  booksPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  booksByFormat: Array<{ format: string; count: number }>;
  dailyStats: Array<{ date: string; booksCreated: number }>;
  anonymousContacts: Array<{
    email: string;
    books: Array<{
      id: string;
      title: string;
      authorName: string;
      status: string;
      bookFormat: string;
      genre: string;
      createdAt: string;
      completedAt: string | null;
    }>;
    firstPurchase: string;
    lastPurchase: string;
  }>;
}

const formatLabels: Record<string, string> = {
  text_only: 'Novel',
  illustrated: 'Illustrated',
  picture_book: 'Picture Book',
  comic: 'Comic',
};

// Simplified neutral color palette
const statusColors: Record<string, string> = {
  completed: 'bg-neutral-900 text-white',
  pending: 'bg-neutral-200 text-neutral-700',
  generating: 'bg-neutral-600 text-white',
  outlining: 'bg-neutral-500 text-white',
  failed: 'bg-red-600 text-white',
};

const paymentMethodLabels: Record<string, string> = {
  stripe_single: 'Stripe',
  stripe_subscription: 'Subscription',
  free_book: 'Free Book',
  free_credit: 'Credit',
  promo: 'Promo',
};

const paymentMethodStyles: Record<string, string> = {
  stripe_single: 'bg-neutral-900 text-white',
  stripe_subscription: 'bg-neutral-700 text-white',
  free_book: 'bg-neutral-300 text-neutral-800',
  free_credit: 'bg-neutral-400 text-neutral-900',
  promo: 'bg-neutral-200 text-neutral-700',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // User selection and email state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [emailTemplate, setEmailTemplate] = useState<'welcome' | 'free_credit' | 'announcement' | 'bug_apology' | 'beta_feedback'>('welcome');
  const [customMessage, setCustomMessage] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [creditsToGift, setCreditsToGift] = useState(1);
  const [includeCredit, setIncludeCredit] = useState(false);
  const [emailCreditAmount, setEmailCreditAmount] = useState(1);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGiftingCredits, setIsGiftingCredits] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [restartingBookId, setRestartingBookId] = useState<string | null>(null);
  const [restartResult, setRestartResult] = useState<{ success: boolean; message: string } | null>(null);
  const [booksPage, setBooksPage] = useState(1);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [selectedAnonymous, setSelectedAnonymous] = useState<Set<string>>(new Set());
  const [isSendingAnonymousEmail, setIsSendingAnonymousEmail] = useState(false);
  const [anonymousEmailTemplate, setAnonymousEmailTemplate] = useState<'announcement' | 'bug_apology'>('announcement');
  const [anonymousCustomMessage, setAnonymousCustomMessage] = useState('');
  const [anonymousCustomSubject, setAnonymousCustomSubject] = useState('');
  const [anonymousIncludeCredit, setAnonymousIncludeCredit] = useState(false);
  const [anonymousCreditAmount, setAnonymousCreditAmount] = useState(1);

  // Search state
  const [booksSearch, setBooksSearch] = useState('');
  const [usersSearch, setUsersSearch] = useState('');

  // Confirmation modal state
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [restartBookData, setRestartBookData] = useState<{ id: string; title: string } | null>(null);
  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(false);
  const [isDeletingUsers, setIsDeletingUsers] = useState(false);
  const [deleteUsersError, setDeleteUsersError] = useState('');

  // Email logs state
  const [emailLogs, setEmailLogs] = useState<Array<{
    id: string;
    to: string;
    subject: string;
    template: string;
    status: string;
    error: string | null;
    userId: string | null;
    createdAt: string;
  }>>([]);
  const [emailLogsPage, setEmailLogsPage] = useState(1);
  const [emailLogsTotalPages, setEmailLogsTotalPages] = useState(1);
  const [emailLogsTotal, setEmailLogsTotal] = useState(0);
  const [isLoadingEmailLogs, setIsLoadingEmailLogs] = useState(false);
  const [emailLogsFilter, setEmailLogsFilter] = useState<'all' | 'sent' | 'failed'>('all');

  // Site settings state
  const [trafficWarningEnabled, setTrafficWarningEnabled] = useState(false);
  const [isTogglingTrafficWarning, setIsTogglingTrafficWarning] = useState(false);

  const fetchStats = async (showRefresh = false, booksPg = booksPage, usersPg = usersPage, booksSearchQuery = booksSearch, usersSearchQuery = usersSearch) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const params = new URLSearchParams({
        booksPage: booksPg.toString(),
        booksLimit: '50',
        usersPage: usersPg.toString(),
        usersLimit: '50',
      });
      if (booksSearchQuery) params.set('booksSearch', booksSearchQuery);
      if (usersSearchQuery) params.set('usersSearch', usersSearchQuery);
      const response = await fetch(`/api/admin/stats?${params.toString()}`);
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
    if (selectedBooks.size === stats.books.length) {
      setSelectedBooks(new Set());
    } else {
      setSelectedBooks(new Set(stats.books.map(b => b.id)));
    }
  };

  const toggleBookExpanded = (bookId: string) => {
    setExpandedBooks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
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
    if (selectedUsers.size === stats.users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(stats.users.map(u => u.id)));
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
          includeCredit: emailTemplate === 'announcement' ? includeCredit : undefined,
          creditAmount: emailTemplate === 'announcement' && includeCredit ? emailCreditAmount : undefined,
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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setSelectedUsers(new Set());
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send emails',
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setSelectedUsers(new Set());
      await fetchStats(true);
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to gift credits',
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsGiftingCredits(false);
    }
  };

  const handleDeleteUsers = () => {
    if (selectedUsers.size === 0) return;
    setShowUserDeleteConfirm(true);
  };

  const confirmDeleteUsers = async () => {
    setIsDeletingUsers(true);
    setDeleteUsersError('');

    try {
      const response = await fetch('/api/admin/users/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          deleteBooks: true, // Also delete their books
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete users');
      }

      setEmailResult({
        success: true,
        message: `Deleted ${data.deletedCount} user(s) and ${data.booksDeleted} book(s)`,
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setSelectedUsers(new Set());
      setShowUserDeleteConfirm(false);
      await fetchStats(true);
    } catch (err) {
      setDeleteUsersError(err instanceof Error ? err.message : 'Failed to delete users');
    } finally {
      setIsDeletingUsers(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBooks.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
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

  const handleRestartBook = (bookId: string, bookTitle: string) => {
    setRestartBookData({ id: bookId, title: bookTitle });
    setShowRestartConfirm(true);
  };

  const confirmRestartBook = async () => {
    if (!restartBookData) return;

    const { id: bookId } = restartBookData;
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

      // After successful restart, trigger outline generation
      // This moves the book from 'pending' to 'generating' so orchestration can start
      try {
        const genRes = await fetch(`/api/books/${bookId}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outlineOnly: true }),
        });
        if (genRes.ok) {
          setRestartResult({
            success: true,
            message: `${data.message} Generation started.`,
          });
        } else {
          setRestartResult({
            success: true,
            message: `${data.message} Note: Auto-start failed, visit book page to resume.`,
          });
        }
      } catch {
        setRestartResult({
          success: true,
          message: `${data.message} Note: Auto-start failed, visit book page to resume.`,
        });
      }
      await fetchStats(true);
    } catch (err) {
      setRestartResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to restart book',
      });
    } finally {
      setRestartingBookId(null);
      setRestartBookData(null);
    }
  };

  const handleBooksPageChange = async (newPage: number) => {
    setIsLoadingBooks(true);
    setBooksPage(newPage);
    await fetchStats(false, newPage, usersPage);
    setIsLoadingBooks(false);
  };

  const handleUsersPageChange = async (newPage: number) => {
    setIsLoadingUsers(true);
    setUsersPage(newPage);
    await fetchStats(false, booksPage, newPage);
    setIsLoadingUsers(false);
  };

  const toggleAnonymousSelection = (email: string) => {
    setSelectedAnonymous(prev => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const toggleAllAnonymous = () => {
    if (!stats) return;
    if (selectedAnonymous.size === stats.anonymousContacts.length) {
      setSelectedAnonymous(new Set());
    } else {
      setSelectedAnonymous(new Set(stats.anonymousContacts.map(c => c.email)));
    }
  };

  const handleSendAnonymousEmail = async () => {
    if (selectedAnonymous.size === 0) return;

    setIsSendingAnonymousEmail(true);
    setEmailResult(null);

    try {
      const response = await fetch('/api/admin/email/send-anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: Array.from(selectedAnonymous),
          template: anonymousEmailTemplate,
          customMessage: anonymousEmailTemplate === 'announcement' ? anonymousCustomMessage : undefined,
          customSubject: anonymousEmailTemplate === 'announcement' ? anonymousCustomSubject : undefined,
          includeCredit: anonymousEmailTemplate === 'announcement' ? anonymousIncludeCredit : undefined,
          creditAmount: anonymousEmailTemplate === 'announcement' && anonymousIncludeCredit ? anonymousCreditAmount : undefined,
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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      setSelectedAnonymous(new Set());
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send emails',
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsSendingAnonymousEmail(false);
    }
  };

  const fetchEmailLogs = async (page = 1, filter: 'all' | 'sent' | 'failed' = 'all') => {
    setIsLoadingEmailLogs(true);
    try {
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const response = await fetch(`/api/admin/email-logs?page=${page}&limit=20${statusParam}`);
      const data = await response.json();

      if (response.ok) {
        setEmailLogs(data.logs);
        setEmailLogsPage(data.pagination.page);
        setEmailLogsTotalPages(data.pagination.totalPages);
        setEmailLogsTotal(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
    } finally {
      setIsLoadingEmailLogs(false);
    }
  };

  const fetchSiteSettings = async () => {
    try {
      const response = await fetch('/api/admin/site-settings');
      if (response.ok) {
        const data = await response.json();
        setTrafficWarningEnabled(data.trafficWarningEnabled);
      }
    } catch (err) {
      console.error('Failed to fetch site settings:', err);
    }
  };

  const toggleTrafficWarning = async () => {
    setIsTogglingTrafficWarning(true);
    try {
      const response = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trafficWarningEnabled: !trafficWarningEnabled }),
      });
      if (response.ok) {
        setTrafficWarningEnabled(!trafficWarningEnabled);
      }
    } catch (err) {
      console.error('Failed to toggle traffic warning:', err);
    } finally {
      setIsTogglingTrafficWarning(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetchStats();
    fetchEmailLogs();
    fetchSiteSettings();
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
      {/* Toast Notification */}
      {showToast && emailResult && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border ${
            emailResult.success
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {emailResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            )}
            <span className="font-medium">{emailResult.message}</span>
            <button
              onClick={() => setShowToast(false)}
              className="ml-2 text-neutral-400 hover:text-neutral-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-4">
            {/* Traffic Warning Toggle */}
            <div className="flex items-center gap-3 px-4 py-2 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${trafficWarningEnabled ? 'bg-amber-500 animate-pulse' : 'bg-neutral-300'}`} />
                <span className="text-sm font-medium text-neutral-700">Traffic Warning</span>
              </div>
              <button
                onClick={toggleTrafficWarning}
                disabled={isTogglingTrafficWarning}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-50 ${
                  trafficWarningEnabled ? 'bg-amber-500' : 'bg-neutral-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                    trafficWarningEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Cards - Clean monochrome design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-neutral-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Total Users</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-neutral-600" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.totalBooks.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Total Books</p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.overview.completedBooks.toLocaleString()}</p>
            <p className="text-sm text-neutral-500">Completed</p>
          </div>

          <div className="bg-neutral-900 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold">${stats.overview.totalRevenue.toLocaleString()}</p>
            <p className="text-sm text-neutral-300">{stats.overview.totalTransactions} paid orders</p>
            {stats.overview.revenueBreakdown && stats.overview.revenueBreakdown.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
                {stats.overview.revenueBreakdown.map((item) => (
                  <div key={item.type} className="flex justify-between text-xs">
                    <span className="text-neutral-400">{item.type}</span>
                    <span>${item.amount} ({item.count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payments Debug (temporary - remove when revenue issue is fixed) */}
        {stats.recentPayments && stats.recentPayments.length > 0 && (
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-8">
            <h3 className="text-sm font-semibold mb-2">Recent Payments (Debug)</h3>
            <div className="text-xs space-y-1 text-neutral-600">
              {stats.recentPayments.map((p) => (
                <div key={p.id} className="flex gap-4">
                  <span className={p.status === 'completed' ? 'text-neutral-900 font-medium' : 'text-neutral-400'}>{p.status}</span>
                  <span>${p.amount}</span>
                  <span>{p.productType}</span>
                  <span>{p.email}</span>
                  <span className="text-neutral-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <CheckCircle className="h-4 w-4 text-neutral-900" />
                  <span>Completed</span>
                </div>
                <span className="font-semibold">{stats.overview.completedBooks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-neutral-500" />
                  <span>Generating</span>
                </div>
                <span className="font-semibold">{stats.overview.generatingBooks}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-neutral-400" />
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

        {/* Featured Content Management */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Featured Showcase
              </h2>
              <span className="text-sm text-neutral-500">
                ({stats.books.filter(b => b.isFeaturedSample).length}/8 slots filled)
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              Toggle &quot;Featured&quot; on books below to add them to the homepage showcase
            </p>
          </div>

          {/* Featured Items Grid */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {Array.from({ length: 8 }).map((_, i) => {
              const featuredBooks = stats.books.filter(b => b.isFeaturedSample);
              const book = featuredBooks[i];

              return (
                <div
                  key={i}
                  className={`aspect-[3/4] rounded-lg border-2 overflow-hidden ${
                    book
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-dashed border-neutral-200 bg-neutral-50'
                  }`}
                >
                  {book ? (
                    <div className="h-full flex flex-col">
                      {book.coverImageUrl ? (
                        <div className="flex-1 relative">
                          <Image
                            src={book.coverImageUrl}
                            alt={book.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center bg-neutral-100">
                          <BookOpen className="h-6 w-6 text-neutral-300" />
                        </div>
                      )}
                      <div className="p-1.5 bg-white border-t border-neutral-100">
                        <p className="text-[10px] font-medium text-neutral-900 truncate">{book.title}</p>
                        <p className="text-[9px] text-neutral-500 truncate">
                          {book.bookFormat === 'screenplay' ? 'Script' :
                           book.bookFormat === 'comic' ? 'Comic' :
                           book.bookFormat === 'picture_book' ? 'Picture' : 'Novel'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center mb-1">
                        <span className="text-neutral-400 text-xs font-medium">{i + 1}</span>
                      </div>
                      <span className="text-[9px] text-neutral-400 text-center">Empty slot</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-neutral-400 mt-3">
            Expand a book in the list below and click &quot;Feature on Homepage&quot; to add it to the showcase.
          </p>
        </div>

        {/* All Books */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">All Books</h2>
              {stats.booksPagination && (
                <span className="text-sm text-neutral-500">
                  ({stats.booksPagination.total} total)
                </span>
              )}
              {isLoadingBooks && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search books..."
                  value={booksSearch}
                  onChange={(e) => {
                    setBooksSearch(e.target.value);
                    setBooksPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchStats(false, 1, usersPage, booksSearch, usersSearch);
                    }
                  }}
                  className="w-48 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                />
                {booksSearch && (
                  <button
                    onClick={() => {
                      setBooksSearch('');
                      setBooksPage(1);
                      fetchStats(false, 1, usersPage, '', usersSearch);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchStats(false, 1, usersPage, booksSearch, usersSearch)}
                className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Search
              </button>
              {selectedBooks.size > 0 && (
                <>
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
                </>
              )}
            </div>
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
          {stats.books.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500 w-10">
                      <input
                        type="checkbox"
                        checked={selectedBooks.size === stats.books.length && stats.books.length > 0}
                        onChange={toggleAllBooks}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Title</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">User</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Format</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Paid Via</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Words</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Created</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Downloaded</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.books.map((book) => (
                    <React.Fragment key={book.id}>
                    <tr
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
                      <td className="py-3 px-2 text-neutral-600 text-xs">
                        {book.user?.email || book.email || 'Anonymous'}
                      </td>
                      <td className="py-3 px-2 text-xs text-neutral-600">
                        {formatLabels[book.bookFormat] || book.bookFormat}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[book.status] || 'bg-neutral-100 text-neutral-800'}`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {/* Determine payment method from book data */}
                        {(() => {
                          // If paymentMethod is set, use it
                          if (book.paymentMethod) {
                            return (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentMethodStyles[book.paymentMethod] || 'bg-neutral-100 text-neutral-800'}`}>
                                {paymentMethodLabels[book.paymentMethod] || book.paymentMethod}
                              </span>
                            );
                          }
                          // Infer from other data
                          if (book.paymentStatus === 'completed') {
                            // Check if user has subscription
                            if (book.user?.plan === 'monthly' || book.user?.plan === 'yearly') {
                              return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-700 text-white">Sub</span>;
                            }
                            // Has a registered user - could be free or paid
                            if (book.user?.freeBookUsed === false) {
                              return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-300 text-neutral-800">Free</span>;
                            }
                            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-900 text-white">Stripe</span>;
                          }
                          return <span className="text-neutral-400 text-xs">-</span>;
                        })()}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 text-xs">
                        {book.totalWords.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(book.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(book.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-2">
                        {book.downloadedAt ? (
                          <div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-900 text-white">
                              {book.downloadFormat?.toUpperCase() || 'YES'}
                            </span>
                            <div className="text-xs text-neutral-400 mt-1">
                              {new Date(book.downloadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          {/* Expand/Collapse */}
                          <button
                            onClick={() => toggleBookExpanded(book.id)}
                            title={expandedBooks.has(book.id) ? "Hide details" : "Show original idea"}
                            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                          >
                            {expandedBooks.has(book.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          {/* View Book */}
                          <a
                            href={`/book/${book.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View book page"
                            className="p-2 text-neutral-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          {/* Download (only for completed) */}
                          {book.status === 'completed' && (
                            <a
                              href={`/api/books/${book.id}/download`}
                              title="Download book"
                              className="p-2 text-neutral-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          {/* Restart */}
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
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Book Details */}
                    {expandedBooks.has(book.id) && (
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <td colSpan={10} className="py-4 px-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Premise */}
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                Premise / Idea
                              </label>
                              <p className="text-sm text-neutral-700 bg-white rounded-lg p-3 border border-neutral-200">
                                {book.premise || <span className="text-neutral-400 italic">No premise provided</span>}
                              </p>
                            </div>
                            {/* Beginning */}
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                Beginning
                              </label>
                              <p className="text-sm text-neutral-700 bg-white rounded-lg p-3 border border-neutral-200 min-h-[60px]">
                                {book.beginning || <span className="text-neutral-400 italic">No beginning specified</span>}
                              </p>
                            </div>
                            {/* Middle */}
                            <div>
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                Middle
                              </label>
                              <p className="text-sm text-neutral-700 bg-white rounded-lg p-3 border border-neutral-200 min-h-[60px]">
                                {book.middle || <span className="text-neutral-400 italic">No middle specified</span>}
                              </p>
                            </div>
                            {/* Ending */}
                            <div className="md:col-span-2">
                              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
                                Ending
                              </label>
                              <p className="text-sm text-neutral-700 bg-white rounded-lg p-3 border border-neutral-200">
                                {book.ending || <span className="text-neutral-400 italic">No ending specified</span>}
                              </p>
                            </div>
                            {/* Error Message (if failed) */}
                            {book.errorMessage && (
                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">
                                  Error Message
                                </label>
                                <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 border border-red-200">
                                  {book.errorMessage}
                                </p>
                              </div>
                            )}
                            {/* Featured Sample Controls (only for completed books) */}
                            {book.status === 'completed' && (
                              <div className="md:col-span-2 mt-4 pt-4 border-t border-neutral-200">
                                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                                  Homepage Sample
                                </label>
                                <div className="flex items-center gap-4 bg-white rounded-lg p-4 border border-neutral-200">
                                  <div className="flex items-center gap-2">
                                    {book.isFeaturedSample ? (
                                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                    ) : (
                                      <Star className="h-5 w-5 text-neutral-300" />
                                    )}
                                    <span className="text-sm font-medium">
                                      {book.isFeaturedSample ? 'Featured Sample' : 'Not Featured'}
                                    </span>
                                  </div>
                                  {book.samplePdfUrl && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                      PDF Uploaded
                                    </span>
                                  )}
                                  <div className="flex-1" />
                                  <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
                                    <Upload className="h-4 w-4" />
                                    Upload Sample PDF
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      className="hidden"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const formData = new FormData();
                                        formData.append('action', 'upload');
                                        formData.append('pdf', file);
                                        try {
                                          const res = await fetch(`/api/admin/books/${book.id}/sample`, {
                                            method: 'POST',
                                            body: formData,
                                          });
                                          if (res.ok) {
                                            alert('Sample PDF uploaded! Refresh to see changes.');
                                          } else {
                                            const data = await res.json();
                                            alert(data.error || 'Upload failed');
                                          }
                                        } catch {
                                          alert('Upload failed');
                                        }
                                      }}
                                    />
                                  </label>
                                  {book.isFeaturedSample && (
                                    <button
                                      onClick={async () => {
                                        const formData = new FormData();
                                        formData.append('action', 'remove');
                                        try {
                                          const res = await fetch(`/api/admin/books/${book.id}/sample`, {
                                            method: 'POST',
                                            body: formData,
                                          });
                                          if (res.ok) {
                                            alert('Sample removed. Refresh to see changes.');
                                          }
                                        } catch {
                                          alert('Failed to remove sample');
                                        }
                                      }}
                                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No books yet</p>
          )}

          {/* Pagination */}
          {stats.booksPagination && stats.booksPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                Page {stats.booksPagination.page} of {stats.booksPagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBooksPageChange(booksPage - 1)}
                  disabled={booksPage <= 1 || isLoadingBooks}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => handleBooksPageChange(booksPage + 1)}
                  disabled={booksPage >= stats.booksPagination.totalPages || isLoadingBooks}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Users */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">All Users</h2>
              {stats.usersPagination && (
                <span className="text-sm text-neutral-500">
                  ({stats.usersPagination.total} total)
                </span>
              )}
              {isLoadingUsers && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
            </div>
            <div className="flex items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchStats(false, booksPage, 1, booksSearch, usersSearch);
                    }
                  }}
                  className="w-48 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                />
                {usersSearch && (
                  <button
                    onClick={() => {
                      setUsersSearch('');
                      setUsersPage(1);
                      fetchStats(false, booksPage, 1, booksSearch, '');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => fetchStats(false, booksPage, 1, booksSearch, usersSearch)}
                className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Search
              </button>
              {selectedUsers.size > 0 && (
                <span className="text-sm text-neutral-600">
                  {selectedUsers.size} selected
                </span>
              )}
            </div>
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
                    <option value="free_credit">Account Updated</option>
                    <option value="announcement">Custom Announcement</option>
                    <option value="bug_apology">Bug Apology (+ 1 book)</option>
                    <option value="beta_feedback">Beta Feedback Request</option>
                  </select>
                </div>

                {/* Credits Input (for gift) */}
                <div className="w-24">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={creditsToGift}
                    onChange={(e) => setCreditsToGift(parseInt(e.target.value) || 0)}
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
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-200 text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                  >
                    {isGiftingCredits ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    Gift {creditsToGift} Credit{creditsToGift > 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={handleDeleteUsers}
                    disabled={isDeletingUsers}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isDeletingUsers ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Delete Users
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

                  {/* Include Credit Gift Option */}
                  <div className="flex items-center gap-4 pt-2 border-t border-neutral-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCredit}
                        onChange={(e) => setIncludeCredit(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        Include claimable credit gift
                      </span>
                    </label>
                    {includeCredit && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={emailCreditAmount}
                          onChange={(e) => setEmailCreditAmount(parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                        />
                        <span className="text-sm text-neutral-500">credit{emailCreditAmount > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  {includeCredit && (
                    <p className="text-xs text-neutral-500">
                      A unique claim link will be generated for each user. Credits are only added when they click the button.
                    </p>
                  )}
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

          {stats.users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500 w-10">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === stats.users.length && stats.users.length > 0}
                        onChange={toggleAllUsers}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Name</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Auth</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Verified</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Plan</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Free Used</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Credits</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Books</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 ${selectedUsers.has(user.id) ? 'bg-neutral-100' : ''}`}
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
                          user.authMethod === 'google'
                            ? 'bg-neutral-800 text-white'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {user.authMethod === 'google' ? 'G' : 'E'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {user.emailVerified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.plan === 'monthly' || user.plan === 'yearly'
                            ? 'bg-neutral-900 text-white'
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
                        {user.freeCredits > 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-700 text-white">
                            {user.freeCredits}
                          </span>
                        ) : (
                          <span className="text-neutral-400">0</span>
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

          {/* Users Pagination */}
          {stats.usersPagination && stats.usersPagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                Page {stats.usersPagination.page} of {stats.usersPagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUsersPageChange(usersPage - 1)}
                  disabled={usersPage <= 1 || isLoadingUsers}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => handleUsersPageChange(usersPage + 1)}
                  disabled={usersPage >= stats.usersPagination.totalPages || isLoadingUsers}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Anonymous Contacts (non-registered purchasers) */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Anonymous Purchasers</h2>
              <span className="text-sm text-neutral-500">
                ({stats.anonymousContacts?.length || 0} contacts)
              </span>
              <span className="px-2 py-0.5 text-xs font-medium bg-neutral-200 text-neutral-700 rounded-full">
                Not Registered
              </span>
            </div>
            {selectedAnonymous.size > 0 && (
              <span className="text-sm text-neutral-600">
                {selectedAnonymous.size} selected
              </span>
            )}
          </div>

          {/* Email Action Panel for Anonymous */}
          {selectedAnonymous.size > 0 && (
            <div className="mb-6 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex flex-wrap items-end gap-4">
                {/* Template Select */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email Template
                  </label>
                  <select
                    value={anonymousEmailTemplate}
                    onChange={(e) => setAnonymousEmailTemplate(e.target.value as typeof anonymousEmailTemplate)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  >
                    <option value="announcement">Custom Announcement</option>
                    <option value="bug_apology">Bug Apology (+ 1 free credit)</option>
                  </select>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleSendAnonymousEmail}
                  disabled={isSendingAnonymousEmail || (anonymousEmailTemplate === 'announcement' && !anonymousCustomMessage)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                >
                  {isSendingAnonymousEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Email
                </button>
              </div>

              {/* Custom Message for Announcement */}
              {anonymousEmailTemplate === 'announcement' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={anonymousCustomSubject}
                      onChange={(e) => setAnonymousCustomSubject(e.target.value)}
                      placeholder="Email subject..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={anonymousCustomMessage}
                      onChange={(e) => setAnonymousCustomMessage(e.target.value)}
                      placeholder="Your message..."
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Include Credit Gift Option */}
                  <div className="flex items-center gap-4 pt-2 border-t border-neutral-200">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={anonymousIncludeCredit}
                        onChange={(e) => setAnonymousIncludeCredit(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        Include claimable credit gift
                      </span>
                    </label>
                    {anonymousIncludeCredit && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={anonymousCreditAmount}
                          onChange={(e) => setAnonymousCreditAmount(parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-neutral-500 focus:border-transparent"
                        />
                        <span className="text-sm text-neutral-500">credit{anonymousCreditAmount > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  {anonymousIncludeCredit && (
                    <p className="text-xs text-neutral-500">
                      Credits will be claimable via a unique link. They must register to claim.
                    </p>
                  )}
                </div>
              )}

              {anonymousEmailTemplate === 'bug_apology' && (
                <p className="mt-3 text-sm text-neutral-600">
                  This will send an apology email with a link to claim 1 free credit. They must register to claim.
                </p>
              )}
            </div>
          )}

          {stats.anonymousContacts && stats.anonymousContacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500 w-10">
                      <input
                        type="checkbox"
                        checked={selectedAnonymous.size === stats.anonymousContacts.length && stats.anonymousContacts.length > 0}
                        onChange={toggleAllAnonymous}
                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Books</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Latest Book</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">First Purchase</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Last Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.anonymousContacts.map((contact) => (
                    <tr
                      key={contact.email}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 ${selectedAnonymous.has(contact.email) ? 'bg-neutral-100' : ''}`}
                    >
                      <td className="py-3 px-2">
                        <input
                          type="checkbox"
                          checked={selectedAnonymous.has(contact.email)}
                          onChange={() => toggleAnonymousSelection(contact.email)}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-2 font-medium text-neutral-900">
                        {contact.email}
                      </td>
                      <td className="py-3 px-2 text-neutral-600">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                          {contact.books.length}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <a
                          href={`/book/${contact.books[0]?.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-900 hover:text-blue-600 truncate max-w-[200px] block"
                        >
                          {contact.books[0]?.title}
                        </a>
                        <p className="text-xs text-neutral-500">{contact.books[0]?.authorName}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[contact.books[0]?.status] || 'bg-neutral-100 text-neutral-800'}`}>
                          {contact.books[0]?.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(contact.firstPurchase).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(contact.firstPurchase).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(contact.lastPurchase).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(contact.lastPurchase).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No anonymous purchasers yet</p>
          )}
        </div>

        {/* Email Logs */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-neutral-500" />
                Email Logs
              </h2>
              <span className="text-sm text-neutral-500">
                ({emailLogsTotal} total)
              </span>
              {isLoadingEmailLogs && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={emailLogsFilter}
                onChange={(e) => {
                  const newFilter = e.target.value as 'all' | 'sent' | 'failed';
                  setEmailLogsFilter(newFilter);
                  fetchEmailLogs(1, newFilter);
                }}
                className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={() => fetchEmailLogs(emailLogsPage, emailLogsFilter)}
                className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {emailLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">To</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Subject</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Template</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Error</th>
                    <th className="text-left py-3 px-2 font-medium text-neutral-500">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-b border-neutral-100 hover:bg-neutral-50 ${log.status === 'failed' ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="py-3 px-2 font-medium text-neutral-900 max-w-[200px] truncate">
                        {log.to}
                      </td>
                      <td className="py-3 px-2 text-neutral-600 max-w-[250px] truncate">
                        {log.subject}
                      </td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                          {log.template}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-red-600 text-xs max-w-[200px] truncate" title={log.error || undefined}>
                        {log.error || '-'}
                      </td>
                      <td className="py-3 px-2 text-neutral-500">
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-neutral-400">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-400 text-sm">No email logs yet</p>
          )}

          {/* Email Logs Pagination */}
          {emailLogsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                Page {emailLogsPage} of {emailLogsTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchEmailLogs(emailLogsPage - 1, emailLogsFilter)}
                  disabled={emailLogsPage <= 1 || isLoadingEmailLogs}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => fetchEmailLogs(emailLogsPage + 1, emailLogsFilter)}
                  disabled={emailLogsPage >= emailLogsTotalPages || isLoadingEmailLogs}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Books Permanently"
        message={`Are you sure you want to permanently delete ${selectedBooks.size} book(s)? This action cannot be undone.`}
        confirmText="Delete Books"
        cancelText="Cancel"
        type="danger"
      />

      {/* Restart Book Confirmation Modal */}
      <ConfirmModal
        isOpen={showRestartConfirm}
        onClose={() => {
          setShowRestartConfirm(false);
          setRestartBookData(null);
        }}
        onConfirm={confirmRestartBook}
        title="Restart Book from Scratch"
        message={restartBookData ? `Are you sure you want to restart "${restartBookData.title}" from scratch? This will DELETE all chapters, illustrations, and generated content. The original book input (title, premise, characters, etc.) will be kept.` : ''}
        confirmText="Restart Book"
        cancelText="Cancel"
        type="warning"
      />

      {/* Delete Users Confirmation Modal */}
      <ConfirmModal
        isOpen={showUserDeleteConfirm}
        onClose={() => {
          setShowUserDeleteConfirm(false);
          setDeleteUsersError('');
        }}
        onConfirm={confirmDeleteUsers}
        title="Delete Users Permanently"
        message={`Are you sure you want to permanently delete ${selectedUsers.size} user(s)? This will also delete ALL their books, chapters, and illustrations. They will need to register again. This action cannot be undone.${deleteUsersError ? `\n\nError: ${deleteUsersError}` : ''}`}
        confirmText="Delete Users"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
