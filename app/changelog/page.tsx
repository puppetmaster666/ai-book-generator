import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CHANGELOG, APP_VERSION } from '@/lib/version';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `What's New - DraftMyBook v${APP_VERSION}`,
  description: 'Latest updates, improvements, and new features in DraftMyBook.',
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">What&apos;s New</h1>
          <p className="text-neutral-500 mb-12">Latest updates and improvements to DraftMyBook.</p>

          <div className="space-y-12">
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} className="relative">
                {/* Timeline connector */}
                {i < CHANGELOG.length - 1 && (
                  <div className="absolute left-[11px] top-10 bottom-0 w-0.5 bg-neutral-100" />
                )}

                <div className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex-shrink-0 mt-1.5">
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      i === 0 ? 'bg-neutral-900 border-neutral-900' : 'bg-white border-neutral-300'
                    }`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-bold text-neutral-900">v{entry.version}</span>
                      <span className="text-xs text-neutral-400">{entry.date}</span>
                      {i === 0 && (
                        <span className="text-xs bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full font-medium">Latest</span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-neutral-900 mb-3">{entry.title}</h2>
                    <ul className="space-y-2">
                      {entry.highlights.map((highlight, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-neutral-600">
                          <span className="text-neutral-400 mt-0.5 flex-shrink-0">-</span>
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
