'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav className="w-full px-6 py-6 border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left Nav */}
          <div className="hidden md:flex items-center gap-8 flex-1">
            <Link href="/how-it-works" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              How it works
            </Link>
            <Link href="/pricing" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              Pricing
            </Link>
          </div>

          {/* Center Logo */}
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight md:absolute md:left-1/2 md:-translate-x-1/2"
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            draftmybook
          </Link>

          {/* Right Nav */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            <Link href="/faq" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              FAQ
            </Link>
            <Link href="/login" className="text-sm text-neutral-600 hover:text-neutral-900 animated-underline">
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-neutral-900 text-white px-5 py-2.5 rounded-full hover:bg-neutral-800 transition-colors font-medium"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-2 -mr-2"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 p-6">
            <div className="flex justify-between items-center mb-8">
              <span className="text-lg font-semibold" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                Menu
              </span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <Link href="/how-it-works" className="text-lg" onClick={() => setMenuOpen(false)}>
                How it works
              </Link>
              <Link href="/pricing" className="text-lg" onClick={() => setMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/faq" className="text-lg" onClick={() => setMenuOpen(false)}>
                FAQ
              </Link>
              <div className="h-px bg-neutral-200 my-4" />
              <Link href="/login" className="text-lg" onClick={() => setMenuOpen(false)}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="text-lg bg-neutral-900 text-white px-5 py-3 rounded-full text-center font-medium"
                onClick={() => setMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
