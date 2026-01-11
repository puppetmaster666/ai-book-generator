'use client';

import dynamic from 'next/dynamic';

const ComicBookContent = dynamic(() => import('./ComicBookContent'), { ssr: false });

export default function AIComicBookMakerPage() {
  return <ComicBookContent />;
}
