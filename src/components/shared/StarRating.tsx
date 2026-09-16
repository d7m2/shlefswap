import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  totalStars?: number;
  size?: number;
  smSize?: number; // Optional size for small screens
  className?: string;
  showText?: boolean;
}

export function StarRating({
  rating,
  totalStars = 5,
  size = 16, // Default size for larger screens
  smSize,    // Optional specific size for small screens
  className,
  showText = false,
}: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

  const currentSize = typeof window !== 'undefined' && window.innerWidth < 640 && smSize ? smSize : size;

  return (
    <div className={cn("flex items-center gap-0.5 sm:gap-1 text-accent", className)}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} fill="currentColor" style={{ width: currentSize, height: currentSize }} />
      ))}
      {hasHalfStar && <StarHalf fill="currentColor" style={{ width: currentSize, height: currentSize }} />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} style={{ width: currentSize, height: currentSize }} />
      ))}
      {showText && <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-muted-foreground">({rating.toFixed(1)})</span>}
    </div>
  );
}

