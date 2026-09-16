import { BookDetailsView } from '@/components/books/BookDetailsView';
// import { getBookById, newBooks } from '@/lib/placeholder-data';
import { bookService } from '@/services/bookService';
import type { Book } from '@/types'; // Added import for Book type
import { BookCard } from '@/components/books/BookCard';

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params;
  const book = await bookService.getBookById(id);

  if (!book || 'listingId' in book) { // Ensure it's a new book
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold">Book not found</h1>
        <p className="text-muted-foreground mt-2">
          The book you are looking for does not exist or is not available.
        </p>
      </div>
    );
  }

  // Fetch new books for related books section
  const allNewBooks = await bookService.getNewBooks({ sortBy: 'newest', limit: '7' }); // Fetch a bit more to ensure we can filter current one
  // Filter out the current book from related books if it appears
  const relatedBooks = allNewBooks.filter((b: Book) => b.id !== book.id).slice(0, 6); // Show up to 6 related books

  return (
    <div className="space-y-12">
      <BookDetailsView book={book} />

      <section>
        <h2 className="text-2xl font-bold text-primary tracking-tight mb-6">You Might Also Like</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {relatedBooks.map((relatedBook: Book) => (
            <BookCard key={relatedBook.id} book={relatedBook} />
          ))}
        </div>
      </section>
    </div>
  );
}

