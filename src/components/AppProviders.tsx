
"use client";

import type React from 'react';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { NotificationProvider } from '@/contexts/NotificationContext'; 

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <NotificationProvider> 
              <WishlistProvider>
                {children}
              </WishlistProvider>
            </NotificationProvider>
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
