'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { OfferCard } from '@/components/offers/OfferCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getOffersForUser } from '@/lib/firebase/utils'; // Import the real function
import type { Offer } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Inbox, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function MyOffersPage() {
  const { currentUser, isLoggedIn } = useAuth();
  const [sentOffers, setSentOffers] = useState<Offer[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Added error state
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'sent' || tab === 'received') {
      setActiveTab(tab);
    }
  }, []);

  const fetchOffers = async () => { // Made fetchOffers async
    if (currentUser) {
      setIsLoading(true);
      setError(null); // Reset error state
      try {
        // Replace placeholder with real Firebase call
        const { sent, received } = await getOffersForUser(currentUser.id);
        setSentOffers(sent.sort((a,b) => new Date(b.dateOffered).getTime() - new Date(a.dateOffered).getTime()));
        setReceivedOffers(received.sort((a,b) => new Date(b.dateOffered).getTime() - new Date(a.dateOffered).getTime()));
      } catch (err) {
        console.error("Error fetching offers:", err);
        setError("Failed to load offers. Please try again."); // Set error message
        setSentOffers([]); // Clear offers on error
        setReceivedOffers([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSentOffers([]);
      setReceivedOffers([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [currentUser]);


  if (!isLoggedIn && !isLoading) {
    return (
        <div className="text-center py-12">
            <PageHeader title="My Offers" description="Log in to view and manage your offers." />
            <Alert variant="default" className="max-w-md mx-auto">
                <AlertTitle>Please Log In</AlertTitle>
                <AlertDescription>You need to be logged in to access your offers.</AlertDescription>
                 <Button asChild className="mt-4"><Link href="/login?redirect=/profile/offers">Login</Link></Button>
            </Alert>
        </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Offers" description="Loading your offers..." />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Add error display
  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader title="My Offers" description="Manage offers you've made and received for book listings." />
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Offers" description="Manage offers you've made and received for book listings." />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'received' | 'sent')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received"><Inbox className="mr-2 h-4 w-4" />Received Offers ({receivedOffers.length})</TabsTrigger>
          <TabsTrigger value="sent"><Send className="mr-2 h-4 w-4" />Sent Offers ({sentOffers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {receivedOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {receivedOffers.map(offer => (
                <OfferCard key={offer.id} offer={offer} perspective="received" onActionComplete={fetchOffers} />
              ))}
            </div>
          ) : (
            <Alert className="text-center py-8">
              <Inbox className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <AlertTitle className="text-xl">No Received Offers Yet</AlertTitle>
              <AlertDescription>You haven't received any offers on your listings.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {sentOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sentOffers.map(offer => (
                <OfferCard key={offer.id} offer={offer} perspective="sent" onActionComplete={fetchOffers} />
              ))}
            </div>
          ) : (
            <Alert className="text-center py-8">
              <Send className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <AlertTitle className="text-xl">No Sent Offers Yet</AlertTitle>
              <AlertDescription>You haven't made any offers on books yet.
                <Button variant="link" asChild className="text-accent p-0 h-auto ml-1"><Link href="/marketplace">Explore the marketplace!</Link></Button>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}