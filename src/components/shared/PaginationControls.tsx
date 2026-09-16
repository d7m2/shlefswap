
'use client';

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-border/60">
      <p className="text-sm text-muted-foreground">
        Showing {startItem} - {endItem} of {totalItems} results
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="text-sm px-2 tabular-nums" aria-live="polite" aria-atomic="true">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
           <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
        </Button>
      </div>
    </div>
  );
}
