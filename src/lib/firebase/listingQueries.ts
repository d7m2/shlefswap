import { db } from './config';
import {
  collection, getDocs, query, orderBy, limit, startAfter, doc, getDoc, where,
  type DocumentData, type QueryDocumentSnapshot, type DocumentSnapshot, type OrderByDirection,
} from 'firebase/firestore';
import type { UsedBookListing } from '@/types';
export async function getUsedBookListings(
  count: number = 12,
  lastVisible?: QueryDocumentSnapshot<DocumentData>,
  orderByOptions?: { field: string; direction: OrderByDirection }
): Promise<{ listings: UsedBookListing[]; lastVisible?: QueryDocumentSnapshot<DocumentData> }> {
  try {
    const listingsRef = collection(db, 'usedBookListings');
    const sortField = orderByOptions?.field || 'listedDate';
    const sortDirection = orderByOptions?.direction || 'desc';

    let q = query(listingsRef, orderBy(sortField, sortDirection), limit(count));

    if (lastVisible) {
      q = query(listingsRef, orderBy(sortField, sortDirection), startAfter(lastVisible), limit(count));
    }

    const querySnapshot = await getDocs(q);
    const listings: UsedBookListing[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      listings.push({
        ...(data as Omit<UsedBookListing, 'listingId' | 'listedDate' | 'seller'>), // Cast known fields
        id: doc.id,
        listingId: doc.id,
        // Ensure seller and listedDate are correctly typed or transformed if needed
        // For example, if listedDate is a Firestore Timestamp:
        listedDate: data.listedDate?.toDate ? data.listedDate.toDate().toISOString() : new Date().toISOString(),
        // Assuming seller data is directly on the listing or needs fetching/joining
        // This might need adjustment based on your actual Firestore structure for seller
        seller: data.seller || { id: data.sellerId, username: data.sellerUsername, email: '', profilePictureUrl: data.sellerProfilePictureUrl },
      } as UsedBookListing);
    });

    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    const availableListings = listings.filter((listing) => {
      if (typeof listing.status === 'string') {
        return listing.status.trim().toLowerCase() === 'available';
      }
      if (typeof listing.availability === 'string') {
        return listing.availability.trim().toLowerCase() === 'available';
      }
      return true;
    });

    return { listings: availableListings, lastVisible: newLastVisible };
  } catch (error) {
    console.error("Error fetching used book listings:", error);
    return { listings: [], lastVisible: undefined };
  }
}
export async function getUserSpecificListings(userId: string, limitCount: number = 10, startAfterDoc?: DocumentSnapshot): Promise<{
  listings: UsedBookListing[],
  lastVisibleDoc: DocumentSnapshot | null,
  hasMore: boolean
}> {
  console.log('[getUserSpecificListings] Called with userId:', userId, 'limitCount:', limitCount, 'startAfterDoc:', startAfterDoc);
  if (!userId) {
    console.log("[getUserSpecificListings] User ID not provided, returning empty listings.");
    return { listings: [], lastVisibleDoc: null, hasMore: false };
  }

  try {
    console.log('[getUserSpecificListings] Step 1: Querying user\'s myListings subcollection.');
    const userListingsRef = collection(db, `users/${userId}/myListings`);
    let q = query(userListingsRef, orderBy("listedDate", "desc"), limit(limitCount));

    if (startAfterDoc) {
      console.log('[getUserSpecificListings] Applying startAfterDoc.');
      q = query(userListingsRef, orderBy("listedDate", "desc"), startAfter(startAfterDoc), limit(limitCount));
    }

    const userListingsSnapshot = await getDocs(q);
    console.log('[getUserSpecificListings] userListingsSnapshot size:', userListingsSnapshot.size);
    const userListingRefs = userListingsSnapshot.docs.map(doc => doc.data() as { listingId: string, [key:string]: any });
    console.log('[getUserSpecificListings] userListingRefs:', userListingRefs);
    
    if (userListingRefs.length === 0) {
      console.log('[getUserSpecificListings] No listing refs found for user.');
      return { listings: [], lastVisibleDoc: null, hasMore: false };
    }

    console.log('[getUserSpecificListings] Step 2: Fetching full listing details.');
    const listings: UsedBookListing[] = [];
    
    const listingPromises = userListingRefs.map(refData => {
        if (!refData.listingId) {
            console.warn('[getUserSpecificListings] Found a refData without listingId:', refData);
            return null;
        }
        const listingDocRef = doc(db, 'usedBookListings', refData.listingId);
        return getDoc(listingDocRef);
    }).filter(p => p !== null) as Promise<DocumentSnapshot<DocumentData>>[];

    console.log('[getUserSpecificListings] Number of listing promises to resolve:', listingPromises.length);
    const listingDocsSnaps = await Promise.all(listingPromises);
    console.log('[getUserSpecificListings] Resolved listingDocSnaps count:', listingDocsSnaps.length);

    listingDocsSnaps.forEach(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<UsedBookListing, 'id' | 'listingId'>;
        const listedDate = (data.listedDate as any)?.toDate ? (data.listedDate as any).toDate().toISOString() : new Date().toISOString();
        listings.push({
          ...data,
          id: docSnap.id, 
          listingId: docSnap.id, 
          listedDate,
        } as UsedBookListing);
      } else {
        console.warn('[getUserSpecificListings] A listing document did not exist for one of the refs. ID:', docSnap.id);
      }
    });
    console.log('[getUserSpecificListings] Processed listings count:', listings.length);

    const lastVisibleDoc = userListingsSnapshot.docs.length > 0 ? userListingsSnapshot.docs[userListingsSnapshot.docs.length - 1] : null;
    const hasMore = userListingsSnapshot.docs.length === limitCount;
    console.log('[getUserSpecificListings] Returning:', { listingsCount: listings.length, lastVisibleDocId: lastVisibleDoc?.id, hasMore });

    return { listings, lastVisibleDoc, hasMore };

  } catch (error) {
    console.error("[getUserSpecificListings] Error fetching user specific listings:", error);
    throw error; 
  }
}
export async function getUsedBookListingById(listingId: string): Promise<UsedBookListing | null> {
  if (!listingId) {
    console.log("Listing ID not provided.");
    return null;
  }
  try {
    const listingRef = doc(db, 'usedBookListings', listingId);
    const docSnap = await getDoc(listingRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const listedDate = (data.listedDate as any)?.toDate ? (data.listedDate as any).toDate().toISOString() : new Date().toISOString();
      return {
        ...(data as Omit<UsedBookListing, 'id' | 'listingId' | 'listedDate'>),
        id: docSnap.id,
        listingId: docSnap.id,
        listedDate,
      } as UsedBookListing;
    } else {
      console.log("No such listing!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching used book listing by ID:", error);
    throw error; // Or return null, depending on desired error handling
  }
}
export async function getUserActiveListingsCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    console.log(`[getUserActiveListingsCount] Fetching all listings count for userId: ${userId}`);
    const userListingsRef = collection(db, `users/${userId}/myListings`);
    
    // Option 1: If every document in 'myListings' represents one unique listing.
    const userListingsSnapshot = await getDocs(userListingsRef);
    const count = userListingsSnapshot.size;

    // Option 2: If you prefer to use getCountFromServer for potentially better efficiency
    // const snapshot = await getCountFromServer(userListingsRef);
    // const count = snapshot.data().count;

    console.log(`[getUserActiveListingsCount] Total listings for userId ${userId}: ${count}`);
    return count;
  } catch (error) {
    console.error(`[getUserActiveListingsCount] Error fetching user total listings count for userId: ${userId}:`, error);
    return 0;
  }
}
export async function getUserAvailableSwapListings(userId: string): Promise<UsedBookListing[]> {
  if (!userId) {
    console.log("[getUserAvailableSwapListings] User ID not provided, returning empty array.");
    return [];
  }

  try {
    const listingsRef = collection(db, 'usedBookListings');
    const q = query(
      listingsRef,
      where("sellerId", "==", userId),
      where("status", "in", ["available", "swap agreed"])
    );

    const querySnapshot = await getDocs(q);
    const listings: UsedBookListing[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      listings.push({
        ...(data as Omit<UsedBookListing, 'id' | 'listingId' | 'listedDate'>),
        id: doc.id,
        listingId: doc.id,
        listedDate: data.listedDate?.toDate ? data.listedDate.toDate().toISOString() : new Date().toISOString(),
        // Seller data is already part of the document structure if denormalized, or ensure sellerId is sufficient
      } as UsedBookListing);
    });
    console.log(`[getUserAvailableSwapListings] Found ${listings.length} available listings for user ${userId}`);
    return listings;
  } catch (error) {
    console.error(`[getUserAvailableSwapListings] Error fetching available swap listings for user ${userId}:`, error);
    return []; // Return empty array on error
  }
}
