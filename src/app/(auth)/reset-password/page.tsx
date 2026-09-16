
'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import Link from "next/link";
import { KeySquare, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useState, type FormEvent, useEffect, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from '@/lib/firebase/config'; // Import auth directly for confirmPasswordReset
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";


function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);

  const oobCode = searchParams.get('oobCode'); // Firebase uses oobCode for password reset

  useEffect(() => {
    const verifyToken = async () => {
      if (oobCode) {
        try {
          await verifyPasswordResetCode(auth, oobCode);
          setTokenValid(true);
        } catch (error: any) {
          console.error("Token verification error:", error);
          setTokenValid(false);
          toast({
            title: "Invalid or Expired Link",
            description: error.message || "The password reset link is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
        }
      } else {
        setTokenValid(false);
        toast({
          title: "Missing Reset Code",
          description: "No password reset code found. Please use the link from your email.",
          variant: "destructive",
        });
      }
      setIsVerifyingToken(false);
    };

    verifyToken();
  }, [oobCode, toast]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please enter and confirm your new password.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Do Not Match",
        description: "Please ensure both password fields match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!oobCode) {
        toast({ title: "Error", description: "Password reset code is missing.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setResetSuccess(true);
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. You can now log in with your new password.",
        icon: <CheckCircle className="h-5 w-5 text-primary" />,
      });
      setTimeout(() => router.push('/login'), 3000); 
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Password Reset Failed",
        description: error.message || "Could not reset your password. Please try again or request a new link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifyingToken) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
      </div>
    );
  }

  if (!tokenValid && !isVerifyingToken) { // Ensure verification is complete
     return (
      <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
        <PageHeader title="Invalid Link" description="This password reset link is not valid." />
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">
                The link you used is either invalid or has expired. Please request a new password reset link.
                </p>
            </CardContent>
             <CardFooter className="flex flex-col gap-4">
                <Button asChild className="w-full">
                    <Link href="/forgot-password">Request New Link</Link>
                </Button>
            </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (resetSuccess) {
     return (
      <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
        <PageHeader title="Password Updated!" description="You can now log in with your new password." />
        <Card className="w-full max-w-md shadow-xl">
            <CardHeader>
                 <CardTitle className="text-2xl text-primary">Success!</CardTitle>
            </CardHeader>
            <CardContent>
                <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                Your password has been successfully reset. You will be redirected to the login page shortly.
                </p>
            </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12">
      <PageHeader title="Reset Your Password" description="Enter and confirm your new password." />
      <Card className="w-full max-w-md shadow-xl">
        <form onSubmit={handleSubmit}>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl text-primary">Choose a New Password</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <KeySquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <KeySquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="confirm-password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reset Password'}
            </Button>
          </CardContent>
        </form>
        <CardFooter className="text-center">
          <Button variant="link" asChild className="text-sm text-muted-foreground hover:text-primary">
            <Link href="/login">Back to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
