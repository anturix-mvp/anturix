import { Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AnimatedOutlet } from "@/components/layout/AnimatedOutlet";
import { WalletProvider } from "@/contexts/WalletContext";
import { WalletConnectModal } from "@/components/wallet/WalletConnectModal";
import { WalletConnectPrompt } from "@/components/wallet/WalletConnectPrompt";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go home</Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Anturix — SocialFi Prediction Market on Solana" },
      { name: "description", content: "Back Your Words. Bet Your SOL. 1v1 duels, expert predictions, and poker pools on Solana." },
      { name: "author", content: "Anturix" },
      { property: "og:title", content: "Anturix — SocialFi Prediction Market on Solana" },
      { property: "og:description", content: "Back Your Words. Bet Your SOL. 1v1 duels, expert predictions, and poker pools on Solana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Anturix" },
      { name: "twitter:title", content: "Anturix — SocialFi Prediction Market on Solana" },
      { name: "twitter:description", content: "Back Your Words. Bet Your SOL. 1v1 duels, expert predictions, and poker pools on Solana." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e09af877-c23c-4d82-92c3-5c6c01e8a037/id-preview-8c1252b1--83e19bae-dbaa-449e-bdbb-57c85f599b85.lovable.app-1776051656811.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e09af877-c23c-4d82-92c3-5c6c01e8a037/id-preview-8c1252b1--83e19bae-dbaa-449e-bdbb-57c85f599b85.lovable.app-1776051656811.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <WalletProvider>
      <AnimatedOutlet />
      <WalletConnectModal />
      <WalletConnectPrompt />
      <Toaster position="bottom-right" theme="dark" toastOptions={{
        style: { background: 'oklch(0.16 0.02 260)', border: '1px solid oklch(0.3 0.02 260)', color: 'oklch(0.95 0.01 250)' },
      }} />
    </WalletProvider>
  );
}
