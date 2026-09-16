'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useActionState, useState, useEffect, useRef, useTransition, useMemo } from 'react'; // Added useMemo
import type { z } from 'zod';
import { MakeOfferFormSchema } from '@/lib/schemas';
import { makeOfferAction, type MakeOfferFormState } from '@/app/actions';
import type { UsedBookListing } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, AlertTriangle, LibrarySquare, ImageOff } from 'lucide-react'; // Added AlertTriangle, LibrarySquare, ImageOff
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getUserAvailableSwapListings } from '@/lib/firebase/utils'; // Import the new function
import { ScrollArea } from "@/components/ui/scroll-area"; // For scrollable list
import { Checkbox } from "@/components/ui/checkbox"; // For item selection
import Image from "next/image"; // For displaying book covers
import React from 'react'; // Import React for React.memo

interface MakeOfferDialogProps {
  listing: UsedBookListing;
  children: React.ReactNode; // Trigger element
}

type FormValues = z.infer<typeof MakeOfferFormSchema>;

export const MakeOfferDialog = React.memo(function MakeOfferDialog({ listing, children }: MakeOfferDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { formatPrice, selectedCurrency, getSymbol } = useCurrency();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null); // Create a ref for the form
  const [, startTransition] = useTransition(); // For wrapping server action call

  const [userSwapListings, setUserSwapListings] = useState<UsedBookListing[]>([]);
  const [selectedSwapItems, setSelectedSwapItems] = useState<string[]>([]); // Store IDs of selected items

  const initialState: MakeOfferFormState = { message: '', errors: {}, success: false };
  // The `state` from useActionState is the result of the server action
  // `formAction` is the function to call to trigger the server action
  const [serverState, serverFormAction, isServerActionPending] = useActionState(makeOfferAction, initialState);

  // Memoize defaultValues for useForm
  const defaultFormValues = useMemo(() => ({
    listingId: listing.listingId,
    listingTitle: listing.title,
    bookCoverImageUrl: listing.coverImageUrl,
    listingType: listing.listingType,
    offeredAmount: listing.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && listing.salePrice !== undefined ? listing.salePrice : undefined,
    messageToSeller: '',
    proposedSwapItemIds: [],
    proposedSwapItemTitles: [],
    // Ensure all fields from MakeOfferFormSchema that are part of defaultValues are here
    // If offeredByUserId, etc., were meant to be defaults, they should be included and currentUser.id etc. added to deps
    // For now, assuming they are added dynamically as per existing code in onValidSubmit
    // ---- NEW: Add required fields for RHF validation ----
    offeredByUserId: currentUser?.id || '', // Fallback to empty string if currentUser is somehow null initially
    offeredByUsername: currentUser?.username || '',
    sellerUserId: listing.seller.id,
    sellerUsername: listing.seller.username,
  }), [
    listing.listingId, listing.title, listing.coverImageUrl, listing.listingType, listing.salePrice,
    listing.seller.id, listing.seller.username, // Added seller details
    currentUser?.id, currentUser?.username     // Added currentUser details
  ]);

  const form = useForm<FormValues>({
    resolver: zodResolver(MakeOfferFormSchema),
    defaultValues: defaultFormValues, // Use memoized defaultValues
  });
  
  // Store the listingId for which the form was last reset
  const lastResetListingIdRef = useRef<string | null>(null);
  
  // Effect for Form Reset 
  useEffect(() => {
    if (open) {
      // Only reset the form if the dialog is just opening for this listing,
      // or if the listingId itself has changed (less likely for an open dialog).
      if (lastResetListingIdRef.current !== listing.listingId) {
        console.log(`[MakeOfferDialog] Form reset effect triggered. Open: ${open}, New Listing ID: ${listing.listingId}`);
        form.reset({
          listingId: listing.listingId, 
          listingTitle: listing.title, 
          bookCoverImageUrl: listing.coverImageUrl, 
          listingType: listing.listingType, 
          offeredAmount: listing.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && listing.salePrice !== undefined ? listing.salePrice : undefined,
          messageToSeller: '',
          proposedSwapItemIds: [], 
          proposedSwapItemTitles: [],
          // ---- NEW: Reset new fields ----
          offeredByUserId: currentUser?.id || '',
          offeredByUsername: currentUser?.username || '',
          sellerUserId: listing.seller.id,
          sellerUsername: listing.seller.username,
        });
        setSelectedSwapItems([]); // Reset selection
        lastResetListingIdRef.current = listing.listingId;
      }
    } else {
      // Dialog is closed, reset the tracking ref
      lastResetListingIdRef.current = null;
    }
  }, [
    open, 
    listing.listingId, listing.title, listing.coverImageUrl, listing.listingType, listing.salePrice, 
    listing.seller.id, listing.seller.username, // Added seller details
    currentUser?.id, currentUser?.username,     // Added currentUser details
    form.reset
  ]);

  // Effect for Fetching User Swap Listings (when dialog opens for a swap, or user changes)
  useEffect(() => {
    if (currentUser && open && listing.listingType.split(',').includes('Swap')) {
      console.log('[MakeOfferDialog] Fetching user swap listings. UserID:', currentUser.id);
      getUserAvailableSwapListings(currentUser.id).then(fetchedListings => {
        setUserSwapListings(fetchedListings);
        console.log('[MakeOfferDialog] Fetched user available swap listings:', fetchedListings);
      }).catch(error => {
        console.error('[MakeOfferDialog] Error fetching swap listings:', error);
        setUserSwapListings([]); // Set to empty on error
        toast({ title: "Error", description: "Could not fetch your items for swap.", variant: "destructive" });
      });
    } else if (open) { 
      console.log('[MakeOfferDialog] Clearing swap listings (not a swap or no user).');
      setUserSwapListings([]); 
    }
  }, [open, listing.listingType, currentUser?.id]); // Restored setUserSwapListings and toast

  useEffect(() => {
    if (serverState.success && serverState.offerId) {
      toast({ title: 'Offer Sent!', description: serverState.message });
      form.reset(); 
      setOpen(false); 
    } else if (!serverState.success && serverState.message) {
      let description = serverState.message;
      if (serverState.errors && Object.keys(serverState.errors).length > 0) {
        const fieldErrorMessages = Object.values(serverState.errors).flat().join(' ');
        if (fieldErrorMessages) description = fieldErrorMessages;
      }
      toast({ 
        title: serverState.errors?._form?.[0] || 'Offer Failed', 
        description: description, 
        variant: 'destructive',
        icon: <AlertTriangle className="h-5 w-5"/>
      });
      if (serverState.errors) {
        Object.entries(serverState.errors).forEach(([key, messages]) => {
          if (messages && messages.length > 0 && key !== '_form') {
            form.setError(key as keyof FormValues, { type: 'manual', message: messages[0] });
          }
        });
      }
    }
    console.log('[MakeOfferDialog] Server Action State:', serverState);
  }, [serverState, toast]);

  if (!currentUser) {
    return <DialogTrigger asChild onClick={() => toast({ title: "Login Required", description: "Please log in to make an offer.", variant:"destructive", icon: <AlertTriangle className="h-5 w-5"/>})}>{children}</DialogTrigger>;
  }

  // This is the function RHF will call after its internal validation
  const onValidSubmit = (values: FormValues) => {
    console.log('[MakeOfferDialog] onValidSubmit called. RHF Errors:', form.formState.errors);
    console.log('[MakeOfferDialog] Validated form values:', values);

    if (!currentUser) {
        toast({ title: "Error", description: "User not found. Please log in again.", variant: "destructive" });
        return;
    }

    const formData = new FormData();
    // Populate formData from RHF's validated `values`
    formData.append('listingId', values.listingId);
    formData.append('listingTitle', values.listingTitle || listing.title); // Fallback for safety
    formData.append('bookCoverImageUrl', values.bookCoverImageUrl || listing.coverImageUrl); // Fallback
    formData.append('listingType', values.listingType);
    if (values.offeredAmount !== undefined) {
      formData.append('offeredAmount', String(values.offeredAmount));
    }
    if (values.messageToSeller) {
      formData.append('messageToSeller', values.messageToSeller);
    }
    
    // Add fields that are not part of the form but required by the action
    formData.append('offeredByUserId', values.offeredByUserId); // Use values from RHF
    formData.append('offeredByUsername', values.offeredByUsername); // Use values from RHF
    formData.append('offeredByUserProfilePictureUrl', currentUser.profilePictureUrl || ''); // This is not in schema, append directly
    formData.append('sellerUserId', values.sellerUserId); // Use values from RHF
    formData.append('sellerUsername', values.sellerUsername); // Use values from RHF

    // Add proposed swap items if it's a swap offer
    if (values.listingType.split(',').includes('Swap')) {
      // proposedSwapItemIds and proposedSwapItemTitles should come directly from RHF `values`
      // as they are now part of the form state, updated by form.setValue
      if (values.proposedSwapItemIds && values.proposedSwapItemIds.length > 0) {
        formData.append('proposedSwapItemIds', JSON.stringify(values.proposedSwapItemIds));
        // Titles are also set via form.setValue, so use them directly from RHF values
        formData.append('proposedSwapItemTitles', JSON.stringify(values.proposedSwapItemTitles || [])); 
      } else {
        // This case should be caught by RHF validation. Sending empty arrays if not caught.
        formData.append('proposedSwapItemIds', JSON.stringify([]));
        formData.append('proposedSwapItemTitles', JSON.stringify([]));
      }
    }
    console.log('[MakeOfferDialog] FormData prepared:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    startTransition(() => {
      console.log('[MakeOfferDialog] Calling serverFormAction...');
      serverFormAction(formData);
    });
  };

  // Log RHF errors on every render for debugging
  console.log('[MakeOfferDialog] RHF errors on render:', JSON.stringify(form.formState.errors));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Make an Offer for "{listing.title}"</DialogTitle>
          <DialogDescription>
            {listing.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell')
              ? `Listed by ${listing.seller.username}. Original price: ${listing.salePrice !== undefined ? getSymbol(selectedCurrency) : ''}${listing.salePrice !== undefined ? formatPrice(listing.salePrice).valueStr : 'N/A'}`
              : `Propose a swap for this book listed by ${listing.seller.username}.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          {/* Use RHF's handleSubmit to trigger validation and then onValidSubmit */}
          <form ref={formRef} onSubmit={form.handleSubmit(onValidSubmit)} className="space-y-5">
            {/* Hidden fields are now explicitly added in onValidSubmit or part of RHF schema */}

            {listing.listingType.split(',').some((t) => t === 'Sale' || t === 'Sell') && (
              <FormField
                control={form.control}
                name="offeredAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Offer Amount ({getSymbol(selectedCurrency)})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder={`e.g., ${formatPrice(listing.salePrice || 10).valueStr}`} 
                        {...field}
                        value={field.value ?? ''} 
                        onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="messageToSeller"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message to User (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Include any details or questions about your offer..." rows={4} {...field} value={field.value ?? ''}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {listing.listingType.split(',').includes('Swap') && (
              <div className="space-y-3 pt-2">
                <div>
                  <FormLabel>Your Items to Offer for Swap (Optional)</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Select books from your collection to propose in this swap, or leave empty.</p>
                </div>
                {userSwapListings.length === 0 && !isServerActionPending && (
                  <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md text-center border">
                    <LibrarySquare className="inline-block h-5 w-5 mr-1.5 mb-0.5" />
                    You have no available items listed for swap, or they are still loading.
                  </div>
                )}
                {isServerActionPending && userSwapListings.length === 0 &&  <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin text-primary" />}
                {userSwapListings.length > 0 && (
                  <ScrollArea className="h-[200px] w-full rounded-md border p-3 bg-background">
                    <div className="space-y-2">
                    <FormField
                        control={form.control} // RHF control
                        name="proposedSwapItemIds" // Field RHF is validating
                        render={() => ( // We don't use field render directly, but connect it to RHF
                          <>
                            {userSwapListings.map((item) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors ${selectedSwapItems.includes(item.id) ? 'bg-primary/10 ring-1 ring-primary' : 'border border-transparent'} mb-2`}
                              >
                                <Checkbox
                                  id={`swap-${item.id}`}
                                  checked={selectedSwapItems.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    const newSelectedIds = checked
                                      ? [...selectedSwapItems, item.id]
                                      : selectedSwapItems.filter(id => id !== item.id);
                                    setSelectedSwapItems(newSelectedIds);
                                    form.setValue('proposedSwapItemIds', newSelectedIds, { shouldValidate: true });
                                    const newSelectedTitles = newSelectedIds.map(id => userSwapListings.find(l => l.id === id)?.title || 'Unknown Title');
                                    form.setValue('proposedSwapItemTitles', newSelectedTitles, { shouldValidate: true });
                                  }}
                                  className="flex-shrink-0"
                                />
                                <div className="relative h-16 w-12 flex-shrink-0 bg-secondary rounded overflow-hidden aspect-[2/3]">
                                  {item.coverImageUrl && !item.coverImageUrl.includes('picsum.photos') ? (
                                      <Image src={item.coverImageUrl} alt={item.title} layout="fill" objectFit="cover" />
                                  ) : (
                                      <div className="h-full w-full flex items-center justify-center bg-muted">
                                          <ImageOff className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                  )}
                                </div>
                                <div className="flex-grow min-w-0"> {/* Added min-w-0 for flex child truncation */}
                                  <label htmlFor={`swap-${item.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 block truncate" title={item.title}>
                                    {item.title}
                                  </label>
                                  <p className="text-xs text-muted-foreground truncate">{item.author}</p>
                                  <p className="text-xs text-muted-foreground/80">Cond: {item.condition}</p>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      />
                    {/* This FormMessage will be displayed by RHF if proposedSwapItemIds has an error */}
                    <FormMessage /> 
                    </div>
                  </ScrollArea>
                )}
                 {/* Explicitly display validation error for proposedSwapItemIds if any (RHF might also do this via FormMessage) */}
                 {form.formState.errors.proposedSwapItemIds && (
                  <p className="text-sm font-medium text-destructive pt-1">{form.formState.errors.proposedSwapItemIds.message}</p>
                )}
              </div>
            )}

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              {/* RHF's formState.isSubmitting can be used along with serverActionPending */}
              <Button type="submit" disabled={form.formState.isSubmitting || isServerActionPending} className="bg-accent hover:bg-accent/90">
                { (form.formState.isSubmitting || isServerActionPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Offer
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

// Optional: If you want a display name for the memoized component in React DevTools
(MakeOfferDialog as React.MemoExoticComponent<any>).displayName = 'MakeOfferDialog';

