import { db } from './config';
import {
  collection, getDocs, query, where, orderBy,
  type DocumentData, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Offer } from '@/types';
export async function getOffersForUser(userId: string): Promise<{ sent: Offer[], received: Offer[] }> {
  if (!userId) {
    console.log("User ID not provided to getOffersForUser.");
    return { sent: [], received: [] };
  }

  try {
    const offersRef = collection(db, 'offers');

    // Helper function to process offer documents
    const processOfferDoc = (docSnap: QueryDocumentSnapshot<DocumentData>): Offer => {
      const data = docSnap.data();
      
      let dateOffered = data.dateOffered as any;
      if (dateOffered && typeof dateOffered.toDate === 'function') {
        dateOffered = dateOffered.toDate().toISOString();
      } else if (dateOffered && typeof dateOffered.seconds === 'number') { 
        dateOffered = new Date(dateOffered.seconds * 1000).toISOString();
      }

      let dateResponded = data.dateResponded as any;
      if (dateResponded && typeof dateResponded.toDate === 'function') {
        dateResponded = dateResponded.toDate().toISOString();
      } else if (dateResponded && typeof dateResponded.seconds === 'number') {
        dateResponded = new Date(dateResponded.seconds * 1000).toISOString();
      }

      return {
        id: docSnap.id,
        ...data,
        dateOffered: dateOffered as string, // Cast back to string after processing
        dateResponded: dateResponded as string, // Cast back to string
      } as Offer;
    };

    // Get sent offers
    const sentOffersQuery = query(
      offersRef,
      where("offeredByUserId", "==", userId),
      orderBy("dateOffered", "desc")
    );
    const sentSnapshot = await getDocs(sentOffersQuery);
    const sent: Offer[] = sentSnapshot.docs.map(processOfferDoc);

    // Get received offers
    const receivedOffersQuery = query(
      offersRef,
      where("sellerUserId", "==", userId),
      orderBy("dateOffered", "desc")
    );
    const receivedSnapshot = await getDocs(receivedOffersQuery);
    const received: Offer[] = receivedSnapshot.docs.map(processOfferDoc);

    return { sent, received };
  } catch (error) {
    console.error(`Error fetching offers for user ${userId}:`, error);
    return { sent: [], received: [] }; // Return empty arrays on error
  }
} 
