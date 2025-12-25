'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // TODO: Implement actual authentication
      // For now, just redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-[#0F1A2A] mb-6 text-center">Log In</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-[#EF4444]">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73] disabled:opacity-50 font-medium"
              >
                {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Logging in...</> : 'Log In'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[#4A5568]">
              Do not have an account?{' '}
              <Link href="/signup" className="text-[#1E3A5F] font-medium hover:underline">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
