'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookCard } from '@/components/books/BookCard';
import type { UsedBookListing } from '@/types';
import { PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSpecificListings } from '@/lib/firebase/utils'; // Import the new utility
import type { DocumentSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const LISTINGS_PER_PAGE = 10;

export default function MyListingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [myListings, setMyListings] = useState<UsedBookListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<DocumentSnapshot | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  console.log('[MyListingsPage] Rendering. currentUser:', currentUser);
  console.log('[MyListingsPage] isLoading state:', isLoading);

  const fetchListings = useCallback(async (loadMore = false, currentLastVisibleDoc: DocumentSnapshot | undefined = undefined) => {
    console.log('[MyListingsPage] fetchListings called. loadMore:', loadMore, 'currentUser:', currentUser ? currentUser.id : 'null', 'currentLastVisibleDoc:', currentLastVisibleDoc?.id);
    if (!currentUser) {
      console.log('[MyListingsPage] fetchListings: No currentUser, setting isLoading to false and returning.');
      setIsLoading(false);
      setMyListings([]);
      return;
    }

    if (loadMore) {
      console.log('[MyListingsPage] fetchListings: Loading more...');
      setIsLoadingMore(true);
    } else {
      console.log('[MyListingsPage] fetchListings: Initial load or user change, setting isLoading to true.');
      setIsLoading(true);
      setMyListings([]);
    }
    setError(null);

    try {
      console.log('[MyListingsPage] fetchListings: Attempting to call getUserSpecificListings.');
      const LVDoc = loadMore ? currentLastVisibleDoc : undefined;
      console.log('[MyListingsPage] fetchListings: calling with LVDoc:', LVDoc?.id);

      const { listings: fetchedListings, lastVisibleDoc: newLastVisible, hasMore: newHasMore } = 
        await getUserSpecificListings(
          currentUser.id, 
          LISTINGS_PER_PAGE, 
          LVDoc
        );
      console.log('[MyListingsPage] fetchListings: getUserSpecificListings returned.', { fetchedListingsCount: fetchedListings.length, newLastVisibleId: newLastVisible?.id, newHasMore });
      
      setMyListings(prev => loadMore ? [...prev, ...fetchedListings] : fetchedListings);
      setLastVisibleDoc(newLastVisible || undefined);
      setHasMore(newHasMore);
    } catch (err) {
      console.error("[MyListingsPage] fetchListings: Error caught:", err);
      setError("Failed to load your listings. Please try again.");
    } finally {
      console.log('[MyListingsPage] fetchListings: Finally block. Setting isLoading & isLoadingMore to false.');
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('[MyListingsPage] useEffect for initial fetch triggered. currentUser:', currentUser ? currentUser.id : 'null');
    if (currentUser) {
      console.log('[MyListingsPage] CurrentUser available, fetching initial listings.');
      fetchListings(false, undefined);
    } else {
      setMyListings([]);
      setIsLoading(false);
      setLastVisibleDoc(undefined);
      setHasMore(false);
      console.log('[MyListingsPage] useEffect: currentUser is null, cleared listings.');
    }
  }, [currentUser, fetchListings]);

  const handleListingDeleted = (deletedListingId: string) => {
    console.log('[MyListingsPage] handleListingDeleted called for:', deletedListingId);
    setMyListings(prevListings => prevListings.filter(listing => listing.listingId !== deletedListingId));
    // Optionally, you might want to refetch or adjust pagination state here
    // For simplicity, just removing from current list. If it was the last on a page,
    // "Load More" might behave unusually until next full load.
  };

  const handleListingUpdated = (listingId: string) => {
    console.log('[MyListingsPage] handleListingUpdated called for listingId:', listingId);
    // Refetch all listings to get the updated data.
    // This is simpler than trying to update a single item without the full updated object.
    toast({
      title: "Refreshing Listings",
      description: "Updating your view with the latest changes...",
    });
    // Reset pagination and fetch the first page to ensure the updated item is visible if it affected ordering
    setLastVisibleDoc(undefined);
    setMyListings([]); // Clear current listings to show loading state more clearly if desired
    setIsLoading(true); // Explicitly set loading before fetch
    fetchListings(false, undefined);
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore) {
      console.log('[MyListingsPage] handleLoadMore called. lastVisibleDoc for next page:', lastVisibleDoc?.id);
      fetchListings(true, lastVisibleDoc);
    }
  };

  if (!currentUser && !isLoading) {
    console.log('[MyListingsPage] Rendering: Not logged in view.');
    return (
      <div className="space-y-8 text-center py-12">
        <PageHeader
          title="My Book Listings"
          description="Manage your books currently up for sale or swap."
        />
        <Card className="max-w-md mx-auto shadow">
          <CardHeader>
            <CardTitle className="text-xl flex items-center justify-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Please Log In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              You need to be logged in to view your listings.
            </CardDescription>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/login">Log In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <PageHeader
        title="My Book Listings"
        description="Manage your books currently up for sale or swap."
      >
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/sell">
            <PlusCircle className="mr-2 h-4 w-4" /> List New Book
          </Link>
        </Button>
      </PageHeader>

      {isLoading && myListings.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg text-muted-foreground">Loading your listings...</p>
        </div>
      )}

      {error && (
        <Card className="text-center py-12 shadow bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-xl text-destructive flex items-center justify-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-destructive/80">
              {error}
            </CardDescription>
            <Button onClick={() => fetchListings()} className="mt-6">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && myListings.length === 0 && (
        <Card className="text-center py-12 shadow">
          <CardHeader>
            <CardTitle className="text-xl text-muted-foreground">No Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              You haven&apos;t listed any books yet. Why not share some of your collection?
            </CardDescription>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/sell">List Your First Book</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {myListings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
          {myListings.map((listing) => (
            <BookCard 
              key={listing.listingId} 
              book={listing} 
              onListingDeleted={handleListingDeleted}
              onListingUpdated={handleListingUpdated}
            />
          ))}
        </div>
      )}

      {hasMore && !isLoadingMore && !error && (
        <div className="text-center mt-8">
          <Button onClick={handleLoadMore} variant="outline">
            Load More Listings
          </Button>
        </div>
      )}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading more...</p>
        </div>
      )}
    </div>
  );
}

