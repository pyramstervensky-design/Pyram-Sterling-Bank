import { AppLayout } from "@/components/layout";
import { useAdminGetStats, useAdminListUsers, useAdminListApplications } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Landmark, Activity, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const DARK_BLUE = "#1a2e6e";

function scoreColor(score: number) {
  if (score >= 750) return { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6", label: "Ekselan" };
  if (score >= 650) return { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e", label: "Bon" };
  if (score >= 500) return { bg: "#fefce8", text: "#a16207", dot: "#eab308", label: "Pasab" };
  return { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444", label: "Move" };
}

function StatCard({ title, value, icon: Icon, sub, href }: { title: string; value?: number | string; icon: any; sub?: string; href?: string }) {
  const inner = (
    <Card className={`${href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
        <Icon className="w-4 h-4 text-slate-400" />
      </CardHeader>
      <CardContent>
        {value === undefined ? <Skeleton className="h-8 w-20" /> : (
          <>
            <p className="text-3xl font-bold" style={{ color: DARK_BLUE }}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const { data: users = [] } = useAdminListUsers();
  const { data: apps = [] } = useAdminListApplications();

  const pendingApps = apps.filter((a) => a.status === "pending").slice(0, 5);

  const scoreGroups = users
    .filter((u) => u.kane?.creditScore !== undefined)
    .reduce<Record<string, number>>((acc, u) => {
      const s = u.kane!.creditScore;
      const key = s >= 750 ? "Ekselan (750+)" : s >= 650 ? "Bon (650-749)" : s >= 500 ? "Pasab (500-649)" : "Move (300-499)";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  const scoreOrder = ["Ekselan (750+)", "Bon (650-749)", "Pasab (500-649)", "Move (300-499)"];
  const scoreDotColors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif tracking-tight" style={{ color: DARK_BLUE }}>Apersi Admin</h1>
          <p className="text-slate-500 mt-1">Estatistik ak metrik bank global.</p>
        </div>

        {/* Metric cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Kliyan" value={statsLoading ? undefined : stats?.totalUsers} icon={Users} href="/admin/users" />
          <StatCard title="Total Aktif Jere" value={statsLoading ? undefined : stats?.totalBalance !== undefined ? `G ${Math.round(stats.totalBalance).toLocaleString()}` : undefined} icon={Landmark} />
          <StatCard title="Tranzaksyon" value={statsLoading ? undefined : stats?.totalTransactions} icon={Activity} href="/admin/transactions" />
          <StatCard
            title="Aplikasyon an Atant"
            value={statsLoading ? undefined : (stats as any)?.pendingApplications ?? pendingApps.length}
            icon={FileText}
            sub={`${apps.filter(a => a.status === "completed" || a.status === "approved").length} konplete`}
            href="/admin/applications"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Applications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold font-serif" style={{ color: DARK_BLUE }}>Aplikasyon an Atant</CardTitle>
              <Link href="/admin/applications" className="text-xs font-medium" style={{ color: "#d4960a" }}>
                Wè tout
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {pendingApps.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                  Pa gen aplikasyon an atant.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingApps.map((app) => (
                    <div key={app.id} className="px-5 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">{app.firstName} {app.lastName}</p>
                        <p className="text-xs text-slate-500">{app.phone} · Randevou: {app.appointmentDate}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-amber-600 font-medium">An atant</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Credit Score Distribution */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold font-serif" style={{ color: DARK_BLUE }}>Distribisyon Nòt Kredi</CardTitle>
              <Link href="/admin/users" className="text-xs font-medium" style={{ color: "#d4960a" }}>
                Jere
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {users.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Pa gen kliyan ak kont Kanè.</p>
              ) : (
                scoreOrder.map((key, i) => {
                  const count = scoreGroups[key] ?? 0;
                  const total = Object.values(scoreGroups).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: scoreDotColors[i] }} />
                          <span className="text-slate-700 font-medium">{key}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{count} kliyan</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: scoreDotColors[i] }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Total kliyan ak Kanè</span>
                <span className="font-medium text-slate-600">{Object.values(scoreGroups).reduce((a, b) => a + b, 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Aksyon rapid</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: "/admin/applications", label: "Revize Aplikasyon", icon: FileText, color: "#fefce8" },
              { href: "/admin/loans", label: "Apwobasyon Prè", icon: Landmark, color: "#eff6ff" },
              { href: "/admin/users", label: "Jere Kliyan", icon: Users, color: "#f0fdf4" },
              { href: "/admin/transactions", label: "Tranzaksyon", icon: Activity, color: "#faf5ff" },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href} className="rounded-xl p-4 flex items-center gap-3 border border-slate-200 hover:shadow-sm transition-shadow" style={{ backgroundColor: color }}>
                <Icon className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
