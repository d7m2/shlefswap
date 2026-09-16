import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Terms of Service"
        description="Please read these terms carefully before using Shelf Swap."
      />

      <Card className="shadow-lg">
        <CardContent className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none p-6 md:p-8 text-foreground leading-relaxed">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Shelf Swap (the "Service"), operated by Shelf Swap Inc. ("us", "we", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
          </p>

          <h2>2. Accounts</h2>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
          </p>

          <h2>3. User Conduct</h2>
          <p>
            You agree not to use the Service to:
          </p>
          <ul>
            <li>Post any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically, or otherwise objectionable.</li>
            <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
            <li>Violate any applicable local, state, national, or international law.</li>
          </ul>
          <p> 
            We reserve the right to terminate your access to the Service for violating any of the prohibited uses.
          </p>
          
          <h2>4. Book Listings and Transactions</h2>
          <p>
            Users are solely responsible for the accuracy of their book listings, including condition, edition, and pricing. Shelf Swap is a platform provider and is not directly involved in transactions between users. We do not guarantee the quality, safety, or legality of items listed, the truth or accuracy of listings, or the ability of sellers to sell items or buyers to pay for items.
          </p>

          <h2>5. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Shelf Swap Inc. and its licensors.
          </p>
          
          <h2>6. Termination</h2>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall Shelf Swap Inc., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please reach out to the Shelf Swap team through your community channels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

