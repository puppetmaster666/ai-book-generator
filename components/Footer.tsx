import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              draftmybook
            </Link>
            <p className="text-neutral-400 text-sm mt-4 max-w-xs">
              Turn your ideas into professionally written books, ready for publishing.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-medium mb-4 text-sm">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/how-it-works" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-medium mb-4 text-sm">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-medium mb-4 text-sm">Support</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:support@draftmybook.com" className="text-sm text-neutral-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-neutral-500 text-sm">
            &copy; {new Date().getFullYear()} draftmybook. All rights reserved.
          </p>
          <p className="text-neutral-500 text-sm">
            Made with care for authors everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
