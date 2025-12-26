import Link from 'next/link';
import { BookText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <BookText className="h-8 w-8 text-primary" />
              </div>
              <span className="text-2xl font-bold text-gray-900 font-display">Draft My Book</span>
            </div>
            <p className="text-gray-500 max-w-md">
              Transform your ideas into professionally written books with the power of AI.
              Ready for Amazon KDP and all major publishing platforms.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-5 font-display">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/how-it-works" className="text-gray-500 hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-500 hover:text-primary transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-500 hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-5 font-display">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-gray-500 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-500 hover:text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-gray-500 hover:text-primary transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Draft My Book. All rights reserved.
          </p>
          <p className="text-gray-400 text-sm">
            Designed by <a href="#" className="hover:text-primary transition-colors">Gemini</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
