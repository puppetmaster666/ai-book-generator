'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    // Verify the token
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to verify email.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-20 px-6">
        <div className="max-w-md mx-auto text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
              <p className="text-neutral-600">Please wait a moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-green-700">Email Verified!</h1>
              <p className="text-neutral-600 mb-6">{message}</p>
              <p className="text-sm text-neutral-500 mb-6">Redirecting to login...</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
              >
                Go to Login
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2 text-red-700">Verification Failed</h1>
              <p className="text-neutral-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  Sign Up Again
                </Link>
                <p className="text-sm text-neutral-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-neutral-900 hover:underline">
                    Log in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neutral-900" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
