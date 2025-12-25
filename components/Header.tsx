'use client';

import Link from 'next/link';
import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFDF8]/80 backdrop-blur-md border-b border-[#E8E4DC]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-[#1E3A5F]" />
            <span className="text-xl font-semibold text-[#0F1A2A]">BookForge</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/how-it-works" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
              How It Works
            </Link>
            <Link href="/pricing" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
              FAQ
            </Link>
            <Link href="/login" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
              Log In
            </Link>
            <Link
              href="/create"
              className="bg-[#1E3A5F] text-white px-5 py-2 rounded-lg hover:bg-[#2D4A73] transition-colors"
            >
              Create Book
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-[#0F1A2A]" />
            ) : (
              <Menu className="h-6 w-6 text-[#0F1A2A]" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#E8E4DC]">
            <div className="flex flex-col gap-4">
              <Link
                href="/how-it-works"
                className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="/pricing"
                className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/faq"
                className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link
                href="/login"
                className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Log In
              </Link>
              <Link
                href="/create"
                className="bg-[#1E3A5F] text-white px-5 py-2 rounded-lg hover:bg-[#2D4A73] transition-colors text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Create Book
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
