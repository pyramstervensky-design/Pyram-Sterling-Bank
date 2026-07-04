import { useGetMe, useGetKane, useListMyLoans, useGetMyApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout";
import { CreditScore } from "@/components/credit-score";
import { Clock, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const DARK_BLUE = "#1a2e6e";
const GOLD = "#d4960a";
const SKY = "#38bdf8";

function SectionDivider() {
  return (
    <div
      className="h-px w-full my-8"
      style={{
        background: `linear-gradient(to right, ${GOLD}, ${DARK_BLUE})`,
        opacity: 0.5,
      }}
    />
  );
}

function SkyDivider() {
  return (
    <div
      className="h-px w-full mt-2 mb-5"
      style={{ backgroundColor: SKY, opacity: 0.6 }}
    />
  );
}

function BankLogo() {
  return (
    <img
      src="/pyram-logo.png"
      alt="Pyram Sterling Bank"
      className="h-8 w-auto object-contain mb-5"
    />
  );
}

function Row({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 font-medium">{label}</span>
      <span className={`text-sm font-semibold text-right ml-4 ${valueClass ?? "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}

function Amount({ value }: { value: number }) {
  return (
    <span>
      <span className="text-slate-400 font-normal mr-0.5">G</span>
      {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

function LoanStatusLabel({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    approved: { label: "Aktif", color: "#22c55e" },
    completed: { label: "Konplète", color: "#3b82f6" },
    defaulted: { label: "Defay", color: "#ef4444" },
    pending: { label: "An Atant", color: "#eab308" },
    rejected: { label: "Rejte", color: "#94a3b8" },
  };
  const meta = map[status] ?? { label: status, color: "#94a3b8" };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
      <span style={{ color: meta.color }}>{meta.label}</span>
    </span>
  );
}

function NoKaneState() {
  const { data: myApp, isLoading: appLoading } = useGetMyApplication({ query: { retry: false } as any });

  if (appLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!myApp || !myApp.status) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-serif text-slate-900 mb-3">Pa gen Kont Kanè</h2>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          Ou bezwen aplike pou yon kont Pyram Sterling Bank. Apre apwobasyon ou, ou pral gen aksè nan tout sèvis bankè nou yo.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left space-y-2.5">
          {["Nimewo Kont Kanè inik", "Kat Pyram Sterling Bank", "Nòt Kredi Inisyal (300 pwen)", "Balans Inisyal: G 250.00"].map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <Button asChild className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-8">
          <Link href="/apply">Ouvè yon Kont (Kanè)</Link>
        </Button>
      </div>
    );
  }

  if (myApp.status === "pending") {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-serif text-slate-900 mb-3">Aplikasyon An Atant</h2>
        <p className="text-slate-500 mb-5 text-sm">Aplikasyon kont ou an soumèt. Nou ap revize li.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">Randevou ou:</p>
          <p className="text-sm text-amber-700">{myApp.appointmentDate} a {myApp.appointmentTime}</p>
          <p className="text-xs text-amber-600 mt-2">Parèt nan bank la ak ID nasyonal valid ak 500 HTG an lajan kach.</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { data: profile, isLoading: profileLoading } = useGetMe();
  const { data: kane, isLoading: kaneLoading, error: kaneError } = useGetKane({ query: { retry: false } as any });
  const { data: loans = [] } = useListMyLoans({ query: { enabled: !!kane } as any });

  const hasNoKane = !kaneLoading && (!kane || !!kaneError);
  const activeLoan = loans.find((l) => l.status === "approved");
  const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "—";

  if (hasNoKane) {
    return (
      <AppLayout>
        <NoKaneState />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">

        {/* ═══════════════════════════════════════
            1. KONT KLIYAN
        ═══════════════════════════════════════ */}
        <section>
          <h2
            className="text-xl font-semibold tracking-wide"
            style={{ color: DARK_BLUE, fontFamily: "serif" }}
          >
            Kont Kliyan
          </h2>
          <SkyDivider />

          {profileLoading || kaneLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-5 w-36" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xl font-semibold text-slate-900">{fullName}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Kanè:</span>
                <span className="font-mono text-base text-slate-700 font-medium">{kane?.accountNumber ?? "—"}</span>
              </div>
            </div>
          )}
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════
            2. KONT BANKÈ
        ═══════════════════════════════════════ */}
        <section>
          <h2
            className="text-xl font-semibold tracking-wide mb-2"
            style={{ color: DARK_BLUE, fontFamily: "serif" }}
          >
            Kont Bankè
          </h2>
          <SkyDivider />
          <BankLogo />

          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-500">Kont Prensipal</span>
            {kaneLoading ? (
              <Skeleton className="h-8 w-40" />
            ) : (
              <span className="text-3xl font-light tracking-tight" style={{ color: DARK_BLUE }}>
                <span className="text-lg font-normal text-slate-400 mr-1">G</span>
                {(kane?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/send"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
              style={{ backgroundColor: GOLD, color: "#fff" }}
            >
              Voye Lajan
            </Link>
            <Link
              href="/transactions"
              className="inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold border transition-colors text-slate-600 hover:bg-slate-50"
              style={{ borderColor: "#cbd5e1" }}
            >
              Istwa Tranzaksyon
            </Link>
          </div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════
            3. KAT DEBI
        ═══════════════════════════════════════ */}
        <section>
          <h2
            className="text-xl font-semibold tracking-wide mb-2"
            style={{ color: DARK_BLUE, fontFamily: "serif" }}
          >
            Kat Debi
          </h2>
          <SkyDivider />
          <BankLogo />

          <div className="flex items-baseline justify-between mb-5">
            {profileLoading ? (
              <Skeleton className="h-5 w-36" />
            ) : (
              <span className="text-base font-semibold text-slate-800">{fullName}</span>
            )}
            {kaneLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <span className="text-2xl font-light" style={{ color: DARK_BLUE }}>
                <span className="text-base font-normal text-slate-400 mr-1">G</span>
                {(kane?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div
            className="rounded-xl p-5 space-y-0"
            style={{ backgroundColor: "#f8faff", border: `1px solid #e1e9ff` }}
          >
            {kaneLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <Row label="Nimewo Kat" value={
                  <span className="font-mono tracking-widest">
                    {kane?.cardNumber
                      ? kane.cardNumber.replace(/(\d{4})/g, "$1 ").trim()
                      : "—"}
                  </span>
                } />
                <Row label="Ekspire" value={kane?.cardExpiry ?? "—"} />
                <Row label="CVV" value={kane?.cardCvv ?? "—"} />
              </>
            )}
          </div>
        </section>

        <SectionDivider />

        {/* ═══════════════════════════════════════
            4. SKÒ KREDI
        ═══════════════════════════════════════ */}
        <section>
          <h2
            className="text-xl font-semibold tracking-wide mb-2"
            style={{ color: DARK_BLUE, fontFamily: "serif" }}
          >
            Skò Kredi
          </h2>
          <SkyDivider />
          <BankLogo />

          <CreditScore isLoading={kaneLoading} score={kane?.creditScore ?? 0} />

          <p className="text-xs text-slate-400 mt-5">
            Pwen kredi yo soti ant 300 ak 850. Yo mete ajou otomatikman apre chak aktivite finansye.
          </p>
        </section>

        {/* ═══════════════════════════════════════
            5. PRÈ (conditional)
        ═══════════════════════════════════════ */}
        {activeLoan && (
          <>
            <SectionDivider />
            <section>
              <h2
                className="text-xl font-semibold tracking-wide mb-2"
                style={{ color: DARK_BLUE, fontFamily: "serif" }}
              >
                Prè
              </h2>
              <SkyDivider />
              <BankLogo />

              <div className="flex items-baseline justify-between mb-5">
                <span className="text-base font-semibold text-slate-800">{fullName}</span>
                <span className="text-2xl font-light" style={{ color: DARK_BLUE }}>
                  <span className="text-base font-normal text-slate-400 mr-1">G</span>
                  {(activeLoan.totalRepaymentAmount ?? activeLoan.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "#f8faff", border: "1px solid #e1e9ff" }}
              >
                <Row label="Montan Prè Inisyal" value={<Amount value={activeLoan.amount} />} />
                <Row label="Deja Peye" value={<Amount value={activeLoan.amountRepaid} />} valueClass="text-emerald-600" />
                <Row
                  label="Balans Restant"
                  value={<Amount value={Math.max(0, (activeLoan.totalRepaymentAmount ?? activeLoan.amount) - activeLoan.amountRepaid)} />}
                  valueClass="text-slate-900"
                />
                {activeLoan.weeklyPaymentAmount && (
                  <Row label="Peman Chak Semèn" value={<Amount value={activeLoan.weeklyPaymentAmount} />} />
                )}
                {activeLoan.nextPaymentDue && (
                  <Row
                    label="Pwochen Peman"
                    value={format(new Date(activeLoan.nextPaymentDue), "MMM d, yyyy")}
                  />
                )}
                {activeLoan.latePayments > 0 && (
                  <Row label="Peman an Reta" value={String(activeLoan.latePayments)} valueClass="text-rose-600" />
                )}
                <div className="flex items-baseline justify-between pt-3">
                  <span className="text-sm text-slate-500 font-medium">Estati</span>
                  <LoanStatusLabel status={activeLoan.status} />
                </div>
              </div>

              <div className="mt-4">
                <Link
                  href="/loans"
                  className="inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
                  style={{ backgroundColor: GOLD, color: "#fff" }}
                >
                  Jere Prè Mwen
                </Link>
              </div>
            </section>
          </>
        )}

        <div className="h-12" />
      </div>
    </AppLayout>
  );
}
