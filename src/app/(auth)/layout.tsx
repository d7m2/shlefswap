import type React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-grow flex flex-col">
      {/* 
        This layout allows auth pages (login, register, forgot-password, reset-password)
        to control their own full-width centering and styling without being constrained 
        by the main application container.
        The `flex flex-col` ensures that children can use flex properties if needed for centering.
      */}
      {children}
    </main>
  );
}
