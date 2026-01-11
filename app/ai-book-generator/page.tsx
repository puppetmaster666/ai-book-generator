'use client';

import dynamic from 'next/dynamic';

const BookGeneratorContent = dynamic(() => import('./BookGeneratorContent'), { ssr: false });

export default function AIBookGeneratorPage() {
  return <BookGeneratorContent />;
}
