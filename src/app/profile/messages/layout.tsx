import type React from 'react';

// This layout can be used to wrap all /messages routes
// For now, it just passes children through. It could be used for
// specific context providers or structural elements for messaging if needed.
export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 