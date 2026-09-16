import { CreateListingForm } from '@/components/marketplace/CreateListingForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell or Swap Your Book | Shelf Swap',
  description: 'List your used books for sale or swap on the Shelf Swap marketplace.',
};

export default function SellPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="List Your Book"
        description="Ready to find a new home for your pre-loved books? Fill out the form below to get started."
      />
      <CreateListingForm />
    </div>
  );
}
