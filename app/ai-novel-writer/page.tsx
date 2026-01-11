'use client';

import dynamic from 'next/dynamic';

const NovelWriterContent = dynamic(() => import('./NovelWriterContent'), { ssr: false });

export default function AINovelWriterPage() {
  return <NovelWriterContent />;
}
