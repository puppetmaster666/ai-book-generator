'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import { ArrowUp, ArrowDown, Loader2, Save, ArrowLeft } from 'lucide-react';

interface RoastPanel {
  id: string;
  bookId: string;
  title: string;
  altText: string | null;
  featuredRoastOrder: number | null;
  imageUrl: string;
}

export default function AdminRoastPanelsPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [panels, setPanels] = useState<RoastPanel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    fetch('/api/admin/roast-panels')
      .then(res => {
        if (res.status === 403) {
          router.push('/');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data?.panels) setPanels(data.panels);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [session, sessionStatus, router]);

  const move = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= panels.length) return;
    const next = [...panels];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setPanels(next);
    setDirty(true);
    setSaveMessage('');
  };

  const save = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/admin/roast-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: panels.map(p => p.id) }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveMessage('Order saved');
      setDirty(false);
    } catch {
      setSaveMessage('Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-neutral-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Featured Roast Panels
            </h1>
            <button
              onClick={save}
              disabled={!dirty || isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save order
            </button>
          </div>

          <p className="text-sm text-neutral-500 mb-2">
            Drag, reorder, or remove panels shown on the homepage roast section and the /roast page.
          </p>
          <p className="text-xs text-neutral-400 mb-6">
            Top of the list = leftmost featured card. Only the first 8 are used on /roast and the first 5 on the homepage.
          </p>

          {saveMessage && (
            <div className="mb-4 px-3 py-2 text-sm rounded-lg bg-neutral-100 text-neutral-700">
              {saveMessage}
            </div>
          )}

          {panels.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-neutral-500 text-sm">
              No featured roast panels yet. Go to a roast book and click the star button on a panel to feature it.
            </div>
          ) : (
            <ul className="space-y-2">
              {panels.map((panel, index) => (
                <li
                  key={panel.id}
                  className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl p-3"
                >
                  <span className="w-8 text-center text-sm font-medium text-neutral-400">
                    {index + 1}
                  </span>
                  <img
                    src={panel.imageUrl}
                    alt={panel.altText || panel.title}
                    className="w-16 h-24 object-cover rounded-md border border-neutral-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{panel.title}</p>
                    <p className="text-xs text-neutral-500 truncate">
                      {panel.altText || 'No caption'}
                    </p>
                    <a
                      href={`/book/${panel.bookId}`}
                      className="text-xs text-neutral-400 hover:text-neutral-700 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source book
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="w-8 h-8 rounded-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === panels.length - 1}
                      className="w-8 h-8 rounded-md border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
