'use client';

import Image from 'next/image';
import type { Book, UsedBookListing, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StarRating } from '@/components/shared/StarRating';
import { Heart, MessageSquare, Tag, Info, BookOpenText, Handshake, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWishlist } from '@/contexts/WishlistContext';
import { useCurrency } from '@/contexts/CurrencyContext'; 
import { cn } from '@/lib/utils';
import { MakeOfferDialog } from '@/components/offers/MakeOfferDialog'; // Import MakeOfferDialog
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; // Added useRouter
import { startConversationAction } from '@/app/actions'; // Added startConversationAction
import { useToast } from '@/hooks/use-toast'; // Added useToast
import React, { useState, useMemo } from 'react'; // Added useState, useMemo

interface BookDetailsViewProps {
  book: Book | UsedBookListing;
}

interface SellerInfoProps {
  seller: User;
  listingId: string;
  listingTitle: string;
  currentUserId?: string | null;
  currentUserUsername?: string | null;
  currentUserProfilePicUrl?: string | null;
}

function SellerInfo({ seller, listingId, listingTitle, currentUserId, currentUserUsername, currentUserProfilePicUrl }: SellerInfoProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isContacting, setIsContacting] = useState(false);

  const handleContactSeller = async () => {
    if (!currentUserId) {
      toast({
        title: "Login Required",
        description: "Please log in to contact the seller.",
        variant: "destructive",
      });
      // Optionally redirect to login: router.push('/login');
      return;
    }

    if (seller.id === currentUserId) {
      toast({
        title: "Cannot Contact Self",
        description: "You cannot start a conversation with yourself.",
        variant: "default", // or "warning"
      });
      return;
    }

    setIsContacting(true);
    try {
      // Ensure current user details from props are defined before calling
      if (!currentUserId || !currentUserUsername) {
        throw new Error("Authentication details are missing. Please log in again.");
      }

      const result = await startConversationAction(
        seller.id,                      // targetUserId
        currentUserId,                  // currentUserIdFromClient (from prop)
        currentUserUsername,            // currentUserUsernameFromClient (from prop)
        seller.username,                // targetUserUsername
        seller.profilePictureUrl ?? undefined,  // targetUserProfilePic (optional) 
        currentUserProfilePicUrl ?? undefined,  // currentUserProfilePicFromClient (from prop, optional)
        listingId,                      // relatedListingId (optional)
        listingTitle                    // relatedListingTitle (optional)
      );

      if (result.success && result.conversationId) {
        toast({
          title: "Conversation Started",
          description: `You can now chat with ${seller.username}.`,
        });
        router.push(`/profile/messages/${result.conversationId}`);
      } else {
        throw new Error(result.error || "Failed to start conversation.");
      }
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: error.message || "Could not start a conversation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsContacting(false);
    }
  };
  
  const isCurrentUserTheSeller = seller.id === currentUserId;

  return (
    <Card className="bg-secondary/30 border-secondary/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/50">
            <AvatarFallback>{seller.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-md sm:text-lg text-primary">{seller.username}</CardTitle>
            {(typeof seller.generalAverageRating === 'number' || typeof seller.generalRatingCount === 'number') && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                {typeof seller.generalAverageRating === 'number' && (
                  <StarRating rating={seller.generalAverageRating} size={12} smSize={14} />
                )}
                {typeof seller.generalRatingCount === 'number' && (
                  <span className={typeof seller.generalAverageRating === 'number' ? 'ml-1' : ''}>
                    ({seller.generalRatingCount} rating{seller.generalRatingCount !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline" 
          className="flex-1 border-primary/50 text-primary hover:bg-primary/10 text-sm h-9"
          onClick={handleContactSeller}
          disabled={isContacting || isCurrentUserTheSeller}
        >
          {isContacting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
          {isCurrentUserTheSeller ? "This is Your Listing" : (isContacting ? "Starting..." : "Contact Seller")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function BookDetailsView({ book }: BookDetailsViewProps) {
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { formatPrice } = useCurrency(); 
  const { currentUser } = useAuth();
  const isBookInWishlist = isInWishlist(book.id);

  // Type guard to check if the book is a UsedBookListing
  const isUsedBookListing = (book: Book | UsedBookListing): book is UsedBookListing => {
    return (book as UsedBookListing).listingType !== undefined;
  };

  const usedBook = isUsedBookListing(book) ? book : null;

  const isAvailable = useMemo(() => {
    if (usedBook) {
      // Prefer 'status' if it exists, otherwise use 'availability'
      // Consider 'available' as the only truly available state
      // Make the check case-insensitive and trim whitespace
      if (typeof usedBook.status === 'string') {
        const status = usedBook.status.trim().toLowerCase();
        return status === 'available';
      }
      // Fallback to 'availability' if 'status' is not a string
      if (typeof usedBook.availability === 'string') {
        const availability = usedBook.availability.trim().toLowerCase();
        return availability === 'available';
      }
      // If neither status nor availability is a string, assume available by default for used books
      // This aligns with BookCard's default assumption if these fields are missing.
      // If missing status/availability should mean unavailable, change to `false`.
      return true; 
    }
    // New books (not UsedBookListing) are always considered available in this context
    return true;
  }, [usedBook]);

  const handleWishlistToggle = () => {
    if (isBookInWishlist) {
      removeFromWishlist(book.id);
    } else {
      const bookToAdd: Book = { 
        id: book.id, 
        title: book.title, 
        author: book.author, 
        coverImageUrl: book.coverImageUrl || `https://picsum.photos/600/900?random=${book.id}`, 
        description: book.description,
        price: book.price,
        averageRating: book.averageRating,
        genres: book.genres,
        aiHint: book.aiHint,
        isbn: book.isbn,
        publisher: book.publisher,
        publicationDate: book.publicationDate,
        pageCount: book.pageCount,
        language: book.language,
      };
      addToWishlist(bookToAdd);
    }
  };

  const isUsed = 'listingId' in book;
  const newBook = !isUsed ? (book as Book) : null;

  const priceInUsd = isUsed 
    ? ((usedBook?.listingType || '').split(',').some((t) => t === 'Sale' || t === 'Sell') ? usedBook?.salePrice : undefined)
    : newBook?.price;
  
  let formattedPriceNode: React.ReactNode = null;
  if (priceInUsd !== undefined) {
    const { valueStr, symbolNode, currency } = formatPrice(priceInUsd);
    if (currency === 'SAR') {
      formattedPriceNode = <>{valueStr} {symbolNode}</>;
    } else {
      formattedPriceNode = <>{symbolNode}{valueStr}</>;
    }
  }
  
  // User cannot make an offer on their own listing or if the item is unavailable
  const canMakeOffer = isUsed && usedBook && currentUser && usedBook.seller.id !== currentUser.id && isAvailable;

  return (
    <div className="grid lg:grid-cols-5 gap-6 md:gap-8 lg:gap-12 items-start">
      {/* Left Column: Image and Seller Info (if used) */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="overflow-hidden shadow-xl border-border/80 rounded-lg">
          <Image
            src={book.coverImageUrl || `https://picsum.photos/600/900?random=${book.id}`}
            alt={`Cover of ${book.title}`}
            width={600}
            height={900}
            className="object-cover w-full aspect-[2/3]"
            priority 
            data-ai-hint={book.aiHint || "book cover large"}
          />
        </Card>
        {isUsed && usedBook && 
          <SellerInfo 
            seller={usedBook.seller} 
            listingId={usedBook.listingId} 
            listingTitle={usedBook.title} 
            currentUserId={currentUser?.id} 
            currentUserUsername={currentUser?.username}
            currentUserProfilePicUrl={currentUser?.profilePictureUrl}
          />
        }
      </div>

      {/* Right Column: Book Info, Actions, Tabs */}
      <div className="lg:col-span-3 space-y-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-primary">{book.title}</h1>
          <p className="text-lg sm:text-xl text-muted-foreground">by {book.author}</p>

          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {book.genres.map((genre) => (
                <Badge key={genre} variant="secondary" className="font-medium text-xs px-2 py-0.5 sm:text-sm sm:px-2.5 sm:py-1">{genre}</Badge>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-4 sm:my-6" />

        {/* Pricing and Actions */}
        <Card className="bg-card shadow-lg border-border/60">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                {isUsed && usedBook && (
                    <>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="text-md sm:text-lg text-muted-foreground">
                            Condition: <Badge variant="outline" className="text-md sm:text-lg px-2.5 py-0.5 sm:px-3 sm:py-1 ml-1 sm:ml-2 border-primary/50 text-primary font-semibold">{usedBook.condition}</Badge>
                        </div>
                        {usedBook.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && formattedPriceNode && (
                            <p className="text-3xl sm:text-4xl font-bold text-accent">{formattedPriceNode}</p>
                        )}
                         {!isAvailable && (
                            <Badge variant="destructive" className="text-lg px-3 py-1">Unavailable</Badge>
                        )}
                    </div>
                    {usedBook.listingType.split(',').some((t) => t === 'Swap' || t === 'Free') && (
                        <div>
                        <p className="text-xl sm:text-2xl font-semibold text-accent">{usedBook.listingType.split(',').includes('Free') ? 'Free' : 'Available for Swap'}</p>
                        {(usedBook.preferences || usedBook.swapPreferences) && <p className="text-xs sm:text-sm text-muted-foreground mt-1">Preferences: {usedBook.preferences || usedBook.swapPreferences}</p>}
                        </div>
                    )}
                    </>
                )}
                {newBook && formattedPriceNode && (
                     <p className="text-3xl sm:text-4xl font-bold text-accent">{formattedPriceNode}</p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                     {isUsed && usedBook && canMakeOffer && (
                        <MakeOfferDialog listing={usedBook}>
                             <Button size="lg" variant="default" className="flex-1 h-10 sm:h-12 text-sm sm:text-base">
                                <Handshake className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                                Make an Offer
                            </Button>
                        </MakeOfferDialog>
                    )}
                    {isUsed && usedBook && !canMakeOffer && !usedBook.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && ( // Show "This is Your Listing" or "Unavailable" for Swap/Other if cannot make offer
                         <Button size="lg" className="flex-1 h-10 sm:h-12 text-sm sm:text-base bg-accent hover:bg-accent/90 text-accent-foreground" disabled>
                            <Tag className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> 
                            {currentUser && usedBook.seller.id === currentUser.id ? "This is Your Listing" : "Offer Not Available"}
                        </Button>
                    )}
                    {isUsed && usedBook && !isAvailable && usedBook.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && ( // Specifically for "Sale" items that are unavailable
                         <Button size="lg" className="flex-1 h-10 sm:h-12 text-sm sm:text-base" variant="outline" disabled>
                            <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            Item Unavailable
                        </Button>
                    )}
                    <Button size="lg" variant="outline" onClick={handleWishlistToggle} className={cn("sm:max-w-[180px] flex-1 h-10 sm:h-12 text-sm sm:text-base border-primary/40 hover:bg-primary/5", isBookInWishlist && "bg-primary/10 text-primary border-primary/70")}>
                    <Heart className={cn("mr-2 h-4 w-4 sm:h-5 sm:w-5 transition-all", isBookInWishlist && 'fill-primary text-primary')} /> 
                    {isBookInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                    </Button>
                </div>
            </CardContent>
        </Card>
        
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted/70 h-auto py-1">
            <TabsTrigger value="description" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md text-xs sm:text-sm py-1.5 sm:py-2.5"><BookOpenText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 inline-block" />Description</TabsTrigger>
            <TabsTrigger value="details" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md text-xs sm:text-sm py-1.5 sm:py-2.5"><Info className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 inline-block" />Details</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="py-4 sm:py-6 px-1 text-sm sm:text-base text-foreground/90 leading-relaxed">
            <p className="whitespace-pre-line">{book.description}</p>
            {isUsed && (
                 <p className="mt-3 sm:mt-4 text-xs text-muted-foreground italic">
                    Seller's notes for this used book.
                </p>
            )}
            {!isUsed && (
                <p className="mt-3 sm:mt-4 text-xs text-muted-foreground italic">
                Description may be AI-enhanced and curated by administrators.
                </p>
            )}
          </TabsContent>
          <TabsContent value="details" className="py-4 sm:py-6 px-1">
            <Card className="bg-card/50">
                <CardContent className="pt-4 sm:pt-6 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                    {book.isbn && <div className="flex justify-between"><strong>ISBN:</strong> <span>{book.isbn}</span></div>}
                    {book.publisher && <div className="flex justify-between"><strong>Publisher:</strong> <span>{book.publisher}</span></div>}
                    {book.publicationDate && <div className="flex justify-between"><strong>Published:</strong> <span>{new Date(book.publicationDate).toLocaleDateString()}</span></div>}
                    {book.pageCount && <div className="flex justify-between"><strong>Pages:</strong> <span>{book.pageCount}</span></div>}
                    {book.language && <div className="flex justify-between"><strong>Language:</strong> <span>{book.language}</span></div>}
                    {usedBook && <div className="flex justify-between"><strong>Listed:</strong> <span>{new Date(usedBook.listedDate).toLocaleDateString()}</span></div>}
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}