import { Link, useLocation } from "wouter";
import { useUser, useClerk, Show } from "@clerk/react";
import { useGetMe } from "@workspace/api-client-react";
import { Home, ArrowRightLeft, Send, Landmark, Users, Settings, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";

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
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-sm flex items-center justify-center">
              <span className="text-slate-900 font-serif font-bold text-xl leading-none">P</span>
            </div>
            <span className="text-white font-serif text-xl tracking-tight">Pyram Sterling Bank</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-3">Banking</div>
          <NavLink href="/dashboard" icon={Home}>Dashboard</NavLink>
          <NavLink href="/transactions" icon={ArrowRightLeft}>Transactions</NavLink>
          <NavLink href="/send" icon={Send}>Transfer</NavLink>
          
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Wealth</div>
          <NavLink href="/loans" icon={Landmark}>Loans</NavLink>
          <NavLink href="/partners" icon={Users}>Partners</NavLink>
          
          {isAdmin && (
            <>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-3">Admin</div>
              <NavLink href="/admin" icon={ShieldAlert}>Overview</NavLink>
              <NavLink href="/admin/users" icon={Users}>Users</NavLink>
              <NavLink href="/admin/transactions" icon={ArrowRightLeft}>All Transactions</NavLink>
              <NavLink href="/admin/loans" icon={Landmark}>Loan Approvals</NavLink>
              <NavLink href="/admin/partners" icon={Users}>Partner Mgmt</NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavLink href="/profile" icon={Settings}>Settings</NavLink>
          <button 
            onClick={() => signOut({ redirectUrl: "/" })}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/50 mt-1 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="font-serif text-xl text-slate-900">
            {isAdmin ? <span className="bg-amber-100 text-amber-800 text-xs font-sans px-2 py-1 rounded mr-3 align-middle tracking-wider font-bold">ADMIN</span> : null}
            Pyram Sterling Bank
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs text-slate-500">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-medium">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
          </div>
        </header>
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
