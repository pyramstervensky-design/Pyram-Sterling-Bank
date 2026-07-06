import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Home, ArrowRightLeft, Send, Landmark, Users, Settings, LogOut, ShieldAlert, FileText, Menu, X } from "lucide-react";
import { NotificationsBell } from "./notifications-bell";
import { NetworkStatusIndicator, NetworkStatusBanner } from "./network-status";

function NavLink({ href, icon: Icon, children, onNavigate }: { href: string; icon: any; children: React.ReactNode; onNavigate?: () => void }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-md transition-colors ${isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}

function SidebarContent({ isAdmin, onNavigate, signOut }: { isAdmin: boolean; onNavigate?: () => void; signOut: (opts: { redirectUrl: string }) => void }) {
  return (
    <>
      <div className="px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center justify-center">
          <div className="bg-white rounded-xl px-4 py-2.5 w-full flex items-center justify-center">
            <img src="/pyram-logo.png" alt="Pyram Sterling Bank" className="w-full h-auto object-contain" style={{ maxHeight: "52px" }} />
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2 px-3">Bankè</div>
        <NavLink href="/dashboard" icon={Home} onNavigate={onNavigate}>Tablo de bò</NavLink>
        <NavLink href="/transactions" icon={ArrowRightLeft} onNavigate={onNavigate}>Tranzaksyon</NavLink>
        <NavLink href="/send" icon={Send} onNavigate={onNavigate}>Transfè</NavLink>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Richès</div>
        <NavLink href="/loans" icon={Landmark} onNavigate={onNavigate}>Prè</NavLink>
        <NavLink href="/partners" icon={Users} onNavigate={onNavigate}>Patnè</NavLink>

        {isAdmin && (
          <>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Admin</div>
            <NavLink href="/admin" icon={ShieldAlert} onNavigate={onNavigate}>Apersi</NavLink>
            <NavLink href="/admin/users" icon={Users} onNavigate={onNavigate}>Itilizatè</NavLink>
            <NavLink href="/admin/applications" icon={FileText} onNavigate={onNavigate}>Aplikasyon</NavLink>
            <NavLink href="/admin/transactions" icon={ArrowRightLeft} onNavigate={onNavigate}>Tout Tranzaksyon</NavLink>
            <NavLink href="/admin/loans" icon={Landmark} onNavigate={onNavigate}>Apwobasyon Prè</NavLink>
            <NavLink href="/admin/partners" icon={Users} onNavigate={onNavigate}>Jere Patnè</NavLink>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <NavLink href="/profile" icon={Settings} onNavigate={onNavigate}>Paramèt</NavLink>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 mt-1 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Dekonekte</span>
        </button>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: profile } = useGetMe();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  // Admin UI (nav + badge) is gated purely on the account's role. Admins see
  // the admin entry points everywhere, including the customer dashboard, so the
  // panel is always discoverable; regular customers (role !== "admin") never
  // see any admin UI. The backend still enforces access on every admin route.
  const showAdminUi = profile?.role === "admin";

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Drawer accessibility: lock body scroll, trap focus, close on Escape,
  // and restore focus to the trigger when it closes.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      drawerRef.current
        ? Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
        : [];

    getFocusable()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key === "Tab") {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [mobileOpen]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Bò Kote — desktop (persistent) */}
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col border-r border-slate-800 flex-shrink-0">
        <SidebarContent isAdmin={showAdminUi} signOut={signOut} />
      </aside>

      {/* Bò Kote — mobile / tablet (slide-in drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Meni navigasyon"
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-slate-950 flex flex-col border-r border-slate-800 shadow-2xl animate-in slide-in-from-left duration-200"
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fèmen meni"
              className="absolute top-3 right-3 z-10 p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent isAdmin={showAdminUi} signOut={signOut} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Kontni Prensipal */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-w-0">
        <header className="h-16 border-b bg-white flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              ref={triggerRef}
              onClick={() => setMobileOpen(true)}
              className="lg:hidden -ml-1 p-2.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
              aria-label="Ouvè meni"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="font-serif text-base sm:text-xl text-slate-900 truncate">
              {showAdminUi ? <span className="bg-amber-100 text-amber-800 text-xs font-sans px-2 py-1 rounded mr-2 sm:mr-3 align-middle tracking-wider font-bold">ADMIN</span> : null}
              <span className="hidden sm:inline">Pyram Sterling Bank</span>
              <span className="sm:hidden">Pyram Sterling</span>
            </h2>
            <div className="hidden sm:block">
              <NetworkStatusIndicator />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <NotificationsBell />
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-slate-900">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-slate-500">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-medium flex-shrink-0">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          </div>
        </header>
        <NetworkStatusBanner />
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
