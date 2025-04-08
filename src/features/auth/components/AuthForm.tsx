// src/components/auth/AuthForm.tsx
import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthFormProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthForm({ title, subtitle, children, footer }: AuthFormProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Teko Cash</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{subtitle}</p>
        </div>
        
        {/* Contenido del formulario */}
        {children}
        
        {/* Footer (enlaces, etc.) */}
        <div className="mt-8 text-center">
          {footer}
        </div>
      </div>
    </div>
  );
}