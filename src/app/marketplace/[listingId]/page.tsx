import { BookDetailsView } from '@/components/books/BookDetailsView';
// import { getBookById, usedBookListings } from '@/lib/placeholder-data'; // Remove placeholder
import { getUsedBookListingById, getUsedBookListings } from '@/lib/firebase/utils'; // Import live data fetchers
import { BookCard } from '@/components/books/BookCard';

// Remove the separate UsedBookPageProps type definition if not used elsewhere
// type UsedBookPageProps = {
//   params: { listingId: string }; 
// };

// This page will be dynamically rendered, so revalidate as needed or set to 0 for full dynamic on every request.
// export const revalidate = 60; // Example: revalidate every 60 seconds

// Destructure params directly in the function signature
export default async function UsedBookPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params; // Await params before destructuring

  const listing = await getUsedBookListingById(listingId);

  if (!listing) { // getUsedBookListingById returns null if not found
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold">Listing not found</h1>
        <p className="text-muted-foreground mt-2">
          The listing you are looking for does not exist or is no longer available.
        </p>
      </div>
    );
  }
  
  // Fetch some related/other listings, excluding the current one.
  // For simplicity, fetch a few recent ones. This could be more sophisticated.
  const { listings: relatedListingsData } = await getUsedBookListings(7); // Fetch 6 + 1, then filter
  const relatedListings = relatedListingsData
    .filter(l => l.listingId !== listing.listingId)
    .slice(0, 6);

  return (
    <div className="space-y-12">
      <BookDetailsView book={listing} />

      {relatedListings.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-primary tracking-tight mb-6">You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {relatedListings.map((relatedListing) => (
                <BookCard key={relatedListing.listingId} book={relatedListing} />
              ))}
            </div>
        </section>
      )}
    </div>
  );
}

// Remove generateStaticParams as this page is now dynamic
// export async function generateStaticParams() {
//   // This would need to fetch all listing IDs from Firestore if kept, which is not ideal for dynamic content.
//   // return usedBookListings.map((listing) => ({
//   //   listingId: listing.listingId,
//   // }));
// }

