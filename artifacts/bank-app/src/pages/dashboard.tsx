import { useUser, useClerk } from "@clerk/react";
import { useGetMe, useGetKane, useListTransactions, useGetMyApplication } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout";
import { VirtualCard } from "@/components/virtual-card";
import { CreditScore } from "@/components/credit-score";
import { ArrowDownRight, ArrowUpRight, Repeat, Landmark, ArrowRight, Clock, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

function translateType(type: string): string {
  const map: Record<string, string> = {
    deposit: "Depo",
    withdrawal: "Retrè",
    transfer: "Transfè",
    loan_disbursement: "Deblokaj Prè",
    loan_repayment: "Pèman Prè",
    partner_payment: "Pèman Patnè",
  };
  return map[type] ?? type.replace("_", " ");
}

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

function NoKaneState() {
  const { data: myApp, isLoading: appLoading } = useGetMyApplication({ query: { retry: false } });

  if (appLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
      </div>
    );
  }

  if (!myApp || (myApp as any)?.status === undefined) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <FileText className="w-12 h-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-serif text-slate-900 mb-3">Pa gen Kont Kanè</h2>
        <p className="text-slate-500 mb-8">
          Ou bezwen aplike pou yon kont Pyram Sterling Bank. Apre apwobasyon ou, ou pral gen aksè nan tout sèvis bankè nou yo.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 text-left space-y-3">
          <h3 className="font-semibold text-slate-900 font-serif">Sa ou pral jwenn:</h3>
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Nimewo Kont Kanè inik</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Kat Vityèl Pyram Sterling Bank</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Nòt Kredi Inisyal (300 pwen)</span>
          </div>
          <div className="flex items-start gap-3 text-sm text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>Balans Inisyal: G 250.00</span>
          </div>
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-8">
          <Link href="/apply">Ouvè yon Kont (Kanè)</Link>
        </Button>
      </div>
    );
  }

  if (myApp.status === "pending") {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-12 h-12 text-amber-500" />
        </div>
        <h2 className="text-2xl font-serif text-slate-900 mb-3">Aplikasyon An Atant</h2>
        <p className="text-slate-500 mb-4">
          Aplikasyon kont ou an soumèt avèk siksè. Nou ap tann pou revize li.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">Randevou ou:</p>
          <p className="text-sm text-amber-700">{myApp.appointmentDate} a {myApp.appointmentTime}</p>
          <p className="text-xs text-amber-600 mt-3">
            Tanpri parèt nan bank la ak yon ID nasyonal valid ak frè ouvèti kont (500 HTG) an lajan kach.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useGetMe();
  const { data: kane, isLoading: kaneLoading, error: kaneError } = useGetKane({ query: { retry: false } });
  const { data: transactions, isLoading: txLoading } = useListTransactions({ limit: 5 }, { query: { enabled: !!kane } });

  const hasNoKane = !kaneLoading && (!kane || !!kaneError);

  if (hasNoKane) {
    return (
      <AppLayout>
        <NoKaneState />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Apersi</h1>
          <p className="text-slate-500 mt-1">Byenveni, {profile?.firstName || "Kliyan"}. Men rezime finansye ou.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Balans ak Kat */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="bg-slate-900 text-white border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-transparent to-transparent opacity-50 pointer-events-none" />
              <CardContent className="p-8 relative z-10">
                <p className="text-slate-400 font-medium tracking-wide text-sm uppercase mb-2">Balans Total</p>
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
                    Voye Lajan
                  </Link>
                  <Link href="/transactions" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 h-10 px-6 py-2">
                    Wè Istwa
                  </Link>
                </div>
              </CardContent>
            </Card>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif text-slate-900">Aktivite Resan</h3>
                <Link href="/transactions" className="text-sm font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
                  Wè tout <ArrowRight className="w-4 h-4" />
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
                      Pa gen tranzaksyon resan.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {transactions?.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <TransactionIcon type={tx.type} />
                            <div>
                              <p className="font-medium text-slate-900">{tx.description || translateType(tx.type)}</p>
                              <p className="text-sm text-slate-500">{format(new Date(tx.createdAt), "MMM d, yyyy 'a' h:mm a")}</p>
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

          {/* Kolòn Dwat */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Kat Vityèl</CardTitle>
                <CardDescription>Kat debi aktif ou</CardDescription>
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
                <CardTitle className="font-serif">Nòt Kredi</CardTitle>
                <CardDescription>Pwen kredi ou</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <CreditScore isLoading={kaneLoading} score={kane?.creditScore || 0} />
              </CardContent>
            </Card>

            {kane && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif text-sm">Nimewo Kont</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-slate-700 font-medium">{kane.accountNumber}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
