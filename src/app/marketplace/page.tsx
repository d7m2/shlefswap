'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookCard } from '@/components/books/BookCard';
import { CatalogFilters, type CatalogFilterState } from '@/components/marketplace/CatalogFilters';
import { getUsedBookListings } from '@/lib/firebase/utils';
import { bookService } from '@/services/bookService';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Book, UsedBookListing, BookListItem } from '@/types';
import { PaginationControls } from '@/components/shared/PaginationControls';

const ITEMS_PER_PAGE = 16;

function parseBookType(value: string | null): CatalogFilterState['bookType'] {
  if (value === 'sale' || value === 'swap' || value === 'free' || value === 'all') return value;
  return 'all';
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams.get('q') || '';
  const initialSortBy = (searchParams.get('sort') || searchParams.get('sortBy') || 'popularity') as CatalogFilterState['sortBy'];
  const initialBookType = parseBookType(searchParams.get('type'));

  const [newBooks, setNewBooks] = useState<Book[]>([]);
  const [allListings, setAllListings] = useState<UsedBookListing[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [filters, setFilters] = useState<CatalogFilterState>({
    bookType: initialBookType,
    genre: 'All Genres',
    condition: 'Any Condition',
    minPrice: '',
    maxPrice: '',
    sortBy: initialSortBy,
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  useEffect(() => {
    const sortByFromUrl = (searchParams.get('sort') || searchParams.get('sortBy') || 'popularity') as CatalogFilterState['sortBy'];
    const bookTypeFromUrl = parseBookType(searchParams.get('type'));
    if (sortByFromUrl !== filters.sortBy || bookTypeFromUrl !== filters.bookType) {
      setFilters(prev => ({ ...prev, sortBy: sortByFromUrl, bookType: bookTypeFromUrl }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetchCatalog = async () => {
      try {
        const [fetchedNewBooks, fetchedListings] = await Promise.all([
          bookService.getNewBooks({ limit: '100' }).catch(() => []),
          getUsedBookListings(100),
        ]);
        if (cancelled) return;
        setNewBooks(Array.isArray(fetchedNewBooks) ? fetchedNewBooks : []);
        setAllListings(fetchedListings.listings);
      } catch (err) {
        console.error("Failed to fetch catalog:", err);
        if (!cancelled) setError("Failed to load the book catalog. Please try again later.");
      } finally {
        if (!cancelled) setLoading(false);
        setLoaded(true);
      }
    };
    fetchCatalog();
    return () => { cancelled = true; };
  }, []);

  const allBooks = useMemo(() => {
    if (!loaded) return [];
    return [...newBooks, ...allListings] as BookListItem[];
  }, [newBooks, allListings, loaded]);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    allBooks.forEach(book => {
      if (book.genres) {
        book.genres.forEach(g => genres.add(g));
      }
    });
    return ['All Genres', ...Array.from(genres).sort()];
  }, [allBooks]);

  const filteredAndSortedBooks = useMemo(() => {
    if (!loaded) return [];
    let books: BookListItem[] = [...allBooks];

    if (filters.bookType === 'sale') {
      books = books.filter(book =>
        'listingId' in book && (book.listingType || '').split(',').some((t) => t === 'Sale' || t === 'Sell')
      );
    } else if (filters.bookType === 'swap') {
      books = books.filter(book =>
        'listingId' in book && (book.listingType || '').split(',').includes('Swap')
      );
    } else if (filters.bookType === 'free') {
      books = books.filter(book =>
        'listingId' in book && (book.listingType || '').split(',').includes('Free')
      );
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      books = books.filter(
        (book) =>
          book.title.toLowerCase().includes(lowerSearchTerm) ||
          book.author.toLowerCase().includes(lowerSearchTerm) ||
          (book.isbn && book.isbn.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (filters.genre !== 'All Genres') {
      books = books.filter(book => book.genres?.includes(filters.genre));
    }

    if (filters.condition !== 'Any Condition') {
      books = books.filter(book => {
        if (!('listingId' in book)) return true;
        return book.condition === filters.condition;
      });
    }

    const minPriceNum = parseFloat(filters.minPrice);
    const maxPriceNum = parseFloat(filters.maxPrice);
    const hasMin = !isNaN(minPriceNum) && minPriceNum >= 0;
    const hasMax = !isNaN(maxPriceNum) && maxPriceNum >= 0;
    if (hasMin || hasMax) {
      books = books.filter(book => {
        if (!('listingId' in book)) return false;
        const listingTypes = (book.listingType || '').split(',');
        if (!listingTypes.some((t) => t === 'Sale' || t === 'Sell') || book.salePrice === undefined) return false;
        if (hasMin && book.salePrice < minPriceNum) return false;
        if (hasMax && book.salePrice > maxPriceNum) return false;
        return true;
      });
    }

    switch (filters.sortBy) {
      case 'newest':
        books.sort((a, b) => {
          const dateA = 'publicationDate' in a && a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
          const dateB = 'publicationDate' in b && b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
          if (dateA !== dateB) return dateB - dateA;
          const listedDateA = 'listedDate' in a && a.listedDate ? new Date(a.listedDate).getTime() : 0;
          const listedDateB = 'listedDate' in b && b.listedDate ? new Date(b.listedDate).getTime() : 0;
          if (listedDateA !== listedDateB) return listedDateB - listedDateA;
          return b.id.localeCompare(a.id);
        });
        break;
      case 'listed_date_desc':
        books.sort((a, b) => {
          const listedDateA = 'listedDate' in a && a.listedDate ? new Date(a.listedDate).getTime() : 0;
          const listedDateB = 'listedDate' in b && b.listedDate ? new Date(b.listedDate).getTime() : 0;
          return listedDateB - listedDateA;
        });
        break;
      case 'listed_date_asc':
        books.sort((a, b) => {
          const listedDateA = 'listedDate' in a && a.listedDate ? new Date(a.listedDate).getTime() : 0;
          const listedDateB = 'listedDate' in b && b.listedDate ? new Date(b.listedDate).getTime() : 0;
          return listedDateA - listedDateB;
        });
        break;
      case 'rating':
        books.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'price_asc':
        books.sort((a, b) => {
          const priceA = 'price' in a && a.price !== undefined ? a.price : ('salePrice' in a && a.salePrice !== undefined ? a.salePrice : Infinity);
          const priceB = 'price' in b && b.price !== undefined ? b.price : ('salePrice' in b && b.salePrice !== undefined ? b.salePrice : Infinity);
          return priceA - priceB;
        });
        break;
      case 'price_desc':
        books.sort((a, b) => {
          const priceA = 'price' in a && a.price !== undefined ? a.price : ('salePrice' in a && a.salePrice !== undefined ? a.salePrice : -Infinity);
          const priceB = 'price' in b && b.price !== undefined ? b.price : ('salePrice' in b && b.salePrice !== undefined ? b.salePrice : -Infinity);
          return priceB - priceA;
        });
        break;
      case 'popularity':
      default:
        books.sort((a, b) => {
          if (!searchTerm) {
            const listedDateA = 'listedDate' in a && a.listedDate ? new Date(a.listedDate).getTime() : 0;
            const listedDateB = 'listedDate' in b && b.listedDate ? new Date(b.listedDate).getTime() : 0;
            if (listedDateA !== listedDateB) return listedDateB - listedDateA;
          }
          return (b.averageRating || 0) - (a.averageRating || 0);
        });
        break;
    }
    return books;
  }, [searchTerm, filters, allBooks, loaded]);

  const totalPages = Math.ceil(filteredAndSortedBooks.length / ITEMS_PER_PAGE);

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedBooks, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  return (
    <div className="space-y-8">
      <PageHeader title="Marketplace" description="Browse new releases and used books — buy, sell, or swap.">
        <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/sell">List Your Book</Link>
        </Button>
      </PageHeader>

      <div className="relative mb-8">
        <Input
          type="search"
          placeholder="Search new & used books by title, author, ISBN..."
          className="h-11 text-base pl-10 pr-4 rounded-lg shadow-sm focus-visible:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search books"
        />
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="grid md:grid-cols-4 gap-8 items-start">
        <aside className="md:col-span-1">
          <CatalogFilters onFiltersChange={setFilters} initialFilters={filters} availableGenres={availableGenres} />
        </aside>
        <main className="md:col-span-3">
          {loading && <div className="text-center py-12"><p className="text-xl">Loading books...</p></div>}
          {error && <div className="text-center py-12"><p className="text-xl text-red-500">{error}</p></div>}
          {!loading && !error && paginatedBooks.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedBooks.map((book) => {
                  const key = 'listingId' in book ? book.listingId : book.id;
                  return <BookCard key={key} book={book} />;
                })}
              </div>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredAndSortedBooks.length}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground">No books match your criteria.</p>
              <p className="mt-2">Try adjusting your filters, searching for something else, or check back later for new listings.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div>Loading marketplace...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}