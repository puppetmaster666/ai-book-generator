'use client';

import Link from 'next/link';
import { BookText, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-blue-100 p-2 rounded group-hover:bg-blue-200 transition-colors">
              <BookText className="h-7 w-7 text-blue-600" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Draft My Book</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
              FAQ
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
              Log In
            </Link>
            <Link
              href="/create"
              className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            <div className="flex flex-col gap-4">
              <Link
                href="/how-it-works"
                className="text-gray-600 hover:text-blue-600 transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-blue-600 transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/faq"
                className="text-gray-600 hover:text-blue-600 transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-blue-600 transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/create"
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors text-center text-lg font-semibold mt-2 mx-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
