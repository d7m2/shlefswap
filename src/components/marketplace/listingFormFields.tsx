'use client';

import { z } from 'zod';
import { type InputHTMLAttributes, type ReactNode } from 'react';
import {
  useWatch,
  type Control,
  type UseFormReturn,
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CreateListingFormSchema } from '@/lib/schemas';
import { Loader2, RefreshCcw, UploadCloud, Wand2, X } from 'lucide-react';
import Image from 'next/image';

export type CreateListingFormValues = z.infer<typeof CreateListingFormSchema>;

export function applyFormErrors(
  form: UseFormReturn<CreateListingFormValues>,
  errors: Record<string, string[] | undefined> | null
) {
  if (!errors) return;
  Object.entries(errors).forEach(([key, fieldMessages]) => {
    if (key !== '_form' && Array.isArray(fieldMessages) && fieldMessages.length > 0) {
      form.setError(key as keyof CreateListingFormValues, {
        type: 'manual',
        message: fieldMessages[0],
      });
    }
  });
}

type TextFieldName = 'title' | 'author' | 'pageCount' | 'edition' | 'publisher' | 'publishedDate';

export function TextInputField({
  control,
  name,
  label,
  placeholder,
  required = false,
  className,
  inputProps,
}: {
  control: Control<CreateListingFormValues>;
  name: TextFieldName;
  label: string;
  placeholder: string;
  required?: boolean;
  className?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} {...inputProps} placeholder={placeholder} required={required} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function IsbnLookupField({
  control,
  isFetching,
  onLookup,
}: {
  control: Control<CreateListingFormValues>;
  isFetching: boolean;
  onLookup: () => void;
}) {
  const isbn = useWatch({ control, name: 'isbn' });

  return (
    <div className="md:col-span-2">
      <div className="flex items-end gap-2">
        <FormField
          control={control}
          name="isbn"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormLabel>ISBN (Optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Enter ISBN to auto-fill details"
                  maxLength={17}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>Enter ISBN to look up book details automatically.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 mb-[21px]"
          onClick={onLookup}
          disabled={!isbn || isFetching}
        >
          {isFetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            </>
          ) : (
            <>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Lookup
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function ConditionField({
  control,
}: {
  control: Control<CreateListingFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="condition"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Condition (Required)</FormLabel>
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            required
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Like New">Like New</SelectItem>
              <SelectItem value="Very Good">Very Good</SelectItem>
              <SelectItem value="Good">Good</SelectItem>
              <SelectItem value="Fair">Fair</SelectItem>
              <SelectItem value="Poor">Poor</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ListingTypeField({
  control,
  onTypesChange,
}: {
  control: Control<CreateListingFormValues>;
  onTypesChange: (types: string[]) => void;
}) {
  return (
    <FormField
      control={control}
      name="listingType"
      render={({ field }) => {
        const selected = (field.value || '').split(',').filter(Boolean);
        const toggle = (type: string, checked: boolean) => {
          const next = checked ? Array.from(new Set([...selected, type])) : selected.filter(t => t !== type);
          field.onChange(next.join(','));
          onTypesChange(next);
        };
        return (
          <FormItem>
            <FormLabel>Listing Type (Required)</FormLabel>
            <FormDescription>Select one or more ways someone can get this book.</FormDescription>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {(['Sell', 'Swap', 'Free'] as const).map((type) => {
                const isChecked = selected.includes(type);
                return (
                  <label
                    key={type}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-3 cursor-pointer transition-colors",
                      isChecked
                        ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                        : "border-border hover:bg-muted/50"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => toggle(type, checked === true)}
                    />
                    <span className="text-sm font-medium text-foreground">{type}</span>
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function PreferencesField({
  control,
}: {
  control: Control<CreateListingFormValues>;
}) {
  return (
    <FormField
      control={control}
      name="preferences"
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Preferences (Required)</FormLabel>
          <FormControl>
            <Textarea {...field} placeholder="What do you want? For example your asking price if selling, the kinds of books you&apos;d accept for a swap, or conditions for giving it away free." rows={3} />
          </FormControl>
          <FormDescription>
            Tell buyers and swap partners what you&apos;d like in return.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PriceField({
  control,
  visible,
  selectedCurrency,
  symbol,
}: {
  control: Control<CreateListingFormValues>;
  visible: boolean;
  selectedCurrency: string;
  symbol: ReactNode;
}) {
  if (!visible) return null;
  return (
    <FormField
      control={control}
      name="price"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Asking Price in {selectedCurrency} (Optional)</FormLabel>
          <FormControl>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
                {symbol}
              </span>
              <Input
                {...field}
                type="number"
                step="0.01"
                min="0.01"
                placeholder={`Enter price in ${selectedCurrency} or leave empty`}
                className="pl-8"
              />
            </div>
          </FormControl>
          <FormDescription>
            Optional. Float a price, or leave open and let buyers make offers.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DescriptionField({
  control,
  isGenerating,
  onGenerate,
}: {
  control: Control<CreateListingFormValues>;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const title = useWatch({ control, name: 'title' });
  const author = useWatch({ control, name: 'author' });

  return (
    <FormField
      control={control}
      name="description"
      render={({ field }) => (
        <FormItem className="md:col-span-2">
          <FormLabel>Description (Required)</FormLabel>
          <FormControl>
            <Textarea placeholder="Describe the book's plot, themes, and any notable features..." {...field} rows={6} />
          </FormControl>
          <div className="flex justify-end mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onGenerate}
              disabled={isGenerating || !title || !author}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate with AI
            </Button>
          </div>
          <FormDescription>
            Provide a compelling summary of the book. Include details about its physical state if relevant.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PhotoUploadField({
  control,
  fetchedCoverImageUrl,
  photoPreviews,
  onRemovePhoto,
  onRemoveFetchedCover,
  onFileSelected,
}: {
  control: Control<CreateListingFormValues>;
  fetchedCoverImageUrl?: string;
  photoPreviews: string[];
  onRemovePhoto: () => void;
  onRemoveFetchedCover: () => void;
  onFileSelected: (file: File) => void;
}) {
  return (
    <>
      <FormField
        control={control}
        name="photos"
        render={({ field: { onChange, value, ...rest } }) => (
          <FormItem>
            <FormLabel className="font-semibold">Book Photo</FormLabel>
            <FormDescription className="mb-2">Upload one clear image of the book (JPG, PNG, WebP, max 5MB) or use the auto-fetched image below if available.</FormDescription>
            <FormControl>
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-border border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted/50 transition-colors duration-150 ease-in-out"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">SVG, PNG, JPG, GIF or WebP (MAX. 5MB)</p>
                </div>
                <Input
                  id="photo-upload"
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/svg+xml,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onChange(file || undefined);
                    if (file) onFileSelected(file);
                  }}
                  {...rest}
                />
              </label>
            </FormControl>
            {value?.name && (
              <p className="mt-2 text-sm text-muted-foreground font-medium">Selected file for upload: {value.name}</p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {fetchedCoverImageUrl && photoPreviews.length === 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Fetched Cover Image Preview:</h4>
          <div className="relative w-40 h-52 group mx-auto border border-border rounded-md shadow-md">
            <Image
              src={fetchedCoverImageUrl}
              alt={`Fetched book cover`}
              layout="fill"
              objectFit="contain"
              className="rounded-md"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive z-10"
              onClick={onRemoveFetchedCover}
              title="Remove fetched image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            To use your own image, click the upload area above.
          </p>
        </div>
      )}

      {photoPreviews.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Uploaded Photo Preview:</h4>
          <div className="flex flex-wrap gap-2">
            {photoPreviews.map((previewUrl) => (
              <div key={previewUrl} className="relative w-32 h-40 group">
                <Image
                  src={previewUrl}
                  alt={`Book photo preview`}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-md border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function FormSubmitButtons({
  disabled,
  isEditMode,
  onReset,
}: {
  disabled: boolean;
  isEditMode: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center justify-end space-x-4">
      <Button variant="outline" onClick={onReset} type="button">Reset Form</Button>
      <Button
        type="submit"
        disabled={disabled}
        className={disabled ? "bg-primary/80" : ""}
      >
        {disabled ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isEditMode ? "Saving Changes..." : "Creating Listing..."}
          </>
        ) : (
          <>{isEditMode ? "Save Changes" : "Create Listing"}</>
        )}
      </Button>
    </div>
  );
}