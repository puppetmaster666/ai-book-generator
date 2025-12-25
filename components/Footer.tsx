import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#F7F5F0] border-t border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-8 w-8 text-[#1E3A5F]" />
              <span className="text-xl font-semibold text-[#0F1A2A]">BookForge</span>
            </div>
            <p className="text-[#4A5568] max-w-md">
              Transform your ideas into professionally written books with the power of AI.
              Ready for Amazon KDP and all major publishing platforms.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-[#0F1A2A] mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F1A2A] mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-[#4A5568] hover:text-[#0F1A2A] transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#E8E4DC]">
          <p className="text-center text-[#4A5568] text-sm">
            &copy; {new Date().getFullYear()} BookForge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
