// components/transactions/form-elements/ReceiptUploader.tsx
'use client';

import React from 'react';
import { Receipt, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReceiptUploaderProps {
  receipt: File | null;
  onReceiptChange: (file: File | null) => void;
}

/**
 * Componente para subir un comprobante de la transacción (factura, recibo, etc.)
 * Permite subir un archivo o arrastrarlo y soltarlo
 */
export function ReceiptUploader({
  receipt,
  onReceiptChange
}: ReceiptUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onReceiptChange(e.target.files[0]);
    }
  };
  
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Comprobante
      </label>
      {receipt ? (
        <div className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
          <div className="flex-1 truncate">{receipt.name}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReceiptChange(null)}
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <X size={18} />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
          <div className="space-y-1">
            <Receipt className="mx-auto h-8 w-8 text-gray-400" />
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                <span>Subir un archivo</span>
                <input 
                  id="file-upload" 
                  name="file-upload" 
                  type="file" 
                  className="sr-only" 
                  onChange={handleFileChange}
                  accept="image/*,.pdf"
                />
              </label>
              <p className="pl-1">o arrastra y suelta</p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PNG, JPG, PDF hasta 10MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceiptUploader;