import { NextResponse } from 'next/server';
import { dbAdmin as db, admin } from '@/lib/firebase/server'; // Assuming server-side Firebase admin
import type { UsedBookListing } from '@/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy');
  const limitParam = searchParams.get('limit');
  const listingType = searchParams.get('type');
  const condition = searchParams.get('condition');
  const userId = searchParams.get('userId'); // To fetch listings by a specific user

  try {
    if (!db) {
      return NextResponse.json([]);
    }

    const listingsCollection = db.collection('usedBookListings');
    let q: admin.firestore.Query = listingsCollection; // Start with the base collection

    // Always filter out listings that are not available (e.g., Sold, Swap Agreed)
    // Applying this filter first can make subsequent queries more efficient.
    q = q.where('status', '==', 'Available');

    // Sorting
    if (sortBy === 'popular') {
      // Popularity might be based on views, offers, or a combination.
      // For this example, let's assume a 'popularityScore' field or sort by 'listedDate' as a proxy for recent activity.
      q = q.orderBy('listedDate', 'desc'); // Or orderBy('popularityScore', 'desc')
    } else if (sortBy === 'newest') {
      q = q.orderBy('listedDate', 'desc');
    } else if (sortBy === 'priceLowToHigh') {
      q = q.orderBy('salePrice', 'asc');
    } else if (sortBy === 'priceHighToLow') {
      q = q.orderBy('salePrice', 'desc');
    } else {
      q = q.orderBy('listedDate', 'desc'); // Default sort
    }

    // Filtering
    if (listingType) {
      q = q.where('listingType', '==', listingType);
    }
    if (condition) {
      q = q.where('condition', '==', condition);
    }
    if (userId) {
      q = q.where('sellerId', '==', userId);
    }

    // Limiting
    if (limitParam) {
      const numLimit = parseInt(limitParam, 10);
      if (!isNaN(numLimit) && numLimit > 0) {
        q = q.limit(numLimit);
      } else {
        console.warn(`Invalid limit parameter for listings: ${limitParam}.`);
      }
    }

    const querySnapshot = await q.get();
    const listings = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure date fields are handled correctly (e.g., convert Firestore Timestamps to ISO strings if needed by client)
      return {
        id: doc.id,
        listingId: doc.id,
        ...data,
        listedDate: data.listedDate instanceof admin.firestore.Timestamp ? data.listedDate.toDate().toISOString() : data.listedDate,
      } as UsedBookListing;
    });
    
    return NextResponse.json(listings);
  } catch (error) {
    console.error("Error fetching marketplace listings:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: "Failed to fetch marketplace listings", error: errorMessage }, { status: 500 });
  }
} 