import { Link, useLocation } from "wouter";
import { useUser, useClerk, Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Home, ArrowRightLeft, Send, Landmark, Users, Settings, LogOut, ShieldAlert, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { NotificationsBell } from "./notifications-bell";
import { NetworkStatusIndicator, NetworkStatusBanner } from "./network-status";

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/dashboard" && location.startsWith(href));

  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"}`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: profile } = useGetMe();

  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Bò Kote */}
      <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="px-5 py-4 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center justify-center">
            <div className="bg-white rounded-xl px-4 py-2.5 w-full flex items-center justify-center">
              <img src="/pyram-logo.png" alt="Pyram Sterling Bank" className="w-full h-auto object-contain" style={{ maxHeight: "52px" }} />
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-3">Bankè</div>
          <NavLink href="/dashboard" icon={Home}>Tablo de bò</NavLink>
          <NavLink href="/transactions" icon={ArrowRightLeft}>Tranzaksyon</NavLink>
          <NavLink href="/send" icon={Send}>Transfè</NavLink>
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Richès</div>
          <NavLink href="/loans" icon={Landmark}>Prè</NavLink>
          <NavLink href="/partners" icon={Users}>Patnè</NavLink>
          
          {isAdmin && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Admin</div>
              <NavLink href="/admin" icon={ShieldAlert}>Apersi</NavLink>
              <NavLink href="/admin/users" icon={Users}>Itilizatè</NavLink>
              <NavLink href="/admin/applications" icon={FileText}>Aplikasyon</NavLink>
              <NavLink href="/admin/transactions" icon={ArrowRightLeft}>Tout Tranzaksyon</NavLink>
              <NavLink href="/admin/loans" icon={Landmark}>Apwobasyon Prè</NavLink>
              <NavLink href="/admin/partners" icon={Users}>Jere Patnè</NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavLink href="/profile" icon={Settings}>Paramèt</NavLink>
          <button 
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 mt-1 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Dekonekte</span>
          </button>
        </div>
      </aside>

      {/* Kontni Prensipal */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-serif text-xl text-slate-900">
              {isAdmin ? <span className="bg-amber-100 text-amber-800 text-xs font-sans px-2 py-1 rounded mr-3 align-middle tracking-wider font-bold">ADMIN</span> : null}
              Pyram Sterling Bank
            </h2>
            <NetworkStatusIndicator />
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-slate-500">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-medium">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          </div>
        </header>
        <NetworkStatusBanner />
        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
