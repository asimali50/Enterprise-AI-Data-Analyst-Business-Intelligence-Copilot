"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 30_000 },
        },
      }),
  );

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-card text-card-foreground border border-border",
              duration: 4000,
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
