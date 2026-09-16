'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Book, BookListItem, UsedBookListing } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, BookText, Trash2, Edit3, AlertTriangle, DollarSign, RefreshCw, Gift } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { deleteListingAction } from '@/app/actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateListingForm } from '@/components/marketplace/CreateListingForm';

interface BookCardProps {
  book: BookListItem;
  onListingDeleted?: (listingId: string) => void;
  onListingUpdated?: (listingId: string) => void;
}

// Function to generate Picsum URL, similar to the modified getBookCoverByISBN
function generatePicsumCoverUrl(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
  const cleanIsbn = isbn.replace(/-/g, '');
  const seed = encodeURIComponent(`book-${cleanIsbn}-${size}`);
  return `https://picsum.photos/seed/${seed}/300/400`;
}

export function BookCard({ book, onListingDeleted, onListingUpdated }: BookCardProps) {
  console.log('[BookCard] Rendering with book:', JSON.parse(JSON.stringify(book)));
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const isBookInWishlist = isInWishlist(book.id);

  // Determine availability
  const isUsed = 'listingId' in book;
  const usedBook = isUsed ? (book as UsedBookListing) : null;
  const listingTypesForCard = isUsed && usedBook
    ? (usedBook.listingType || '').split(',').map((t) => (t === 'Sale' ? 'Sell' : t)).filter((t) => ['Sell', 'Swap', 'Free'].includes(t))
    : [];
  const listingTypeIcon: Record<string, React.ElementType> = { Sell: DollarSign, Swap: RefreshCw, Free: Gift };
  const isAvailable = useMemo(() => {
    if (isUsed && usedBook) {
      console.log(`[BookCard] Checking availability for used book: ${usedBook.listingId}, Title: ${usedBook.title}`);
      // Prefer 'status' if it exists, otherwise use 'availability'
      // Consider 'available' as the only truly available state
      // Make the check case-insensitive and trim whitespace
      if (typeof usedBook.status === 'string') {
        const status = usedBook.status.trim().toLowerCase();
        console.log(`[BookCard] Status found: '${usedBook.status}', normalized: '${status}'`);
        return status === 'available';
      }
      if (typeof usedBook.availability === 'string') {
        const availability = usedBook.availability.trim().toLowerCase();
        console.log(`[BookCard] Availability found: '${usedBook.availability}', normalized: '${availability}'`);
        return availability === 'available';
      }
      console.log('[BookCard] Neither status nor availability string found for used book. Defaulting to true (available).');
      // If neither status nor availability is present as a string, or if they are not 'available'
      // Defaulting to true here means if these fields are missing or different, it's treated as available.
      // You might want to change this to `false` if missing status/availability should mean unavailable.
      return true; 
    }
    // New books (not UsedBookListing) are assumed to be available unless a specific field indicates otherwise.
    // If your 'Book' type (non-used) can also be unavailable, adjust this logic.
    console.log(`[BookCard] Book is not a UsedBookListing (ID: ${book.id}, Title: ${book.title}). Assuming available.`);
    return true; 
  }, [book, isUsed, usedBook]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverImageError, setCoverImageError] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  useEffect(() => {
    // Try to get a real book cover image
    const getBookCover = async () => {
      // If we already have a cover URL from the book data, use it (unless it's a placeholder)
      if (book.coverImageUrl && !book.coverImageUrl.includes('picsum.photos')) {
        setCoverImageUrl(book.coverImageUrl);
        return;
      }
      
      // If we have an ISBN, try to get the cover from OpenLibrary
      if (book.isbn) {
        try {
          // Use the reliable covers.openlibrary.org URL format
          const openLibraryCoverUrl = generatePicsumCoverUrl(book.isbn);
          setCoverImageUrl(openLibraryCoverUrl);
        } catch (err) {
          console.warn(`Could not load cover for ISBN ${book.isbn}:`, err);
          // Fall back to generated image
          useFallbackCover();
        }
      } else {
        // No ISBN, use a fallback image
        useFallbackCover();
      }
    };
    
    const useFallbackCover = () => {
      // Generate a guaranteed fallback cover based on title and author
      const seed = `${book.title}-${book.author}-${Date.now()}`.replace(/\s+/g, '-');
      const fallbackCover = `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/400`;
      setCoverImageUrl(fallbackCover);
      // Mark as using fallback so we don't try OpenLibrary again
      setCoverImageError(true);
    };
    
    getBookCover();
  }, [book.coverImageUrl, book.isbn, book.title, book.author]);

  const handleImageError = () => {
    // If we already tried a fallback, don't keep trying
    if (coverImageError) return;
    
    setCoverImageError(true);
    console.log(`Falling back to generated image for: ${book.title}`);
    
    // If OpenLibrary cover failed, fall back to a guaranteed random image
    const seed = `${book.title}-${book.author}-${Date.now()}`.replace(/\s+/g, '-');
    const fallbackCover = `https://picsum.photos/seed/${encodeURIComponent(seed)}/300/400`;
    setCoverImageUrl(fallbackCover);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const bookDataForWishlist: Book = {
        id: book.id,
        title: book.title,
        author: book.author,
        coverImageUrl: coverImageUrl || `https://picsum.photos/200/250?random=${book.id}`,
        description: book.description,
        price: (('price' in book && book.price !== undefined)
               ? book.price
               : (('salePrice' in book && book.salePrice !== undefined)
                  ? book.salePrice
                  : undefined)),
        averageRating: book.averageRating,
        genres: book.genres,
        aiHint: book.aiHint,
        isbn: book.isbn,
        publisher: book.publisher,
        publicationDate: book.publicationDate,
        pageCount: book.pageCount,
        language: book.language,
    };

    if (isBookInWishlist) {
      removeFromWishlist(book.id);
    } else {
      addToWishlist(bookDataForWishlist);
    }
  };

  const isSeller = currentUser && usedBook && usedBook.sellerId === currentUser.id;
  console.log('[BookCard] isSeller:', isSeller, 'currentUser.id:', currentUser?.id, 'usedBook.sellerId:', usedBook?.sellerId, 'usedBook:', usedBook ? JSON.parse(JSON.stringify(usedBook)) : null);
  console.log('[BookCard] isAvailable:', isAvailable); // Log availability

  const detailUrl = isUsed ? `/marketplace/${book.listingId}` : `/books/${book.id}`;
  const displayPriceInUsd = isUsed
    ? (usedBook?.listingType || '').split(',').some((t) => t === 'Sale' || t === 'Sell') ? usedBook?.salePrice : undefined
    : book.price;

  let formattedDisplayPriceNode: React.ReactNode = null;
  if (displayPriceInUsd !== undefined) {
    const { valueStr, symbolNode, currency } = formatPrice(displayPriceInUsd);
    formattedDisplayPriceNode = currency === 'SAR' ? <>{valueStr} {symbolNode}</> : <>{symbolNode}{valueStr}</>;
  }

  const handleDeleteListing = async () => {
    if (!isUsed || !usedBook?.listingId) {
      toast({
        title: "Error",
        description: "Cannot delete listing without a listing ID.",
        variant: "destructive",
      });
      return;
    }
    setIsDeleting(true);
    try {
      // console.log(\`Attempting to delete listing with ID: ${usedBook.listingId}\`);
      const result = await deleteListingAction({
        listingId: usedBook.listingId,
        currentUserId: currentUser!.id,
        photoPath: usedBook.photoPath,
      });
      // console.log(\'Delete action result:\', result);

      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Listing deleted successfully.",
          variant: "default",
          className: "bg-green-500 text-white",
        });
        if (onListingDeleted) {
          onListingDeleted(usedBook.listingId);
        }
      } else {
        // console.error("Failed to delete listing:", result.message, result.errors);
        toast({
          title: "Error Deleting Listing",
          description: result.message || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the listing.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false); // Close dialog after operation
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (usedBook?.listingId) {
      // Reset form state when opening, in case of previous errors
      // This is a simple reset; a more robust solution might involve a dedicated reset function for useFormState
      // For now, direct state manipulation might not fully reset server action's internal state.
      // Consider passing a key to CreateListingForm to force remount if initialData changes.
      setIsEditModalOpen(true);
    } else {
      console.error("[BookCard] Edit button clicked but listingId is missing");
      toast({
        title: "Error",
        description: "Cannot edit listing: Listing ID is missing.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={cn("group flex flex-col overflow-hidden h-full shadow-card hover:shadow-card-hover transition-all duration-300 rounded-lg border border-border/40 transform hover:-translate-y-0.5 hover:scale-[1.015]", isDeleting && "opacity-50 pointer-events-none")}>
      <div className="relative">
            <CardHeader className="p-0 relative cursor-pointer">
              <Link href={detailUrl} className="block overflow-hidden rounded-t-md aspect-[4/5] w-full">
                {coverImageUrl ? (
                  <>
                    {!coverImageError ? (
                      <Image
                        src={coverImageUrl}
                        alt={`Cover of ${book.title}`}
                        width={200}
                        height={250}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        priority={false}
                        loading="lazy"
                        onError={handleImageError}
                        unoptimized={true}
                      />
                    ) : (
                      // Already using fallback image
                      <Image
                        src={coverImageUrl}
                        alt={`Cover of ${book.title}`}
                        width={200}
                        height={250}
                        className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        priority={false}
                        loading="lazy"
                        unoptimized={true}
                      />
                    )}
                  </>
                ) : (
                  <div className="bg-muted h-full w-full flex items-center justify-center">
                    <BookText className="h-12 w-12 text-muted-foreground/60" />
                  </div>
                )}
              </Link>
              {listingTypesForCard.length > 0 && (
                <div className="absolute bottom-1.5 left-1.5 z-10 flex flex-wrap gap-1">
                  {listingTypesForCard.map((type) => {
                    const TypeIcon = listingTypeIcon[type];
                    const isSellBadge = type === 'Sell';
                    const typeClass = isSellBadge ? 'bg-white/90 border-white/60' : type === 'Swap' ? 'bg-sky-500/90' : 'bg-emerald-500/90';
                    return (
                      <Badge
                        key={type}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 font-semibold shadow backdrop-blur-sm rounded-md border flex items-center gap-0.5",
                          isSellBadge ? "text-primary" : "text-white border-transparent",
                          typeClass
                        )}
                      >
                        <TypeIcon className="h-2.5 w-2.5" />
                        {type}
                      </Badge>
                    );
                  })}
                </div>
              )}
              <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                      "absolute top-1.5 left-1.5 rounded-full bg-card/70 hover:bg-card text-foreground shadow-md w-7 h-7 backdrop-blur-sm transition-colors duration-200 z-10",
                      isBookInWishlist ? "text-accent hover:text-accent/90" : "text-muted-foreground hover:text-primary"
                  )}
                  onClick={handleWishlistToggle}
                  aria-label={isBookInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart className={cn("h-3.5 w-3.5 transition-all", isBookInWishlist && "fill-current")} />
              </Button>

              {isSeller && (
                <div className="absolute bottom-1.5 right-1.5 flex space-x-1.5 z-10">
                  <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full bg-card/80 hover:bg-card/95 border-primary/30 hover:border-primary/70 text-primary/80 hover:text-primary shadow w-7 h-7 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
                        onClick={handleEditClick}
                        aria-label="Edit listing"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
                      <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Edit Listing: {usedBook?.title}</DialogTitle>
                        <DialogDescription>
                          Update the details for your book listing. Click save when you're done.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                        {usedBook && currentUser && (
                          <CreateListingForm
                            key={usedBook.listingId}
                            initialData={usedBook}
                            isEditMode
                            onUpdated={() => onListingUpdated?.(usedBook.listingId)}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full bg-card/80 hover:bg-destructive/80 border-destructive/40 hover:border-destructive/70 text-destructive/80 hover:text-white shadow w-7 h-7 backdrop-blur-sm transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 delay-75"
                        aria-label="Delete listing"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                          Are you sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the listing for
                          <span className="font-semibold"> {book.title}</span> and remove its image.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteListing}
                          disabled={isDeleting}
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        >
                          {isDeleting ? "Deleting..." : "Delete Listing"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardHeader>
          </div>

      <CardContent className="p-2.5 flex-grow flex flex-col space-y-1">
        <Link href={detailUrl} className="flex-grow">
          <CardTitle className="text-sm font-semibold leading-tight text-primary hover:text-primary/80 line-clamp-2 group-hover:underline">
            {book.title}
          </CardTitle>
        </Link>
        <p className="text-xs text-muted-foreground line-clamp-1">by {book.author}</p>

        {isUsed && usedBook && (
          <div className="text-xs space-y-0.5">
            <span className="flex items-center">Condition: <Badge variant="outline" className="ml-1 font-normal text-[0.65rem] px-1 py-0">{usedBook.condition}</Badge></span>
            {usedBook.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && formattedDisplayPriceNode && (
              <p className="font-semibold text-accent text-sm">
                {formattedDisplayPriceNode}
              </p>
            )}
          </div>
        )}
        {!isUsed && formattedDisplayPriceNode && (
          <p className="font-semibold text-accent text-sm">
            {formattedDisplayPriceNode}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-2.5 border-t border-border/30 mt-auto">
        {isUsed ? (
           (usedBook?.listingType || '').split(',').some((t) => t === 'Sale' || t === 'Sell') ? (
            <Button 
              asChild
              size="sm" 
              className="w-full text-xs h-8" 
              variant={isSeller ? "default" : "outline"} 
              disabled={!isAvailable || usedBook?.salePrice === undefined}
            >
              <Link href={detailUrl}>
                <Eye className="mr-1 h-3.5 w-3.5" />
                {isSeller ? 'My Listing' : 'View Listing'}
              </Link>
            </Button>
          ) : ( // Swap or other listing types
            <Button 
              asChild 
              variant={isSeller ? "default" : "outline"}
              size="sm" 
              className="w-full text-xs h-8"
              disabled={!isAvailable}
            >
<Link href={detailUrl}>
                <Eye className="mr-1 h-3.5 w-3.5" />
                {isSeller ? 'My Listing' : 'View Listing'}
              </Link>
            </Button>
          )
        ) : ( // New book
          <Button 
            asChild
            size="sm" 
            className="w-full text-xs h-8" 
            variant={"outline" } 
            disabled={!isAvailable || displayPriceInUsd === undefined}
          >
            <Link href={detailUrl}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              View Details
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

