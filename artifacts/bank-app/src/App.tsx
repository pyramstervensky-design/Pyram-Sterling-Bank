import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";

import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import SendPage from "@/pages/send";
import LoansPage from "@/pages/loans";
import PartnersPage from "@/pages/partners";
import ProfilePage from "@/pages/profile";
import ApplyPage from "@/pages/apply";
import DepositPage from "@/pages/deposit";
import WithdrawPage from "@/pages/withdraw";
import AdminDashboardPage from "@/pages/admin/index";
import AdminUsersPage from "@/pages/admin/users";
import AdminTransactionsPage from "@/pages/admin/transactions";
import AdminLoansPage from "@/pages/admin/loans";
import AdminPartnersPage from "@/pages/admin/partners";
import AdminApplicationsPage from "@/pages/admin/applications";
import NotFound from "@/pages/not-found";
import AccessDenied from "@/pages/access-denied";

const clerkPubKey = publishableKeyFromHost(
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

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function SignedInHome() {
  const { data: profile, isLoading, isError, refetch } = useGetMe();
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }
  // Never guess the destination when the role is unknown: an errored/undefined
  // profile must not fall through to the customer dashboard, or an admin gets
  // misrouted on a transient /api/users/me failure. Block and let them retry.
  if (isError || !profile) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
        <p className="text-slate-700">Nou pa t kapab chaje kont ou an. Tanpri reeseye.</p>
        <button
          onClick={() => refetch()}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-800"
        >
          Reeseye
        </button>
      </div>
    );
  }
  return <Redirect to={profile.role === "admin" ? "/admin" : "/dashboard"} />;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SignedInHome />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function AdminRouteInner({ component: Component }: { component: any }) {
  const { data: profile, isLoading } = useGetMe();
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }
  if (profile?.role !== "admin") return <AccessDenied />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <AdminRouteInner component={Component} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/dashboard">{() => <ProtectedRoute component={DashboardPage} />}</Route>
            <Route path="/transactions">{() => <ProtectedRoute component={TransactionsPage} />}</Route>
            <Route path="/send">{() => <ProtectedRoute component={SendPage} />}</Route>
            <Route path="/loans">{() => <ProtectedRoute component={LoansPage} />}</Route>
            <Route path="/partners">{() => <ProtectedRoute component={PartnersPage} />}</Route>
            <Route path="/profile">{() => <ProtectedRoute component={ProfilePage} />}</Route>
            
            <Route path="/apply">{() => <ProtectedRoute component={ApplyPage} />}</Route>
            <Route path="/deposit">{() => <ProtectedRoute component={DepositPage} />}</Route>
            <Route path="/withdraw">{() => <ProtectedRoute component={WithdrawPage} />}</Route>
            
            <Route path="/admin">{() => <AdminRoute component={AdminDashboardPage} />}</Route>
            <Route path="/admin/users">{() => <AdminRoute component={AdminUsersPage} />}</Route>
            <Route path="/admin/applications">{() => <AdminRoute component={AdminApplicationsPage} />}</Route>
            <Route path="/admin/transactions">{() => <AdminRoute component={AdminTransactionsPage} />}</Route>
            <Route path="/admin/loans">{() => <AdminRoute component={AdminLoansPage} />}</Route>
            <Route path="/admin/partners">{() => <AdminRoute component={AdminPartnersPage} />}</Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
