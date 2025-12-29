'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/Header';
import { Gift, CheckCircle, XCircle, Loader2, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';

function ClaimCreditContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'ready' | 'claiming' | 'success' | 'error'>('loading');
  const [claimData, setClaimData] = useState<{
    credits: number;
    userEmail: string;
    claimed: boolean;
    expired: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check claim status on load
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No claim token provided');
      return;
    }

    const checkClaim = async () => {
      try {
        const res = await fetch(`/api/claim-credit?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setStatus('error');
          setError(data.error || 'Invalid link');
          return;
        }

        setClaimData(data);

        if (data.claimed) {
          setStatus('success');
        } else if (data.expired) {
          setStatus('error');
          setError('This link has expired');
        } else {
          setStatus('ready');
        }
      } catch (err) {
        setStatus('error');
        setError('Failed to verify claim link');
      }
    };

    checkClaim();
  }, [token]);

  const handleClaim = async () => {
    if (!token) return;

    setStatus('claiming');

    try {
      const res = await fetch('/api/claim-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setError(data.error || 'Failed to claim credit');
        return;
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError('Failed to claim credit');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">Verifying your claim link...</p>
            </div>
          )}

          {/* Ready to Claim */}
          {status === 'ready' && claimData && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="h-10 w-10 text-neutral-700" />
              </div>

              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                You&apos;ve Been Gifted!
              </h1>

              <p className="text-neutral-600 mb-6">
                {claimData.credits} free book credit{claimData.credits > 1 ? 's' : ''} {claimData.credits > 1 ? 'are' : 'is'} waiting for you.
              </p>

              <div className="bg-neutral-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-neutral-500 mb-1">Claiming as</p>
                <p className="font-medium text-neutral-900">{claimData.userEmail}</p>
              </div>

              <button
                onClick={handleClaim}
                className="w-full px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium transition-colors flex items-center justify-center gap-2"
              >
                Claim {claimData.credits} Free Credit{claimData.credits > 1 ? 's' : ''}
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Claiming */}
          {status === 'claiming' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-neutral-900 mx-auto mb-4" />
              <p className="text-neutral-600">Claiming your credit...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>

              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                Credit Claimed!
              </h1>

              <p className="text-neutral-600 mb-6">
                {claimData?.credits || 1} free book credit{(claimData?.credits || 1) > 1 ? 's have' : ' has'} been added to your account.
              </p>

              <Link
                href="/create"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-neutral-900 text-white rounded-xl hover:bg-black font-medium transition-colors"
              >
                Create Your Free Book
                <ArrowRight className="h-5 w-5" />
              </Link>

              <p className="text-sm text-neutral-500 mt-4">
                Your credit will be automatically applied at checkout.
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {error?.includes('expired') ? (
                  <Clock className="h-10 w-10 text-red-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>

              <h1 className="text-2xl font-bold text-neutral-900 mb-2">
                {error?.includes('already') ? 'Already Claimed' : 'Unable to Claim'}
              </h1>

              <p className="text-neutral-600 mb-6">
                {error || 'This claim link is invalid or has expired.'}
              </p>

              <Link
                href="/"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-neutral-100 text-neutral-700 rounded-xl hover:bg-neutral-200 font-medium transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ClaimCreditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    }>
      <ClaimCreditContent />
    </Suspense>
  );
}
