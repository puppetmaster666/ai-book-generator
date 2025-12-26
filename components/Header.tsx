'use client';

import Link from 'next/link';
import { BookText, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BookText className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold text-gray-900 tracking-tight font-display">Draft My Book</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-gray-600 hover:text-primary font-medium transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-primary font-medium transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="text-gray-600 hover:text-primary font-medium transition-colors">
              FAQ
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-primary font-medium transition-colors">
              Log In
            </Link>
            <Link
              href="/create"
              className="bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-primary-hover transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 bg-white">
            <div className="flex flex-col gap-4">
              <Link
                href="/how-it-works"
                className="text-gray-600 hover:text-primary transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-primary transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/faq"
                className="text-gray-600 hover:text-primary transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-primary transition-colors text-lg px-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/create"
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors text-center text-lg font-bold mt-2 mx-2"
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
