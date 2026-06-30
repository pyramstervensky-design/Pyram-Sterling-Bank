import { useUser, useClerk } from "@clerk/react";
import { useGetMe, useGetKane, useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout";
import { VirtualCard } from "@/components/virtual-card";
import { CreditScore } from "@/components/credit-score";
import { ArrowDownRight, ArrowUpRight, Repeat, Landmark, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

function TransactionIcon({ type }: { type: string }) {
  switch (type) {
    case 'deposit':
    case 'loan_disbursement':
      return <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><ArrowDownRight className="w-5 h-5" /></div>;
    case 'withdrawal':
    case 'partner_payment':
      return <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><ArrowUpRight className="w-5 h-5" /></div>;
    case 'transfer':
      return <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Repeat className="w-5 h-5" /></div>;
    case 'loan_repayment':
      return <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>;
    default:
      return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><ArrowRight className="w-5 h-5" /></div>;
  }
}

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useGetMe();
  const { data: kane, isLoading: kaneLoading } = useGetKane();
  const { data: transactions, isLoading: txLoading } = useListTransactions({ limit: 5 });

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, {profile?.firstName || "Client"}. Here is your financial summary.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Balance & Card */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-transparent to-transparent opacity-50 pointer-events-none" />
              <CardContent className="p-8 relative z-10">
                <p className="text-slate-400 font-medium tracking-wide text-sm uppercase mb-2">Total Balance</p>
                {kaneLoading ? (
                  <Skeleton className="h-14 w-64 bg-slate-800" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-light text-slate-400">G</span>
                    <span className="text-6xl font-light tracking-tight">
                      {(kane?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                
                <div className="mt-8 flex gap-4">
                  <Link href="/send" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-amber-500 text-slate-950 shadow hover:bg-amber-500/90 h-10 px-6 py-2">
                    Transfer Funds
                  </Link>
                  <Link href="/transactions" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 h-10 px-6 py-2">
                    View History
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif text-slate-900">Recent Activity</h3>
                <Link href="/transactions" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  View all <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <Card>
                <CardContent className="p-0">
                  {txLoading ? (
                    <div className="divide-y divide-slate-100 p-6 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                          <Skeleton className="h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : transactions?.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                      No recent transactions.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transactions?.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <TransactionIcon type={tx.type} />
                            <div>
                              <p className="font-medium text-slate-900">{tx.description || tx.type.replace('_', ' ')}</p>
                              <p className="text-sm text-slate-500">{format(new Date(tx.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
                            </div>
                          </div>
                          <div className={`font-medium ${['deposit', 'loan_disbursement'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {['deposit', 'loan_disbursement'].includes(tx.type) ? '+' : '-'}G {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Virtual Card</CardTitle>
                <CardDescription>Your active debit card</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-8">
                <VirtualCard 
                  isLoading={kaneLoading || profileLoading}
                  cardNumber={kane?.cardNumber}
                  cardholderName={`${profile?.firstName} ${profile?.lastName}`}
                  expiry={kane?.cardExpiry}
                  cvv={kane?.cardCvv}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Credit Score</CardTitle>
                <CardDescription>Based on FICO 8 model</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <CreditScore isLoading={kaneLoading} score={kane?.creditScore || 0} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
