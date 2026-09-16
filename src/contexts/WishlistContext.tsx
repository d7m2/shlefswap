'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';
import type { Book } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Heart } from 'lucide-react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { addToWishlistAction, removeFromWishlistAction } from '@/app/actions';

interface WishlistContextType {
  wishlistItems: Book[];
  addToWishlist: (book: Book) => Promise<void>;
  removeFromWishlist: (bookId: string) => Promise<void>;
  isInWishlist: (bookId: string) => boolean;
  clearWishlist: () => Promise<void>;
  loadingWishlist: boolean;
  isUpdatingWishlist: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const [wishlistItems, setWishlistItems] = useState<Book[]>([]);
  const [loadingWishlist, setLoadingWishlist] = useState(true);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchFirestoreWishlist = useCallback(async (userId: string) => {
    setLoadingWishlist(true);
    try {
      const q = query(collection(db, "userFavorites"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const firestoreItems: Book[] = [];
      querySnapshot.forEach((snapDoc) => {
        const data = snapDoc.data();
        firestoreItems.push({ 
            id: data.bookId, 
            title: data.title,
            author: data.author,
            coverImageUrl: data.coverImageUrl,
            ...data
        } as Book);
      });
      setWishlistItems(firestoreItems);
    } catch (error) {
      console.error("Error fetching wishlist from Firestore:", error);
      toast({ title: "Error", description: "Could not load your wishlist from the cloud.", variant: "destructive" });
      setWishlistItems([]); 
    } finally {
      setLoadingWishlist(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      fetchFirestoreWishlist(currentUser.id);
    } else {
      setWishlistItems([]);
      setLoadingWishlist(false);
    }
  }, [currentUser, fetchFirestoreWishlist]);

  const addToWishlist = useCallback(async (book: Book) => {
    if (!book || !book.id) {
      console.error("Attempted to add a book without an ID to wishlist", book);
      toast({ title: "Error", description: "Cannot add book without ID to wishlist.", variant: "destructive" });
      return;
    }

    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to add items to your wishlist.", variant: "default" });
      return;
    }
    
    const alreadyInWishlist = wishlistItems.some(item => item.id === book.id);
    if (alreadyInWishlist) {
        toast({ title: "Already in Wishlist", description: `"${book.title}" is already in your wishlist.`, icon: <Heart className="h-5 w-5 text-accent" /> });
        return;
    }

    setWishlistItems((prevItems) => [...prevItems, book]);
    setIsUpdatingWishlist(true);

    startTransition(async () => {
      try {
        const { ...bookDataForAction } = book;

        const result = await addToWishlistAction(currentUser.id, book.id, bookDataForAction as Omit<Book, 'id'>);

        if (result.success) {
          toast({ title: "Added to Wishlist!", description: `"${book.title}" has been added.`, icon: <Heart className="h-5 w-5 text-primary" /> });
        } else {
          toast({ title: "Error Adding", description: result.message, variant: "destructive" });
          setWishlistItems((prevItems) => prevItems.filter(item => item.id !== book.id));
        }
      } catch (error) {
        console.error("Error calling addToWishlistAction:", error);
        toast({ title: "Server Error", description: "Could not add item to wishlist.", variant: "destructive" });
        setWishlistItems((prevItems) => prevItems.filter(item => item.id !== book.id));
      } finally {
        setIsUpdatingWishlist(false);
      }
    });
  }, [currentUser, toast, wishlistItems, startTransition]);

  const removeFromWishlist = useCallback(async (bookId: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "Please log in to modify your wishlist.", variant: "default" });
      return;
    }

    const itemToRemove = wishlistItems.find(item => item.id === bookId);
    if (!itemToRemove) return;

    setWishlistItems((prevItems) => prevItems.filter(item => item.id !== bookId));
    setIsUpdatingWishlist(true);
    
    startTransition(async () => {
      try {
        const result = await removeFromWishlistAction(currentUser.id, bookId);
        if (result.success) {
          toast({ title: "Removed from Wishlist", description: `"${itemToRemove.title}" has been removed.`, icon: <Heart className="h-5 w-5 text-destructive" /> });
        } else {
          toast({ title: "Error Removing", description: result.message, variant: "destructive" });
          setWishlistItems((prevItems) => [...prevItems, itemToRemove]);
        }
      } catch (error) {
        console.error("Error calling removeFromWishlistAction:", error);
        toast({ title: "Server Error", description: "Could not remove item from wishlist.", variant: "destructive" });
        setWishlistItems((prevItems) => [...prevItems, itemToRemove]);
      } finally {
        setIsUpdatingWishlist(false);
      }
    });
  }, [currentUser, toast, wishlistItems, startTransition]);

  const isInWishlist = useCallback((bookId: string) => {
    return wishlistItems.some(item => item.id === bookId);
  }, [wishlistItems]);

  const clearWishlist = useCallback(async () => {
    setWishlistItems([]);
    toast({ title: "Wishlist Cleared", description: "All items removed from your wishlist." });
    
    if (currentUser) {
        console.warn("clearWishlist for logged-in user should ideally be a server action for revalidation.");
        try {
            const q = query(collection(db, "userFavorites"), where("userId", "==", currentUser.id));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(docRef => batch.delete(docRef.ref));
                await batch.commit();
            }
        } catch (error) {
            console.error("Error clearing Firestore wishlist directly:", error);
            toast({title: "Error", description: "Could not clear wishlist from cloud.", variant: "destructive"})
        }
    }
  }, [currentUser, toast]);

  return (
    <WishlistContext.Provider value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, clearWishlist, loadingWishlist, isUpdatingWishlist: isUpdatingWishlist || isPending }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
