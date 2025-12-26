import Link from 'next/link';
import { BookText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <BookText className="h-8 w-8 text-blue-500" />
              <span className="text-2xl font-bold text-white">Writer AI</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Transform your ideas into professionally written books with the power of AI.
              Ready for Amazon KDP and all major publishing platforms.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-white mb-5">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/how-it-works" className="text-gray-400 hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-5">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-gray-400 hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-800 flex justify-between items-center">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Writer AI. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm">
            Designed by <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">Gemini</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
