
'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth(); // Get sendPasswordReset from context
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    try {
      await sendPasswordReset(email);
      // Success toast is handled by sendPasswordReset in AuthContext
      setEmailSent(true);
    } catch (error) {
      // Error toast is handled by sendPasswordReset in AuthContext
      console.error("Forgot password page caught error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-12">
        <PageHeader title="Check Your Email" description="A password reset link has been sent if your email is registered." />
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Email Sent!</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please check your inbox (and spam folder) for a link to reset your password.
              The link will be valid for a limited time.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12">
      <PageHeader title="Forgot Password?" description="Enter your email to receive a password reset link." />
      <Card className="w-full max-w-md shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-primary">Reset Password</CardTitle>
            <CardDescription>
              We'll send a link to your email to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  className="pl-10" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="text-center">
          <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
