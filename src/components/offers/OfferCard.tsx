'use client';

import type { Offer } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, DollarSign, MessageSquare, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { acceptOfferAction, rejectOfferAction, ManageOfferState } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface OfferCardProps {
  offer: Offer;
  perspective: 'sent' | 'received'; // To tailor display and actions
  onActionComplete?: () => void; // Callback after an action to potentially refresh list
}

export function OfferCard({ offer, perspective, onActionComplete }: OfferCardProps) {
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otherPartyUsername = perspective === 'sent' ? offer.sellerUsername : offer.offeredByUsername;

  const handleAccept = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to accept an offer.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await acceptOfferAction(offer.id, offer.listingId, currentUser.id);
    if (result.success && result.conversationId) {
      onActionComplete?.();
      router.push(`/profile/messages/${result.conversationId}`);
    } else {
      handleActionResult(result, 'Offer accepted');
    }
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to reject an offer.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const result = await rejectOfferAction(offer.id, offer.listingId, currentUser.id);
    handleActionResult(result, 'Offer rejected');
    setIsSubmitting(false);
  };
  
  // Placeholder for cancelling a sent offer
  const handleCancel = async () => {
    setIsSubmitting(true);
    // Simulate cancel action
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Offer Cancelled", description: "Your offer has been cancelled (simulated)." });
    // In a real app: call cancelOfferAction(offer.id)
    onActionComplete?.();
    setIsSubmitting(false);
  };


  const handleActionResult = (result: ManageOfferState, successDefaultMessage: string) => {
    if (result.success) {
      toast({ title: "Success", description: result.message || successDefaultMessage });
      onActionComplete?.();
    } else {
      toast({ title: "Error", description: result.error || "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const formattedOfferedAmount = offer.offeredAmount ? formatPrice(offer.offeredAmount) : null;
  const offerStatusBadgeVariant = 
    offer.status === 'Accepted' ? 'default' :
    offer.status === 'Rejected' || offer.status === 'Cancelled' ? 'destructive' :
    offer.status === 'Pending' ? 'secondary' : 'outline';

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={offer.bookCoverImageUrl || `https://picsum.photos/60/90?random=${offer.listingId}`}
              alt={offer.bookTitle}
              width={60}
              height={90}
              className="rounded-md object-cover aspect-[2/3]"
              data-ai-hint="book cover small"
            />
            <div>
              <CardTitle className="text-lg text-primary line-clamp-2">
                <Link href={`/marketplace/${offer.listingId}`} className="hover:underline">
                  {offer.bookTitle}
                </Link>
              </CardTitle>
              <CardDescription className="text-xs">
                {perspective === 'sent' ? `Offer to ${otherPartyUsername}` : `Offer from ${otherPartyUsername}`}
              </CardDescription>
            </div>
          </div>
          <Badge variant={offerStatusBadgeVariant} className="capitalize text-xs">{offer.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
            {offer.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') ? <DollarSign className="h-4 w-4 text-accent" /> : <ArrowRightLeft className="h-4 w-4 text-accent" />}
            <span>Type: {offer.listingType}</span>
        </div>

        {offer.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && formattedOfferedAmount && (
          <p>
            <span className="font-medium">Offer Amount: </span>
            {formattedOfferedAmount.currency === 'SAR' ? 
              <>{formattedOfferedAmount.valueStr} {formattedOfferedAmount.symbolNode}</> : 
              <>{formattedOfferedAmount.symbolNode}{formattedOfferedAmount.valueStr}</>
            }
          </p>
        )}
        {offer.listingType.split(',').includes('Swap') && (
          <p>
            <span className="font-medium">Swap Proposed: </span>
            {offer.proposedSwapItemTitles?.join(', ') || 'Details in message'}
          </p>
        )}
        {offer.messageToSeller && (
            <div className="flex items-start gap-2 pt-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5"/>
                <p className="text-xs italic bg-muted/50 p-2 rounded-md w-full">"{offer.messageToSeller}"</p>
            </div>
        )}
         <p className="text-xs text-muted-foreground pt-1">
            Date: {new Date(offer.dateOffered).toLocaleDateString()}
            {offer.dateResponded && `, Responded: ${new Date(offer.dateResponded).toLocaleDateString()}`}
        </p>
      </CardContent>
      {offer.status === 'Pending' && currentUser && (
        <CardFooter className="flex justify-end gap-2 pt-3">
          {perspective === 'received' && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10" disabled={isSubmitting}>
                        <ThumbsDown className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Reject Offer?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to reject this offer? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">Reject</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
                        <ThumbsUp className="mr-1.5 h-4 w-4" /> Accept
                    </Button>
                </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Accept Offer?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to accept this offer? This will likely make the listing unavailable to others.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleAccept} className="bg-primary hover:bg-primary/90">Accept</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {perspective === 'sent' && (
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isSubmitting}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Cancel Offer
                    </Button>
                </AlertDialogTrigger>
                 <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Cancel Your Offer?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to cancel this offer? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel>No, Keep Offer</AlertDialogCancel> <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">Yes, Cancel Offer</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          )}
        </CardFooter>
      )}
    </Card>
  );
}