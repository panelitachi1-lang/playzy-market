import { useEffect, useRef, Component, type ReactNode, type ErrorInfo } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/navbar";
import { TelegramSupport } from "@/components/telegram-support";
import NotFound from '@/pages/not-found';
import { Home } from "@/pages/home";
import { Listings } from "@/pages/listings";
import { ListingDetail } from "@/pages/listing-detail";
import { CreateListing } from "@/pages/create-listing";
import { MyListings } from "@/pages/my-listings";
import { Messages } from "@/pages/messages";
import { Conversation } from "@/pages/conversation";
import { UserProfile } from "@/pages/user-profile";
import { Settings } from "@/pages/settings";
import { WalletPage } from "@/pages/wallet";
import { AdminPage } from "@/pages/admin";

// ── Error Boundary — prevents full white screen on crashes ───────────────────
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error boundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 p-8 bg-background text-foreground">
          <div className="text-4xl font-black text-primary">PLAYZY</div>
          <h2 className="text-xl font-bold">Что-то пошло не так</h2>
          <p className="text-muted-foreground text-sm max-w-sm text-center">{this.state.error?.message}</p>
          <button
            className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Use publishable key directly for local dev, or derive from host on Replit
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  publishableKeyFromHost(
    window.location.hostname,
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  );

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
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
    colorPrimary: "hsl(250 100% 60%)",
    colorForeground: "hsl(220 50% 10%)",
    colorMutedForeground: "hsl(220 10% 45%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(220 30% 98%)",
    colorInput: "hsl(220 20% 90%)",
    colorInputForeground: "hsl(220 50% 10%)",
    colorNeutral: "hsl(220 20% 90%)",
    fontFamily: "'Outfit', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-gray-100",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-black text-gray-900",
    headerSubtitle: "text-gray-500",
    socialButtonsBlockButtonText: "text-gray-700 font-medium",
    formFieldLabel: "text-sm font-medium text-gray-700",
    footerActionLink: "text-primary hover:opacity-80 font-bold",
    footerActionText: "text-gray-500",
    dividerText: "text-gray-400",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-green-600",
    alertText: "text-red-600 font-medium",
    logoBox: "mb-6 flex justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-gray-200 hover:bg-gray-50 transition-colors",
    formButtonPrimary: "bg-primary hover:opacity-90 text-white shadow-sm font-bold transition-colors",
    formFieldInput: "bg-white border-gray-200 text-gray-900 focus:ring-primary focus:border-transparent",
    footerAction: "bg-gray-50 border-t border-gray-100 py-4",
    dividerLine: "bg-gray-200",
    alert: "bg-red-50 border border-red-100",
    otpCodeFieldInput: "border-gray-200 text-gray-900 focus:ring-primary",
    formFieldRow: "mb-4",
    main: "px-8 py-8",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

const SELLER_RULES = [
  "Указывать недостоверную информацию о товаре",
  "Мошенничество в любом виде",
  "Общение с покупателем за пределами Playerok",
  "Продажа запрещённых товаров, в том числе полученных нелегальным путём",
];

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-muted/30 px-4 py-12 gap-5">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />

      {/* Marketplace rules */}
      <div className="w-[440px] max-w-full rounded-2xl border border-red-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-2.5 bg-red-50 border-b border-red-100 px-5 py-3.5">
          <span className="text-red-500 text-lg">🚫</span>
          <span className="font-black text-red-600 text-sm tracking-wide uppercase">Запрещено</span>
        </div>
        <ul className="px-5 py-4 space-y-2.5">
          {SELLER_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px] font-black">✕</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
        <div className="mx-5 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-relaxed">
          ⚠️ За нарушение условий продажи средства будут возвращены покупателю, товар будет снят с продажи и учётная запись будет заблокирована.
        </div>
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/listings" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AppContent() {
  const { isSignedIn } = useUser();
  const { data: me } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch("/api/users/me"),
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });

  if (isSignedIn && me?.isBanned) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-white px-4 relative overflow-hidden">
        {/* Animated background rings */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute w-[600px] h-[600px] rounded-full border-2 border-red-100 animate-ping" style={{animationDuration:"3s",animationDelay:"0s"}} />
          <div className="absolute w-[450px] h-[450px] rounded-full border-2 border-red-200 animate-ping" style={{animationDuration:"3s",animationDelay:"0.5s"}} />
          <div className="absolute w-[300px] h-[300px] rounded-full border-2 border-red-300 animate-ping" style={{animationDuration:"3s",animationDelay:"1s"}} />
          <div className="absolute w-[500px] h-[500px] rounded-full bg-red-50 opacity-60" />
        </div>

        <div className="relative max-w-sm w-full">
          <div className="text-center mb-8">
            <img src="/logo.svg" alt="Playzy" className="h-12 w-auto mx-auto" />
          </div>

          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
            {/* Animated top bar */}
            <div className="h-2 bg-gradient-to-r from-red-400 via-red-500 to-red-400 animate-pulse" />

            <div className="px-8 py-8 text-center">
              {/* Lock icon with pulse */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-red-100 animate-ping opacity-60" style={{animationDuration:"2s"}} />
                <div className="relative w-24 h-24 rounded-full bg-red-50 border-4 border-red-200 flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-red-500"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" fill="currentColor" opacity="0.2"/><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>

              <h1 className="text-2xl font-black text-gray-900 mb-2">Аккаунт заблокирован</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Ваш аккаунт был заблокирован за нарушение правил платформы Playzy.
              </p>

           

              <a href="https://t.me/PlayzySupport" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl font-bold text-white bg-[#2AABEE] hover:bg-[#1a9fd8] transition-colors shadow-lg shadow-[#2AABEE]/30">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Написать в поддержку
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/listings" component={Listings} />
          <Route path="/listings/new">
            {() => <ProtectedRoute component={CreateListing} />}
          </Route>
          <Route path="/listings/:id" component={ListingDetail} />
          
          <Route path="/my/listings">
            {() => <ProtectedRoute component={MyListings} />}
          </Route>
          <Route path="/messages">
            {() => <ProtectedRoute component={Messages} />}
          </Route>
          <Route path="/messages/:conversationId">
            {() => <ProtectedRoute component={Conversation} />}
          </Route>
          
          <Route path="/profile/:userId" component={UserProfile} />
          <Route path="/settings">
            {() => <ProtectedRoute component={Settings} />}
          </Route>
          <Route path="/wallet">
            {() => <ProtectedRoute component={WalletPage} />}
          </Route>
          <Route path="/admin" component={AdminPage} />

          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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
      localization={{
        signIn: {
          start: {
            title: "Добро пожаловать",
            subtitle: "Войдите в свой аккаунт",
          },
        },
        signUp: {
          start: {
            title: "Создайте аккаунт",
            subtitle: "Начните работу на Playzy",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <AppContent />
          <TelegramSupport />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <>
      <div className="particles-bg">
        {[...Array(12)].map((_, i) => <div key={i} className="particle" />)}
      </div>
      <ErrorBoundary>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </ErrorBoundary>
    </>
  );
}

export default App;

import { apiFetch } from "@/lib/api";