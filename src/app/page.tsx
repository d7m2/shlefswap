'use client'; 

import { useState, type FormEvent, Suspense, useEffect } from 'react'; 
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; 
import { BookCard } from '@/components/books/BookCard';
import { getUsedBookListings } from '@/lib/firebase/utils';
import { bookService } from '@/services/bookService';
import type { Book, BookListItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ArrowRight, BookHeart, Users, Repeat } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


function BookCarouselSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="space-y-1 bg-card rounded-lg shadow-sm p-2"> 
          <Skeleton className="h-[180px] sm:h-[200px] md:h-[220px] w-full rounded-md bg-muted/70 aspect-[4/5]" />
          <Skeleton className="h-3 sm:h-3.5 w-3/4 bg-muted/70" />
          <Skeleton className="h-2.5 sm:h-3 w-1/2 bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const t = useTranslation();
  const [heroSearchTerm, setHeroSearchTerm] = useState('');
  const [trendingBooks, setTrendingBooks] = useState<BookListItem[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [newArrivalsBooks, setNewArrivalsBooks] = useState<Book[]>([]);
  const [loadingNewArrivals, setLoadingNewArrivals] = useState(true);

  const handleHeroSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (heroSearchTerm.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(heroSearchTerm.trim())}`);
      setHeroSearchTerm(''); 
    }
  };

  useEffect(() => {
    const fetchTrending = async () => {
      setLoadingTrending(true);
      try {
        // Build trending from a mix of the newest user listings and the new-books catalog
        const [usedResult, fetchedNewBooks] = await Promise.all([
          getUsedBookListings(8),
          bookService.getNewBooks({ limit: '12' }).catch(() => []),
        ]);
        const usedListings = usedResult.listings;
        const newCatalog = Array.isArray(fetchedNewBooks) ? fetchedNewBooks : [];
        const combined: BookListItem[] = [...usedListings, ...newCatalog];
        combined.sort((a, b) => {
          const dateA = 'listedDate' in a && a.listedDate ? new Date(a.listedDate).getTime() : ('publicationDate' in a && a.publicationDate ? new Date(a.publicationDate).getTime() : 0);
          const dateB = 'listedDate' in b && b.listedDate ? new Date(b.listedDate).getTime() : ('publicationDate' in b && b.publicationDate ? new Date(b.publicationDate).getTime() : 0);
          return dateB - dateA;
        });
        setTrendingBooks(combined.slice(0, 6));
      } catch (error) {
        console.error("Error fetching trending listings:", error);
        // Optionally set an error state here
      } finally {
        setLoadingTrending(false);
      }
    };
    fetchTrending();
  }, []);

  useEffect(() => {
    const fetchNewArrivals = async () => {
      setLoadingNewArrivals(true);
      try {
        // "New Arrivals" shows the newest releases from the full new-books catalog,
        // falling back to user listings only if the catalog fetch fails.
        const fetchedNewBooks = await bookService.getNewBooks({ limit: '12' }).catch(() => []);
        if (Array.isArray(fetchedNewBooks) && fetchedNewBooks.length > 0) {
          setNewArrivalsBooks(fetchedNewBooks as Book[]);
        } else {
          const { listings: fetchedFallback } = await getUsedBookListings(6, undefined, { field: 'listedDate', direction: 'desc' });
          setNewArrivalsBooks(fetchedFallback as Book[]);
        }
      } catch (error) {
        console.error("Error fetching new arrivals:", error);
      } finally {
        setLoadingNewArrivals(false);
      }
    };
    fetchNewArrivals();
  }, []);

  return (
    <div className="space-y-10 md:space-y-12"> 
      {/* Hero Section */}
      <section className="relative text-center pt-4 pb-10 md:pt-6 md:pb-16 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/15">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="mb-3 sm:mb-4 flex justify-center"> 
            <Link href="/" aria-label="Shelf Swap Homepage">
                <Image 
                src="/ShelfSwapLogo.png" 
                alt="Shelf Swap Logo" 
                width={286}
                height={80}
                className="h-20 sm:h-24 w-auto" 
                priority 
                />
            </Link>
          </div>
          
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary mb-3 sm:mb-4 leading-tight" 
            dangerouslySetInnerHTML={{ __html: t('homePage.heroTitle') }}
          />
          <p className="text-base sm:text-lg md:text-xl text-foreground/80 mb-4 sm:mb-6 max-w-xl md:max-w-3xl mx-auto leading-relaxed"> 
            {t('homePage.heroSubtitle')}
          </p>
          <form onSubmit={handleHeroSearchSubmit} className="relative max-w-md sm:max-w-xl mx-auto mb-4 sm:mb-6"> 
            <Input
              type="search"
              placeholder={t('homePage.heroSearchPlaceholder')}
              className="h-12 sm:h-14 text-base sm:text-lg pl-12 sm:pl-14 pr-28 sm:pr-32 rounded-full shadow-xl border-2 border-border/40 focus-visible:ring-accent focus-visible:border-accent transition-all bg-background/80 backdrop-blur-sm"
              value={heroSearchTerm}
              onChange={(e) => setHeroSearchTerm(e.target.value)}
              aria-label={t('homePage.heroSearchPlaceholder')}
            />
            <Search className="absolute left-4 sm:left-5 rtl:right-4 sm:rtl:right-5 rtl:left-auto top-1/2 h-5 w-5 sm:h-6 sm:w-6 -translate-y-1/2 text-muted-foreground pointer-events-none" />
             <Button type="submit" className="absolute right-2 rtl:left-2 rtl:right-auto top-1/2 -translate-y-1/2 h-9 sm:h-10 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-4 sm:px-6 text-sm sm:text-md font-semibold shadow-md hover:shadow-lg transition-all">
                {t('homePage.heroSearchButton')}
            </Button>
          </form>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
            <Button size="lg" variant="outline" asChild className="rounded-full px-6 py-2.5 sm:px-8 sm:py-3 text-sm sm:text-base font-semibold border-2 border-primary/50 hover:bg-primary/5 hover:border-primary text-primary shadow-lg hover:shadow-xl transition-all transform hover:scale-105 w-full sm:w-auto bg-background/70 backdrop-blur-sm">
              <Link href="/marketplace">{t('homePage.exploreMarketplaceButton')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section>
        <h2 className="section-title text-center">{t('homePage.howItWorksTitle')}</h2>
        <p className="section-subtitle text-center max-w-2xl mx-auto">{t('homePage.howItWorksSubtitle')}</p>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mt-6"> 
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="items-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <BookHeart className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl text-primary">{t('homePage.howItWorksStep1Title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('homePage.howItWorksStep1Desc')}
            </CardContent>
          </Card>
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="items-center">
              <div className="p-3 bg-accent/10 rounded-full mb-3">
                 <Repeat className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-xl text-accent">{t('homePage.howItWorksStep2Title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
             {t('homePage.howItWorksStep2Desc')}
            </CardContent>
          </Card>
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="items-center">
               <div className="p-3 bg-secondary/20 rounded-full mb-3">
                <Users className="h-8 w-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl" style={{color: 'hsl(var(--secondary-foreground))'}}>{t('homePage.howItWorksStep3Title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {t('homePage.howItWorksStep3Desc')}
            </CardContent>
          </Card>
        </div>
      </section>


      {/* New Arrivals Section */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4">
          <div>
            <h2 className="section-title">{t('homePage.newArrivalsTitle')}</h2>
            <p className="section-subtitle">{t('homePage.newArrivalsSubtitle')}</p>
          </div>
          <Button variant="link" asChild className="text-accent hover:text-accent/80 font-semibold text-xs sm:text-sm self-start sm:self-center mt-1 sm:mt-0">
            <Link href="/marketplace?type=new&sortBy=newest">{t('homePage.newArrivalsViewAll')} <ArrowRight className="ml-1 rtl:mr-1 h-3 w-3 sm:h-4 sm:w-4" /></Link>
          </Button>
        </div>
         <Suspense fallback={<BookCarouselSkeleton />}>
          {loadingNewArrivals ? (
            <BookCarouselSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {newArrivalsBooks.length > 0 ? newArrivalsBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              )) : <p className="col-span-full text-center text-muted-foreground">No new arrivals at the moment. Check back soon!</p>}
            </div>
          )}
        </Suspense>
      </section>

      {/* Trending in Marketplace Section */}
      <section>
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4">
          <div>
            <h2 className="section-title">{t('homePage.trendingMarketplaceTitle')}</h2>
            <p className="section-subtitle">{t('homePage.trendingMarketplaceSubtitle')}</p>
          </div>
          <Button variant="link" asChild className="text-accent hover:text-accent/80 font-semibold text-xs sm:text-sm self-start sm:self-center mt-1 sm:mt-0">
            <Link href="/marketplace?sortBy=relevance">{t('homePage.trendingMarketplaceViewAll')} <ArrowRight className="ml-1 rtl:mr-1 h-3 w-3 sm:h-4 sm:w-4" /></Link>
          </Button>
        </div>
        {loadingTrending ? (
          <BookCarouselSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {trendingBooks.length > 0 ? trendingBooks.map((book) => {
              const key = 'listingId' in book ? book.listingId : book.id;
              return <BookCard key={key} book={book} />;
            }) : <p className="col-span-full text-center text-muted-foreground">No trending books right now. Check back soon!</p>}
          </div>
        )}
      </section>
    </div>
  );
}

