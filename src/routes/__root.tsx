import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

import {
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AnimatedOutlet } from "@/components/layout/AnimatedOutlet";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { PrivyProvider } from "@privy-io/react-auth";
import { usePrivy } from "@privy-io/react-auth";
import atxLogo from "@/assets/atx-logo.jpg";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
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
      { title: "Anturix — Back Your Words. Bet Your SOL." },
      {
        name: "description",
        content:
          "Back Your Words. Bet Your SOL. 1v1 duels, expert predictions, and poker pools on Solana.",
      },
      { name: "author", content: "Anturix" },
      {
        property: "og:title",
        content: "Anturix Duel Arena",
      },
      {
        property: "og:description",
        content:
          "1v1 SOL prediction duels on Solana. No public feed. Pure on-chain escrow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Anturix" },
      {
        name: "twitter:title",
        content: "Anturix Duel Arena",
      },
      {
        name: "twitter:description",
        content:
          "1v1 SOL prediction duels on Solana. No public feed. Pure on-chain escrow.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e09af877-c23c-4d82-92c3-5c6c01e8a037/id-preview-8c1252b1--83e19bae-dbaa-449e-bdbb-57c85f599b85.lovable.app-1776051656811.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e09af877-c23c-4d82-92c3-5c6c01e8a037/id-preview-8c1252b1--83e19bae-dbaa-449e-bdbb-57c85f599b85.lovable.app-1776051656811.png",
      },
      {
        httpEquiv: "Content-Security-Policy",
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io blob:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io blob:; script-src-attr 'unsafe-inline'; connect-src 'self' https://auth.privy.io wss://auth.privy.io https://*.privy.io https://*.privy.systems wss://*.privy.systems https://api.devnet.solana.com wss://api.devnet.solana.com https://explorer-api.walletconnect.com https://*.datadoghq.com; frame-src 'self' https://auth.privy.io https://*.privy.io; worker-src 'self' blob:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com;",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: atxLogo },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="overflow-x-hidden max-w-[100vw]">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
        config={{
          loginMethods: ["wallet", "email", "google", "twitter"],
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
          },
          externalWallets: {
            enabled: true,
          },
          solanaClusters: [
            { name: "devnet", rpcUrl: "https://api.devnet.solana.com" },
          ],
        }}
      >
        <AppReadyGate />
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.16 0.02 260)",
              border: "1px solid oklch(0.3 0.02 260)",
              color: "oklch(0.95 0.01 250)",
            },
          }}
        />
      </PrivyProvider>
    </ThemeProvider>
  );
}

function AppReadyGate() {
  const { ready } = usePrivy();

  if (!ready) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background bg-mesh px-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-2xl overflow-hidden border border-primary/30 shadow-[0_0_40px_oklch(0.82_0.18_195/0.25)]">
            <img
              src={atxLogo}
              alt="ATX"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="font-heading text-2xl font-black tracking-[0.16em] text-foreground">
            ANTURIX
          </h1>
          <p className="text-sm text-muted-foreground">
            Back Your Words. Bet Your SOL.
          </p>
          <div className="h-2 w-full rounded-full bg-muted/50 border border-border overflow-hidden">
            <div className="h-full w-1/2 loading-bar rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return <AnimatedOutlet />;
}
