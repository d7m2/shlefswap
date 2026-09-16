
'use client';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
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


// Schemas
const profileInfoSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  bio: z.string().max(300, { message: "Bio can be at most 300 characters."}).optional(),
});
type ProfileInfoValues = z.infer<typeof profileInfoSchema>;


const passwordSchema = z.object({
  currentPassword: z.string().min(6, { message: "Current password is required and must be at least 6 characters." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmNewPassword: z.string().min(6, { message: "Confirm password must be at least 6 characters." }),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});
type PasswordValues = z.infer<typeof passwordSchema>;


export default function ProfileSettingsPage() {
  const { currentUser, updateUserProfile, firebaseUser, loadingAuth, sendPasswordReset, deleteCurrentUserAccount } = useAuth();
  const { toast } = useToast();
  
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // Profile Info Form
  const { 
    register: registerProfile, 
    handleSubmit: handleSubmitProfile, 
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm<ProfileInfoValues>({
    resolver: zodResolver(profileInfoSchema),
    defaultValues: {
      username: currentUser?.username || '',
      bio: currentUser?.bio || '',
    }
  });

  useEffect(() => {
    if (currentUser) {
      resetProfileForm({ username: currentUser.username, bio: currentUser.bio || '' });
    }
  }, [currentUser, resetProfileForm]);


  const onProfileSubmit: SubmitHandler<ProfileInfoValues> = async (data) => {
    if (!currentUser) return;
    setIsProfileSubmitting(true);
    
    try {
      await updateUserProfile(currentUser.id, {
        username: data.username,
        bio: data.bio,
      });
    } catch (error) {
      console.error("Profile update submission error:", error);
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  // Password Change Form
  const { 
    handleSubmit: handleSubmitPassword, 
    reset: resetPasswordForm 
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onPasswordSubmit: SubmitHandler<PasswordValues> = async () => {
    if (!firebaseUser || !firebaseUser.email) {
      toast({ title: "Error", description: "Current user or email not available.", variant: "destructive" });
      return;
    }
    setIsPasswordSubmitting(true);
    try {
      await sendPasswordReset(firebaseUser.email);
      resetPasswordForm();
    } catch (error: any) {
      console.error("Password reset error on settings page:", error);
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!firebaseUser) return;
    setIsPasswordSubmitting(true); 
    try {
      await deleteCurrentUserAccount();
    } catch (error: any)
     {
        console.error("Delete account page error:", error);
    } finally {
        setIsPasswordSubmitting(false);
    }
  };

  if (loadingAuth) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!currentUser || !firebaseUser) {
    return <div className="text-center py-10"><p>Please log in to view settings.</p></div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Account Settings" description="Update your profile information and preferences." />

      <Card className="shadow-lg">
        <form onSubmit={handleSubmitProfile(onProfileSubmit)}>
          <CardHeader>
            <CardTitle className="text-xl text-primary">Profile Information</CardTitle>
            <CardDescription>Manage your public profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" {...registerProfile("username")} />
                {profileErrors.username && <p className="text-sm text-destructive">{profileErrors.username.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address (Cannot be changed)</Label>
                <Input id="email" type="email" defaultValue={currentUser.email} disabled />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" placeholder="Tell us about yourself..." className="min-h-[100px]" {...registerProfile("bio")} />
              {profileErrors.bio && <p className="text-sm text-destructive">{profileErrors.bio.message}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isProfileSubmitting}>
              {isProfileSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Profile Changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-lg">
        <form onSubmit={handleSubmitPassword(onPasswordSubmit)}>
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center"><Lock className="mr-2 h-5 w-5"/>Change Password</CardTitle>
            <CardDescription>For security, we'll send a password reset link to your email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">
              To change your password, click the button below. A password reset link will be sent to <strong>{currentUser.email}</strong>.
            </p>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Password Reset Link
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="shadow-lg border-destructive/50">
        <CardHeader>
          <CardTitle className="text-xl text-destructive">Delete Account</CardTitle>
          <CardDescription>Permanently delete your Shelf Swap account and all associated data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isPasswordSubmitting}>Delete My Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers. You may be prompted to re-authenticate.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90" disabled={isPasswordSubmitting}>
                  {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Yes, Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
