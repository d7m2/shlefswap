
'use client';

import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useEffect, useState } from 'react';


export function CurrencyToggleButton() {
  const { selectedCurrency, toggleCurrency, getSymbol } = useCurrency();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-foreground/70 hover:text-primary hover:bg-primary/10" disabled />;
  }
  
  const nextCurrency = selectedCurrency === 'USD' ? 'SAR' : 'USD';
  const tooltipText = <>Switch to {nextCurrency} ({getSymbol(nextCurrency)})</>;


  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleCurrency}
      className="w-9 h-9 rounded-full text-foreground/70 hover:text-primary hover:bg-primary/10 relative group transition-colors duration-150"
      aria-label={`Switch to ${nextCurrency}`} 
    >
      <span className="text-sm font-semibold">{getSymbol(selectedCurrency)}</span>
      <span className="sr-only">{`Current currency: ${selectedCurrency}. ${tooltipText}`}</span>
       <span 
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
      >
        {tooltipText}
      </span>
    </Button>
  );
}
