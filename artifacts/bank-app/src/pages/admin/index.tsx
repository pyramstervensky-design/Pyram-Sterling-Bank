import { AppLayout } from "@/components/layout";
import { useAdminGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Landmark, Activity, CreditCard } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useAdminGetStats();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Admin Overview</h1>
          <p className="text-slate-500 mt-1">Global bank statistics and metrics.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
              <Users className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-bold">{stats?.totalUsers}</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total AUM</CardTitle>
              <Landmark className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-32" /> : <p className="text-3xl font-bold">${stats?.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Transactions</CardTitle>
              <Activity className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-3xl font-bold">{stats?.totalTransactions}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Active Loans</CardTitle>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-20" /> : (
                <div>
                  <p className="text-3xl font-bold">{stats?.activeLoans}</p>
                  <p className="text-xs text-slate-500 mt-1">{stats?.pendingLoans} pending approval</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
