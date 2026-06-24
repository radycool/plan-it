import { useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClerkProvider, SignIn, SignUp, Show } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

// Layouts and Pages
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import AccountFeed from "@/pages/account-feed";
import PreviewFeed from "@/pages/preview-feed";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(75, 100%, 50%)",
    colorForeground: "hsl(0, 0%, 98%)",
    colorMutedForeground: "hsl(0, 0%, 65%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 6%)",
    colorInput: "hsl(0, 0%, 12%)",
    colorInputForeground: "hsl(0, 0%, 98%)",
    colorNeutral: "hsl(0, 0%, 12%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card rounded-2xl w-[440px] max-w-full overflow-hidden border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground font-display font-bold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    formFieldInput: "bg-input border-border text-foreground focus:border-primary",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
          <header className="flex items-center justify-between px-8 py-6 border-b border-border">
            <img src={`${basePath}/logo.svg`} alt="Plan-It Logo" className="h-8" />
            <div className="flex items-center gap-4">
              <a href={`${basePath}/sign-in`} className="text-sm font-medium hover:text-primary transition-colors">Sign In</a>
              <a href={`${basePath}/sign-up`} className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors text-primary-foreground">Get Started</a>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center px-4 text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight">The approval layer for social agencies.</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl">
              Upload drafts, get client feedback, and secure approvals before anything goes live. Built for speed and precision.
            </p>
            <a href={`${basePath}/sign-up`} className="text-lg font-medium bg-primary text-primary-foreground px-8 py-4 rounded-lg hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
              Start Free Trial
            </a>
          </main>
        </div>
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/preview/:token" component={PreviewFeed} />
            
            <Route path="/dashboard">
              <Show when="signed-in"><Dashboard /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </Route>
            
            <Route path="/clients">
              <Show when="signed-in"><Clients /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </Route>

            <Route path="/clients/:clientId/accounts/:accountId">
              <Show when="signed-in"><AccountFeed /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </Route>

            <Route path="/clients/:clientId">
              <Show when="signed-in"><ClientDetail /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </Route>
            
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
      <Toaster />
    </WouterRouter>
  );
}
