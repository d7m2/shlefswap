
'use client'; 

import Link from 'next/link';
import Image from 'next/image'; 
import React from 'react'; 
import { Facebook, Instagram, Linkedin, FileText } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

// X logo SVG component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 7.185L18.901 1.153zm-1.161 19.563h1.856L7.098 3.031H5.162l12.579 17.685z" />
  </svg>
);


export function Footer() {
  const t = useTranslation();

  const socialLinks = [
    { href: '#', icon: <Facebook />, label: 'Facebook' },
    { href: '#', icon: <XIcon />, label: 'X' },
    { href: '#', icon: <Instagram />, label: 'Instagram' },
    { href: '#', icon: <Linkedin />, label: 'LinkedIn' },
  ];

  const footerNavLinks = [
    { href: '/terms', labelKey: 'footer.terms', icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <footer className="border-t-2 border-border/80 bg-muted/90 text-muted-foreground print:hidden">
      <div className="container mx-auto px-4 py-4"> {/* Reduced py-6 to py-4 */}
        <div className="flex flex-col items-center gap-y-3 md:flex-row md:justify-between md:gap-x-6 mb-3"> {/* Reduced gap-y-4 to gap-y-3, mb-4 to mb-3 */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary transition-colors hover:text-primary/80">
              <Image
                src="/ShelfSwapLogo.png" 
                alt="Shelf Swap Logo"
                width={100} 
                height={28} 
                className="h-7 w-auto" 
              />
            </Link>
          </div>

          <nav className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 md:gap-x-4"> {/* Reduced gap-y-2 to gap-y-1.5, added items-center */}
            {footerNavLinks.map(link => (
              <Link
                key={link.labelKey}
                href={link.href}
                className="group flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
              >
                {React.cloneElement(link.icon, { className: cn(link.icon.props.className, "transition-colors group-hover:text-primary")})}
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3"> {/* Adjusted spacing */}
            {socialLinks.map(social => (
              <Link
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="group rounded-full p-2 text-muted-foreground/80 transition-all duration-300 ease-in-out hover:bg-accent hover:text-accent-foreground hover:shadow-md transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
              >
                {React.cloneElement(social.icon, { className: "h-5 w-5"})}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-3 border-t-2 border-border/80 pt-3 text-center text-xs"> {/* Reduced mt-5 to mt-3, pt-5 to pt-3. Made border darker */}
          <p className="text-foreground/80">{t('footer.copyright', { year: new Date().getFullYear() })}</p>
          <p className="mt-1 text-xs text-foreground/70">
            {t('footer.craftedWithLove')}
          </p>
        </div>
      </div>
    </footer>
  );
}
