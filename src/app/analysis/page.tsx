// app/page.tsx
'use client';
import TransactionTypes from '@/components/TransactionClassifier';

export default function Analysis() {
  return (
    <main className="min-h-screen p-8">
      <TransactionTypes />
    </main>
  );
}