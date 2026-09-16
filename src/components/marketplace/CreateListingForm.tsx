'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { CreateListingFormSchema } from '@/lib/schemas';
import { createListingAction, updateListingAction, type CreateListingFormState, type UpdateListingFormState } from '@/app/actions';
import { lookupBookAction, type LookupBookActionResult } from '@/app/actions/lookupBookAction';
import { generateBookDescriptionAction } from '@/ai/actions/generateBookDescriptionAction';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { useActionState } from '@/hooks/use-action-state';
import { CheckCircle, Info, AlertTriangle, Wand2 } from 'lucide-react';
import type { UsedBookListing } from '@/types';
import {
  applyFormErrors,
  ConditionField,
  DescriptionField,
  FormSubmitButtons,
  IsbnLookupField,
  ListingTypeField,
  PhotoUploadField,
  PreferencesField,
  PriceField,
  TextInputField,
  type CreateListingFormValues,
} from './listingFormFields';

export function CreateListingForm({ initialData = null, isEditMode = false, onUpdated }: { initialData?: UsedBookListing | null; isEditMode?: boolean; onUpdated?: () => void }) {
  const { toast } = useToast();
  const { selectedCurrency, getSymbol } = useCurrency();
  const { currentUser } = useAuth();
  const initialState: CreateListingFormState = { message: '', errors: {}, success: false };
  const [state, formAction] = useActionState(createListingAction, initialState);
  const editInitialState: UpdateListingFormState = { message: '', errors: {}, success: false };
  const [editState, editFormAction] = useActionState(updateListingAction, editInitialState);

  const [selectedListingTypes, setSelectedListingTypes] = useState<string[]>(() => {
    const initialType = initialData?.listingType === 'Sale' ? 'Sell' : (initialData?.listingType || '');
    return initialType ? initialType.split(',').filter(Boolean) : [];
  });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(initialData?.coverImageUrl ? [initialData.coverImageUrl] : []);
  const [isFetchingBookDetails, setIsFetchingBookDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [fetchedCoverImageUrl, setFetchedCoverImageUrl] = useState<string | undefined>(undefined);

  const form = useForm<CreateListingFormValues>({
    resolver: zodResolver(CreateListingFormSchema),
    defaultValues: {
      isbn: initialData?.isbn || '',
      title: initialData?.title || '',
      author: initialData?.author || '',
      pageCount: initialData?.pageCount ? String(initialData.pageCount) : '',
      condition: initialData?.condition || undefined,
      description: initialData?.description || '',
      photos: undefined,
      listingType: initialData?.listingType === 'Sale' ? 'Sell' : (initialData?.listingType || ''),
      price: (initialData?.listingType || '').split(',').some((t) => t === 'Sale' || t === 'Sell') && initialData?.salePrice ? String(initialData.salePrice) : '',
      preferences: initialData?.preferences || initialData?.swapPreferences || '',
      edition: '',
      publisher: initialData?.publisher || '',
      publishedDate: initialData?.publicationDate || '',
    },
  });

  const watchedPhotoFiles = form.watch('photos');

  useEffect(() => {
    let newPreviewUrl: string | undefined = undefined;
    const photoFile = watchedPhotoFiles;

    if (photoFile && photoFile instanceof File) {
      newPreviewUrl = URL.createObjectURL(photoFile);
      setPhotoPreviews([newPreviewUrl]);
    } else {
      setPhotoPreviews(currentPreviews => {
        currentPreviews.forEach(url => URL.revokeObjectURL(url));
        return [];
      });
    }

    return () => {
      if (newPreviewUrl) {
        URL.revokeObjectURL(newPreviewUrl);
      }
    };
  }, [watchedPhotoFiles]);

  useEffect(() => {
    if (state.success) {
      toast({
        title: "Success!",
        description: state.message,
        variant: "default",
        className: "bg-primary text-primary-foreground",
        icon: <CheckCircle className="text-primary-foreground h-5 w-5" />
      });
      form.reset();
      setSelectedListingTypes([]);
      setPhotoPreviews([]);
    } else if (state.message && (state.errors || state.message)) {
      const errors = state.errors || {};
      applyFormErrors(form, errors);
      let toastDescription = state.message;
      if (errors._form && Array.isArray(errors._form) && errors._form.length > 0) {
        toastDescription = `${state.message} ${errors._form.join('; ')}`;
      }
      toast({
        title: "Error Creating Listing",
        description: toastDescription,
        variant: "destructive",
      });
    }
  }, [state, toast, form]);

  useEffect(() => {
    if (!isEditMode) return;
    if (editState.success) {
      toast({
        title: "Updated!",
        description: editState.message,
        variant: "default",
        className: "bg-primary text-primary-foreground",
        icon: <CheckCircle className="text-primary-foreground h-5 w-5" />
      });
      onUpdated?.();
    } else if (editState.message) {
      const errors = editState.errors || {};
      applyFormErrors(form, errors);
      let toastDescription = editState.message;
      if (errors._form && Array.isArray(errors._form) && errors._form.length > 0) {
        toastDescription = `${editState.message} ${errors._form.join('; ')}`;
      }
      toast({
        title: "Error Updating Listing",
        description: toastDescription,
        variant: "destructive",
      });
    }
  }, [editState, isEditMode, toast, form, onUpdated]);

  const handleRemovePhoto = () => {
    form.setValue('photos', undefined, { shouldValidate: true });
    setPhotoPreviews([]);
  };

  const handleRemoveFetchedCoverImage = () => {
    setFetchedCoverImageUrl(undefined);
  };

  const handleFetchBookDetails = async () => {
    const isbnValue = form.getValues('isbn');
    form.resetField('photos');
    setPhotoPreviews([]);
    setFetchedCoverImageUrl(undefined);

    const cleanedIsbn = isbnValue ? isbnValue.replace(/-/g, "").toUpperCase() : "";

    if (!cleanedIsbn || (cleanedIsbn.length !== 10 && cleanedIsbn.length !== 13) || !/^\d{9}[\dX]$|^\d{13}$/.test(cleanedIsbn)) {
      toast({
        title: "Invalid ISBN",
        description: "Please enter a valid 10 or 13 digit ISBN (hyphens are allowed).",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />
      });
      return;
    }

    if (!isbnValue) {
      toast({
        title: "ISBN Error",
        description: "ISBN value is unexpectedly missing after initial checks. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />
      });
      setIsFetchingBookDetails(false);
      return;
    }

    setIsFetchingBookDetails(true);
    try {
      const result: LookupBookActionResult = await lookupBookAction({ isbn: isbnValue });

      if (result.found && result.title && result.author) {
        form.setValue('title', result.title, { shouldValidate: true });
        form.setValue('author', result.author, { shouldValidate: true });

        if (result.pageCount) {
          form.setValue('pageCount', String(result.pageCount), { shouldValidate: true });
        }
        if (result.description) {
          if (!form.getValues('description') || form.getValues('description').length < 20) {
            form.setValue('description', result.description, { shouldValidate: true });
          }
        }
        if (result.publisher) {
          form.setValue('publisher', result.publisher, { shouldValidate: true });
        }
        if (result.publishedDate) {
          form.setValue('publishedDate', result.publishedDate, { shouldValidate: true });
        }
        if (result.coverImageUrl) {
          setFetchedCoverImageUrl(result.coverImageUrl);
        }

        toast({
          title: "Book Details Fetched!",
          description: `Details for "${result.title}" fetched from ${result.source || 'source'}.`,
          icon: <CheckCircle className="h-5 w-5 text-primary" />
        });
      } else {
        let toastTitle = "Book Not Found";
        let toastDescription = result.error || "Could not fetch book details via API. Please enter them manually.";
        let toastVariant: "default" | "destructive" = "default";
        let toastIcon = <Info className="h-5 w-5 text-primary" />;

        if (result.error && result.error.toLowerCase().includes("invalid isbn")) {
          toastTitle = "Invalid ISBN";
          toastVariant = "destructive";
          toastIcon = <AlertTriangle className="h-5 w-5" />;
        } else if (result.error) {
          toastTitle = "Details Fetch Error";
          toastVariant = "destructive";
          toastIcon = <AlertTriangle className="h-5 w-5" />;
        }

        toast({
          title: toastTitle,
          description: toastDescription,
          variant: toastVariant,
          icon: toastIcon,
        });
      }
    } catch (error: any) {
      console.error("Error calling lookupBookAction:", error);
      toast({
        title: "Client Fetch Error",
        description: error.message || "An unexpected client-side error occurred. Please try again.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />
      });
    } finally {
      setIsFetchingBookDetails(false);
    }
  };

  const handleGenerateDescription = async () => {
    const title = form.getValues('title');
    const author = form.getValues('author');

    if (!title || !author) {
      toast({
        title: "Missing Information",
        description: "Please enter the book title and author to generate a description.",
        variant: "destructive",
        icon: <Info className="h-5 w-5" />
      });
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const result = await generateBookDescriptionAction({ title, author });
      if (result.success && result.description) {
        form.setValue('description', result.description, { shouldValidate: true });
        toast({
          title: "Description Generated!",
          description: "The AI-generated description has been added.",
          icon: <Wand2 className="h-5 w-5 text-primary" />
        });
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Could not generate book description.",
          variant: "destructive",
          icon: <AlertTriangle className="h-5 w-5" />
        });
      }
    } catch (error: any) {
      console.error("Error generating description:", error);
      toast({
        title: "Generation Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
        icon: <AlertTriangle className="h-5 w-5" />
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  if (!currentUser) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-xl border-border/80">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-primary">Login Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please log in to create a listing.</p>
          <Button asChild className="mt-4">
            <a href="/login?redirect=/sell">Login</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(data: CreateListingFormValues) {
    console.log("Form submission started", data);

    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create a listing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (!data.title) {
        form.setError('title', { type: 'manual', message: 'Title is required' });
        return;
      }

      if (!data.author) {
        form.setError('author', { type: 'manual', message: 'Author is required' });
        return;
      }

      if (!data.description) {
        form.setError('description', { type: 'manual', message: 'Description is required' });
        return;
      }

      if (!data.listingType) {
        form.setError('listingType', { type: 'manual', message: 'Listing type is required' });
        return;
      }

      if (!data.preferences || data.preferences.trim() === '') {
        form.setError('preferences', { type: 'manual', message: 'Preferences are required' });
        return;
      }

      if (!data.condition) {
        form.setError('condition', { type: 'manual', message: 'Condition is required' });
        return;
      }

      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('author', data.author);
      formData.append('description', data.description);
      formData.append('condition', data.condition);
      formData.append('listingType', data.listingType);
      formData.append('preferences', data.preferences);

      if (isEditMode && initialData) {
        formData.append('listingId', initialData.listingId);
      }

      formData.append('userIdFromClient', currentUser.id);
      formData.append('usernameFromClient', currentUser.username);
      formData.append('profilePictureUrlFromClient', currentUser.profilePictureUrl || '');

      if (data.isbn) {
        formData.append('isbn', data.isbn);
      }

      if (data.listingType.split(',').includes('Sell') && data.price) {
        formData.append('price', data.price);
      }

      if (data.photos) {
        formData.append('photos', data.photos);
      } else if (fetchedCoverImageUrl) {
        formData.append('fetchedCoverImageUrl', fetchedCoverImageUrl);
      }

      if (data.pageCount) {
        formData.append('pageCount', data.pageCount);
      }

      console.log("Submitting form data to server action");
      const result = isEditMode ? await editFormAction(formData) : await formAction(formData);
      console.log("Server action result:", result);
    } catch (error) {
      console.error("Error during form submission:", error);
      toast({
        title: "Error Creating Listing",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto border border-border bg-card">
      <CardHeader className="bg-card border-b border-border/50">
        <CardTitle>{isEditMode ? 'Edit Listing' : 'Create a Book Listing'}</CardTitle>
        <CardDescription>{isEditMode ? 'Update the details for your book listing.' : 'List a book for sale or propose a swap with other users.'}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <IsbnLookupField control={form.control} isFetching={isFetchingBookDetails} onLookup={handleFetchBookDetails} />
            <TextInputField control={form.control} name="title" label="Title (Required)" placeholder="Book title" required />
            <TextInputField control={form.control} name="author" label="Author (Required)" placeholder="Book author" required />
            <TextInputField control={form.control} name="pageCount" label="Number of Pages (Optional)" placeholder="e.g., 320" inputProps={{ type: 'number', min: '1' }} />
            <TextInputField control={form.control} name="edition" label="Edition (Auto-filled)" placeholder="e.g., 15th Edition" />
            <TextInputField control={form.control} name="publisher" label="Publisher (Auto-filled)" placeholder="e.g., Pearson+" />
            <TextInputField control={form.control} name="publishedDate" label="Published Date (Auto-filled)" placeholder="e.g., 2022-08-15" />
            <ConditionField control={form.control} />
            <ListingTypeField control={form.control} onTypesChange={setSelectedListingTypes} />
            <PreferencesField control={form.control} />
            <PriceField control={form.control} visible={selectedListingTypes.includes('Sell')} selectedCurrency={selectedCurrency} symbol={getSymbol()} />
            <DescriptionField control={form.control} isGenerating={isGeneratingDescription} onGenerate={handleGenerateDescription} />
          </div>

          <PhotoUploadField
            control={form.control}
            fetchedCoverImageUrl={fetchedCoverImageUrl}
            photoPreviews={photoPreviews}
            onRemovePhoto={handleRemovePhoto}
            onRemoveFetchedCover={handleRemoveFetchedCoverImage}
            onFileSelected={(file) => { if (file) setFetchedCoverImageUrl(undefined); }}
          />

          <FormSubmitButtons
            disabled={form.formState.isSubmitting || isSubmitting}
            isEditMode={isEditMode}
            onReset={() => form.reset()}
          />
        </form>
      </Form>
    </Card>
  );
}