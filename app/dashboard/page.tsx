'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BookOpen, Plus, Download, Clock, Check, AlertCircle, Zap, Star } from 'lucide-react';
import { trackRedditPurchase } from '@/lib/reddit-pixel';
import { PRICING } from '@/lib/constants';

interface Book {
  id: string;
  title: string;
  genre: string;
  status: string;
  currentChapter: number;
  totalChapters: number;
  totalWords: number;
  coverImageUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  isFeaturedSample: boolean;
}

interface UserInfo {
  plan: string;
  credits: number;
  freeCredits: number;
  totalCredits: number;
  hasFirstBookFree: boolean;
  isAdmin: boolean;
}

export default function Dashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');

  // Track Reddit purchase conversion for subscription signups
  const purchaseTrackedRef = useRef(false);
  useEffect(() => {
    if (success === 'true' && !purchaseTrackedRef.current) {
      purchaseTrackedRef.current = true;
      // Monthly subscription price
      trackRedditPurchase(PRICING.MONTHLY.price / 100, 'USD', 1);
    }
  }, [success]);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (sessionStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard');
      return;
    }

    // Fetch books and user info when session is available
    if (sessionStatus === 'authenticated' && session?.user) {
      const fetchData = async () => {
        try {
          const userId = (session.user as { id?: string }).id;
          const email = session.user.email;

          // Pass both userId AND email to find all user's books
          const params = new URLSearchParams();
          if (userId) params.set('userId', userId);
          if (email) params.set('email', email);

          // Fetch books and user info in parallel
          const [booksResponse, userResponse] = await Promise.all([
            fetch(`/api/books?${params.toString()}`),
            fetch('/api/user'),
          ]);

          if (booksResponse.ok) {
            const data = await booksResponse.json();
            setBooks(data.books || []);
          }

          if (userResponse.ok) {
            const data = await userResponse.json();
            setUserInfo(data.user);
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [session, sessionStatus, router]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'generating':
      case 'outlining':
        return <Clock className="h-4 w-4 text-neutral-900" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  // Toggle featured status (admin only)
  const toggleFeatured = async (e: React.MouseEvent, bookId: string) => {
    e.preventDefault(); // Prevent navigation to book page
    e.stopPropagation();

    try {
      const formData = new FormData();
      formData.append('action', 'toggle');

      const res = await fetch(`/api/admin/books/${bookId}/sample`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setBooks(books.map(book =>
          book.id === bookId
            ? { ...book, isFeaturedSample: data.isFeaturedSample }
            : book
        ));
      }
    } catch (error) {
      console.error('Failed to toggle featured:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              My Books
            </h1>
            <Link
              href="/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors font-medium"
            >
              <Plus className="h-5 w-5" /> New Book
            </Link>
          </div>

          {/* Plan & Credits Section */}
          {userInfo && (
            <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
              {/* Current Plan Badge */}
              <div className={`px-3 py-1.5 rounded-lg font-medium ${
                userInfo.plan === 'yearly'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : userInfo.plan === 'monthly'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
              }`}>
                {userInfo.plan === 'yearly' ? 'Yearly Plan' : userInfo.plan === 'monthly' ? 'Monthly Plan' : 'Free Plan'}
              </div>
              {userInfo.hasFirstBookFree && (
                <Link
                  href="/create"
                  className="px-3 py-1.5 bg-lime-100 border border-lime-200 rounded-lg hover:bg-lime-200 transition-colors font-medium text-lime-800"
                >
                  Free sample
                </Link>
              )}
              {userInfo.totalCredits > 0 && (
                <Link
                  href="/create"
                  className="px-3 py-1.5 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors font-medium text-neutral-900"
                >
                  Credits: {userInfo.totalCredits}
                </Link>
              )}
              {!userInfo.hasFirstBookFree && userInfo.totalCredits === 0 && userInfo.plan === 'free' && (
                <span className="text-neutral-500">No credits</span>
              )}
              {/* Upgrade Plan Button */}
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors font-medium"
              >
                <Zap className="h-4 w-4" />
                {userInfo.plan === 'free' ? 'Upgrade Plan' : 'Manage Plan'}
              </Link>
            </div>
          )}

          {loading || sessionStatus === 'loading' ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading your books...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-10 w-10 text-neutral-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                No books yet
              </h2>
              <p className="text-neutral-600 mb-8">Create your first AI-generated book</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors font-medium"
              >
                <Plus className="h-5 w-5" /> Create Your First Book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.id}`}
                  className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-[3/4] relative bg-neutral-100">
                    {book.coverImageUrl ? (
                      <img
                        src={book.coverImageUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-neutral-400" />
                      </div>
                    )}
                    {/* Admin: Feature on homepage button */}
                    {userInfo?.isAdmin && book.status === 'completed' && (
                      <button
                        onClick={(e) => toggleFeatured(e, book.id)}
                        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                          book.isFeaturedSample
                            ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                            : 'bg-white/80 text-neutral-400 hover:bg-white hover:text-yellow-500'
                        }`}
                        title={book.isFeaturedSample ? 'Remove from homepage' : 'Feature on homepage'}
                      >
                        <Star className={`h-4 w-4 ${book.isFeaturedSample ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-1 truncate">{book.title}</h3>
                    <p className="text-sm text-neutral-600 mb-2">{book.genre}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm">
                        {getStatusIcon(book.status)}
                        <span className="capitalize text-neutral-600">{book.status}</span>
                      </div>
                      {book.status === 'completed' && (
                        <Download className="h-4 w-4 text-neutral-900" />
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
