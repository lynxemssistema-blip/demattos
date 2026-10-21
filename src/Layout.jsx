import React from 'react';
import { Toaster } from 'sonner';

export default function Layout({ children, currentPageName }) {
  return (
    <div>
      <Toaster position="top-center" richColors />
      {children}
    </div>
  );
}