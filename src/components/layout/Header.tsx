'use client'; 

import Link from 'next/link';
import Image from 'next/image'; 
import { Home, Menu, Search, Store, UserPlus, Settings, Heart, LogOut, LayoutDashboard, Bell, MessageSquare, Tag, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { CurrencyToggleButton } from '@/components/shared/CurrencyToggleButton';
import { NotificationIcon } from '@/components/notifications/NotificationIcon';
import { useTranslation } from '@/contexts/LanguageContext'; 

export function Header() {
  const t = useTranslation(); 

  const navItems = [
    { href: '/', labelKey: 'header.home', icon: <Home className="h-4 w-4" /> },
    { href: '/marketplace', labelKey: 'header.marketplace', icon: <Store className="h-4 w-4" /> },
    { href: '/sell', labelKey: 'header.sellSwap', icon: <Tag className="h-4 w-4" /> },
  ];

  const { isLoggedIn, currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);


  const handleLogout = () => {
    logout();
    router.push('/'); 
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm(''); 
      if (mobileMenuOpen) setMobileMenuOpen(false);
    }
  };

  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm print:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary transition-all duration-200 ease-in-out hover:text-primary/90 hover:scale-105 group">
            <div className="h-9 w-auto bg-muted rounded animate-pulse">
               <Image src="/ShelfSwapLogo.png" alt="Shelf Swap Logo" width={150} height={40} className="opacity-0" priority />
            </div>
          </div>
          <div className="flex items-center gap-2"> 
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" /> 
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" /> 
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse md:hidden" /> 
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm print:hidden">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-primary transition-transform duration-200 ease-in-out hover:scale-105 group shrink-0"
        >
          <Image
            src="/ShelfSwapLogo.png" 
            alt="Shelf Swap Logo"
            width={135}
            height={36}
            className="h-9 w-auto object-contain" 
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => (
            <Button 
              key={item.labelKey} 
              variant="ghost" 
              asChild 
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors duration-150 flex items-center gap-1.5",
                pathname === item.href 
                  ? "text-primary bg-primary/10 hover:bg-primary/15 font-semibold" 
                  : "text-foreground/70 hover:text-primary hover:bg-muted/50"
              )}
            >
              <Link href={item.href}>
                {React.cloneElement(item.icon, { className: cn(item.icon.props.className, "h-4 w-4")})}
                {t(item.labelKey)} 
              </Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Input 
              type="search" 
              placeholder={t('header.searchPlaceholder')} 
              className="pl-8 pr-2 h-9 w-full md:w-[160px] lg:w-[200px] rounded-full focus-visible:ring-1 focus-visible:ring-accent border-border/60 focus:border-accent text-sm transition-all duration-150" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('header.searchPlaceholder')}
            />
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </form>
          
          <div className="flex items-center gap-0 sm:gap-0.5"> 
            <CurrencyToggleButton />
          </div>


          {isLoggedIn && <NotificationIcon /> }


          {isLoggedIn && currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-transparent">
                  <Avatar className="h-9 w-9 border border-primary/30 hover:ring-2 hover:ring-primary/50 transition-all duration-150">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">{currentUser.username.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 shadow-xl border border-border/50 mt-1">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.username}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><LayoutDashboard className="mr-2 h-4 w-4" />{t('header.profile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                 <Link href="/profile/listings"><Store className="mr-2 h-4 w-4" />{t('header.myListings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/offers"><Tag className="mr-2 h-4 w-4" />{t('header.myOffers')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/wishlist"><Heart className="mr-2 h-4 w-4" />{t('header.wishlist')}</Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/messages"><MessageSquare className="mr-2 h-4 w-4" />{t('header.messages')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings"><Settings className="mr-2 h-4 w-4" />{t('header.settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />{t('header.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-0.5">
              <Button variant="ghost" asChild className="hover:text-primary text-sm px-2.5 font-medium">
                <Link href="/login">{t('header.login')}</Link>
              </Button>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full text-sm px-3 py-1.5 h-auto font-semibold">
                <Link href="/register">{t('header.signUp')}</Link>
              </Button>
            </div>
          )}
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden rounded-full hover:bg-muted/50 w-9 h-9">
                <Menu className="h-5 w-5 text-foreground/80" />
                <span className="sr-only">{t('header.toggleNav')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 bg-sidebar shadow-xl">
              <SheetHeader className="p-4 border-b border-sidebar-border">
                 <SheetTitle className="text-lg font-semibold text-sidebar-primary flex items-center gap-2">
                  <Image
                    src="/ShelfSwapLogo.png" 
                    alt="Shelf Swap Logo"
                    width={120} 
                    height={32}
                    className="h-8 w-auto object-contain"
                  />
                </SheetTitle>
              </SheetHeader>
              <nav className="grid gap-2 text-base font-medium mt-2 p-4">
                <form onSubmit={handleSearchSubmit} className="relative md:hidden mb-2">
                    <Input 
                        type="search" 
                        placeholder={t('header.searchPlaceholder')}
                        className="pl-10 pr-4 h-10 w-full rounded-full border-border/70 focus:border-accent focus-visible:ring-accent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label={t('header.searchPlaceholder')}
                    />
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                </form>


                {navItems.map((item) => (
                  <SheetClose asChild key={item.labelKey}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors duration-150",
                        pathname === item.href 
                          ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" 
                          : "text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/10"
                      )}
                    >
                      {React.cloneElement(item.icon, { className: cn(item.icon.props.className, "h-5 w-5") })}
                      {t(item.labelKey)}
                    </Link>
                  </SheetClose>
                ))}
                <DropdownMenuSeparator className="my-2 bg-sidebar-border" />
                {isLoggedIn && currentUser ? (
                  <>
                    <SheetClose asChild>
                     <Link href="/profile" className={cn("flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors duration-150", pathname.startsWith('/profile') ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/10")}>
                      <LayoutDashboard className="h-5 w-5" />
                      {t('header.profile')}
                    </Link>
                    </SheetClose>
                     <SheetClose asChild>
                        <Link href="/notifications" className={cn("flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors duration-150", pathname === '/notifications' ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/10")}>
                            <Bell className="h-5 w-5" />
                            {t('header.notifications')}
                        </Link>
                    </SheetClose>
                    <SheetClose asChild>
                    <div onClick={handleLogout} className="flex items-center gap-4 px-3 py-2.5 text-destructive hover:bg-destructive/10 cursor-pointer rounded-md transition-colors duration-150">
                      <LogOut className="h-5 w-5" />
                      {t('header.logout')}
                    </div>
                    </SheetClose>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                    <Link href="/login" className={cn("flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors duration-150", pathname === '/login' ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/10")}>
                      <LogIn className="h-5 w-5" />
                      {t('header.login')}
                    </Link>
                    </SheetClose>
                    <SheetClose asChild>
                    <Link href="/register" className={cn("flex items-center gap-4 px-3 py-2.5 rounded-md transition-colors duration-150", pathname === '/register' ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold" : "text-sidebar-foreground/80 hover:text-sidebar-primary hover:bg-sidebar-accent/10")}>
                      <UserPlus className="h-5 w-5" />
                      {t('header.signUp')}
                    </Link>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
