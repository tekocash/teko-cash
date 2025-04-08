'use client';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import AuthProvider from '@/providers/AuthProvider';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
}