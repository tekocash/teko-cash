// src/app/layout.tsx
'use client';

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
//import './globals.css';
import { Toaster } from 'react-hot-toast';
import AuthProvider from '@/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Teko Cash - Finanzas Personales',
  description: 'Aplicación para gestión de finanzas personales y familiares',
 // manifest: '/manifest.json',
};

/*export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Toaster position="top-right" />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}*/


export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { session } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    console.log("ProtectedLayout: Mounted");
    setIsInitialized(true);
  }, []);
  
  console.log("ProtectedLayout: Rendering, session:", !!session);
  
  // Simplemente renderizar los children sin lógica de redirección
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Información de depuración (eliminar en producción) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-0 right-0 bg-black/80 text-white text-xs p-2 m-2 rounded z-50">
          Protected Layout: {isInitialized ? 'Initialized' : 'Loading'}<br />
          Session: {session ? 'Yes' : 'No'}
        </div>
      )}
      {children}
    </div>
  );
}