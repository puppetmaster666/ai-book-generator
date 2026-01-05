'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const bookId = searchParams.get('bookId');
  const isFreeBook = searchParams.get('free') === 'true';
  const callbackUrl = searchParams.get('callbackUrl');
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // Claim book for user after authentication
  const claimBook = async (): Promise<{ success: boolean; error?: string }> => {
    if (!bookId) return { success: false, error: 'No book ID' };
    try {
      if (isFreeBook) {
        // Use the free book claim endpoint
        const res = await fetch(`/api/books/${bookId}/claim-free`, {
          method: 'POST',
        });
        const data = await res.json();
        if (!res.ok) {
          console.error('Claim free book error:', data);
          return { success: false, error: data.error || 'Failed to claim book' };
        }
        return { success: true };
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to claim book:', err);
      return { success: false, error: 'Network error while claiming book' };
    }
  };

  // Redirect logged-in users to checkout or dashboard
  useEffect(() => {
    if (status === 'authenticated' && session && !isClaiming) {
      const handlePostAuth = async () => {
        // Claim the book if there's a bookId with free=true
        if (bookId && isFreeBook) {
          setIsClaiming(true);
          const result = await claimBook();
          if (result.success) {
            // Redirect to book page to start generation
            router.push(`/book/${bookId}`);
            return;
          } else {
            // Show error but still redirect to book page - the user is authenticated
            // They can see their book status there
            console.error('Claim failed:', result.error);
            setError(result.error || 'Failed to claim free book');
            // Still redirect to book page - they're logged in and own the book now
            router.push(`/book/${bookId}`);
            return;
          }
        }

        if (callbackUrl) {
          router.push(callbackUrl);
        } else if (plan) {
          router.push(`/checkout?plan=${plan}`);
        } else if (bookId) {
          // If there's a bookId but no free flag, go to checkout
          router.push(`/checkout?bookId=${bookId}`);
        } else {
          router.push('/dashboard');
        }
      };

      handlePostAuth();
    }
  }, [status, session, plan, bookId, isFreeBook, callbackUrl, router, isClaiming]);

  // Show loading while checking session or claiming book
  if (status === 'loading' || (status === 'authenticated' && session) || isClaiming) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-900 mx-auto mb-4" />
          {isClaiming && (
            <p className="text-neutral-600">Claiming your free book...</p>
          )}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Register the user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but failed to sign in. Please try logging in.');
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Build callback URL
      let redirectUrl = '/dashboard';
      if (callbackUrl) {
        redirectUrl = callbackUrl;
      } else if (bookId && isFreeBook) {
        // For free book claims, redirect back to this signup page
        // The useEffect will handle the claim after auth
        redirectUrl = `/signup?bookId=${bookId}&free=true`;
      } else if (plan) {
        redirectUrl = `/checkout?plan=${plan}`;
      } else if (bookId) {
        redirectUrl = `/checkout?bookId=${bookId}`;
      }
      await signIn('google', { callbackUrl: redirectUrl });
    } catch (err) {
      setError('Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              {isFreeBook ? 'Try Free Sample' : 'Create Account'}
            </h1>
            {isFreeBook ? (
              <p className="text-neutral-600">
                Sign up to preview your book - no credit card required
              </p>
            ) : plan ? (
              <p className="text-neutral-600">
                Sign up for the {plan} plan
              </p>
            ) : null}
          </div>

          {/* Free Book Banner */}
          {isFreeBook && (
            <div className="mb-6 bg-gradient-to-r from-lime-100 to-green-100 rounded-xl p-4 border border-lime-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-400 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎁</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Free sample waiting for you!</p>
                  <p className="text-sm text-neutral-600">Create your account to preview your book. Upgrade anytime for the full version.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-neutral-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                  required
                  minLength={8}
                />
                <p className="text-xs text-neutral-500 mt-1">Minimum 8 characters</p>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-colors"
              >
                {isLoading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Creating account...</>
                ) : isFreeBook ? (
                  'Create Account & Try Sample'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-neutral-500">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-neutral-200 rounded-full hover:bg-neutral-50 font-medium transition-colors disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{' '}
              <Link href="/login" className="text-neutral-900 font-medium hover:underline">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-neutral-900" /></div>}>
      <SignupContent />
    </Suspense>
  );
}
