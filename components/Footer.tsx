import Link from 'next/link';
import { BookText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-neutral-100 p-2 rounded-sm">
                <BookText className="h-7 w-7 text-neutral-900" />
              </div>
              <span className="text-xl font-bold text-neutral-900">Draft My Book</span>
            </div>
            <p className="text-neutral-600 max-w-md">
              Transform your ideas into professionally written books.
              Ready for Amazon KDP and all major publishing platforms.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-neutral-900 mb-5">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/how-it-works" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-neutral-900 mb-5">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-neutral-600 hover:text-neutral-900 transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-neutral-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-sm">
            &copy; {new Date().getFullYear()} Draft My Book. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
