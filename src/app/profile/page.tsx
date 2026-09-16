'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Edit3, BookOpen, Heart, Loader2, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  getUserActiveListingsCount,
  getUserWishlistCount
} from '@/lib/firebase/utils';

export default function ProfileDashboardPage() {
  const { currentUser, isLoggedIn } = useAuth();
  const router = useRouter();
  const t = useTranslation();

  const [activeListingsCount, setActiveListingsCount] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    if (!isLoggedIn && !currentUser) {
      router.push('/login');
    }
  }, [isLoggedIn, currentUser, router]);

  useEffect(() => {
    if (currentUser?.id) {
      setLoadingCounts(true);
      const fetchCounts = async () => {
        try {
          const [listings, wishlist] = await Promise.all([
            getUserActiveListingsCount(currentUser.id),
            getUserWishlistCount(currentUser.id)
          ]);
          setActiveListingsCount(listings);
          setWishlistCount(wishlist);
        } catch (error) {
          console.error("Error fetching dashboard counts:", error);
          setActiveListingsCount(0);
          setWishlistCount(0);
        } finally {
          setLoadingCounts(false);
        }
      };
      fetchCounts();
    }
  }, [currentUser?.id]);


  if (!currentUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading profile...</p>
        </div>
    );
  }
  
  const renderCount = (count: number | null) => {
    if (loadingCounts) return <Loader2 className="h-5 w-5 animate-spin" />;
    return count !== null ? count : '-';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Dashboard"
        description={t('pageHeader.welcomeBack', { username: currentUser.username })}
      >
        <Button asChild className="bg-accent hover:bg-accent/80 text-accent-foreground">
          <Link href="/sell">List a New Book</Link>
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary shrink-0">
            <AvatarFallback className="text-2xl">{currentUser.username.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl text-primary">{currentUser.username}</CardTitle>
            <CardDescription className="text-muted-foreground flex items-center gap-1.5 mt-1">
              <Mail className="h-4 w-4"/> {currentUser.email}
            </CardDescription>
          </div>
          <Button variant="outline" asChild className="mt-2 sm:mt-0">
            <Link href="/profile/settings">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card className="bg-secondary/20 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center text-secondary-foreground">
                  <BookOpen className="mr-2 h-5 w-5" /> My Active Listings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold h-8 flex items-center">{renderCount(activeListingsCount)}</p>
                <Link href="/profile/listings" className="text-xs sm:text-sm text-primary hover:underline">View listings</Link>
              </CardContent>
            </Card>
            <Card className="bg-accent/10 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg flex items-center text-accent">
                   <Heart className="mr-2 h-5 w-5" /> Items in Wishlist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold h-8 flex items-center">{renderCount(wishlistCount)}</p>
                 <Link href="/profile/wishlist" className="text-xs sm:text-sm text-accent hover:underline">View wishlist</Link>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

