'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  Users,
  BookOpen,
  Mail,
  Gift,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Overview', icon: BarChart3, section: 'overview' },
  { label: 'Users', icon: Users, section: 'users' },
  { label: 'Books', icon: BookOpen, section: 'books' },
  { label: 'AI Email', icon: Sparkles, section: 'email' },
  { label: 'Credits', icon: Gift, section: 'credits' },
  { label: 'Blog', icon: FileText, section: 'blog' },
  { label: 'Bulk Email', icon: Mail, section: 'bulk-email' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </Suspense>
  );
}

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSection = searchParams.get('section') || 'overview';
  const [collapsed, setCollapsed] = useState(false);

  const handleNavClick = (section: string) => {
    router.push(`/admin/dashboard?section=${section}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-56'} bg-neutral-900 text-white flex-shrink-0 flex flex-col transition-all duration-200 fixed h-full z-30`}>
        {/* Logo */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          {!collapsed && (
            <Link href="/" className="text-lg font-bold tracking-tight" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              draftmybook
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => handleNavClick(item.section)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="p-4 border-t border-neutral-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {!collapsed && <span>Back to site</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-56'} transition-all duration-200`}>
        {children}
      </main>
    </div>
  );
}
