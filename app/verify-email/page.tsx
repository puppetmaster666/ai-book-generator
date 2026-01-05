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
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    if (!resendEmail) return;
    setIsResending(true);
    setResendMessage('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendMessage(data.error || 'Failed to resend verification email');
        return;
      }

      if (data.alreadyVerified) {
        setResendMessage('Your email is already verified! You can log in now.');
      } else {
        setResendMessage('Verification email sent! Check your inbox.');
      }
    } catch (err) {
      setResendMessage('Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

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

              {!showResend ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowResend(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Resend Verification Email
                  </button>
                  <p className="text-sm text-neutral-500">
                    Already verified?{' '}
                    <Link href="/login" className="text-neutral-900 hover:underline">
                      Log in
                    </Link>
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending || !resendEmail}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50"
                  >
                    {isResending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Verification Email
                      </>
                    )}
                  </button>
                  {resendMessage && (
                    <p className={`text-sm ${resendMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
                      {resendMessage}
                    </p>
                  )}
                  <p className="text-sm text-neutral-500">
                    <Link href="/login" className="text-neutral-900 hover:underline">
                      Back to login
                    </Link>
                  </p>
                </div>
              )}
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
