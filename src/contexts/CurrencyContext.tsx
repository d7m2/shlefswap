
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Landmark } from 'lucide-react';

export type Currency = 'USD' | 'SAR';

export interface FormattedPriceResult {
  valueStr: string; // e.g., "100.00"
  symbolNode: React.ReactNode; // e.g., "$" or <span style="...">﷼</span>
  currency: Currency;
}

interface CurrencyContextType {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
  toggleCurrency: () => void;
  formatPrice: (priceInUsd: number, options?: { currency?: Currency, showSymbol?: boolean }) => FormattedPriceResult;
  getSymbol: (currency?: Currency) => React.ReactNode;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'shelfswap-currency';
export const DEFAULT_CURRENCY: Currency = 'USD';

export const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  SAR: 3.75, 
};

export const CURRENCY_SYMBOLS_RAW: Record<Currency, string> = {
  USD: '$',
  SAR: '\uE900', 
};

export const CurrencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedCurrency, setSelectedCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency | null;
      if (storedCurrency && (storedCurrency === 'USD' || storedCurrency === 'SAR')) {
        setSelectedCurrencyState(storedCurrency);
      }
    } catch (error) {
      console.error("Failed to load currency from localStorage", error);
    }
  }, []);

  const setSelectedCurrency = useCallback((newCurrency: Currency) => {
    setSelectedCurrencyState(newCurrency);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      setTimeout(() => {
        toast({
          title: "Currency Set",
          description: `Display currency set to ${newCurrency}.`,
          icon: <Landmark className="h-5 w-5 text-primary" />
        });
      }, 0);
    } catch (error) {
      console.error("Failed to save currency to localStorage", error);
      setTimeout(() => {
        toast({
          title: "Storage Error",
          description: "Could not save your currency preference.",
          variant: "destructive",
          icon: <AlertTriangle className="h-5 w-5" />
        });
      }, 0);
    }
  }, [toast]);

  const toggleCurrency = useCallback(() => {
    setSelectedCurrencyState((prevCurrency) => {
      const newCurrency = prevCurrency === 'USD' ? 'SAR' : 'USD';
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
        setTimeout(() => {
          toast({
            title: "Currency Updated",
            description: `Display currency changed to ${newCurrency}.`,
            icon: <Landmark className="h-5 w-5 text-primary" />
          });
        }, 0);
      } catch (error) {
        console.error("Failed to save currency to localStorage", error);
        setTimeout(() => {
          toast({
            title: "Storage Error",
            description: "Could not save your currency preference.",
            variant: "destructive",
            icon: <AlertTriangle className="h-5 w-5" />
          });
        }, 0);
        return prevCurrency; 
      }
      return newCurrency;
    });
  }, [toast]);

  const getSymbol = useCallback((currency?: Currency): React.ReactNode => {
    const target = currency || selectedCurrency;
    const symbolChar = CURRENCY_SYMBOLS_RAW[target];
    if (target === 'SAR') {
      return <span style={{ fontFamily: "'saudi_riyal', sans-serif" }}>{symbolChar}</span>;
    }
    return symbolChar;
  }, [selectedCurrency]);

  const formatPrice = useCallback((priceInUsd: number, options?: { currency?: Currency, showSymbol?: boolean }): FormattedPriceResult => {
    const targetCurrency = options?.currency || selectedCurrency;
    const showSymbolOpt = options?.showSymbol === undefined ? true : options.showSymbol;
    
    let priceValue = 0;
    if (typeof priceInUsd === 'number' && !isNaN(priceInUsd)) {
        priceValue = priceInUsd;
    }

    const rate = EXCHANGE_RATES[targetCurrency];
    const convertedPrice = priceValue * rate;
    const valueStr = convertedPrice.toFixed(2);
    
    const symbolNode = showSymbolOpt ? getSymbol(targetCurrency) : '';

    return {
      valueStr,
      symbolNode,
      currency: targetCurrency,
    };
  }, [selectedCurrency, getSymbol]);


  const value = useMemo(() => ({
    selectedCurrency,
    setSelectedCurrency,
    toggleCurrency,
    formatPrice,
    getSymbol,
  }), [selectedCurrency, setSelectedCurrency, toggleCurrency, formatPrice, getSymbol]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
