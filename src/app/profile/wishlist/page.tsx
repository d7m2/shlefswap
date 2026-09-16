'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookCard } from '@/components/books/BookCard';
import { Search, Trash2 } from 'lucide-react';
import { useWishlist } from '@/contexts/WishlistContext';
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

export default function WishlistPage() {
  const { wishlistItems, clearWishlist } = useWishlist();

  // Filter out items with missing or invalid IDs and log them
  const validWishlistItems = wishlistItems.filter(book => {
    if (book && book.id) {
      return true;
    }
    console.warn("Wishlist item filtered out due to missing or invalid ID:", book);
    return false;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Wishlist"
        description="Keep track of books you're interested in."
      >
        <div className="flex gap-2">
          {validWishlistItems.length > 0 && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:border-destructive/80 hover:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear Wishlist
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will remove all books from your wishlist. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearWishlist} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Yes, Clear Wishlist
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" asChild>
            <Link href="/marketplace">
              <Search className="mr-2 h-4 w-4" /> Discover More Books
            </Link>
          </Button>
        </div>
      </PageHeader>

      {validWishlistItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {validWishlistItems.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 shadow">
           <CardHeader>
            <CardTitle className="text-xl text-muted-foreground">Your Wishlist is Empty</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Start exploring and add books you&apos;d love to read or own!
            </CardDescription>
            <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/marketplace">Find Books to Add</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

