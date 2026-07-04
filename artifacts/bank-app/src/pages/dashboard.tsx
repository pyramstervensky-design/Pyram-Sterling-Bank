import { useState } from "react";
import { useGetMe, useGetKane, useListMyLoans, useGetMyApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout";
import { CreditScore } from "@/components/credit-score";
import { Clock, FileText, CheckCircle2, Copy, X } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const DARK_BLUE = "#1a2e6e";
const GOLD = "#d4960a";
const SKY = "#38bdf8";

function ActionBtn({ href, color, textColor, label, sub, icon }: { href: string; color: string; textColor: string; label: string; sub: string; icon: string }) {
  return (
    <Link href={href} className="rounded-xl p-3 flex flex-col gap-1 transition-opacity hover:opacity-80 border border-slate-100" style={{ backgroundColor: color }}>
      <span className="text-lg font-bold leading-none" style={{ color: textColor }}>{icon}</span>
      <span className="text-sm font-semibold leading-tight" style={{ color: textColor }}>{label}</span>
      <span className="text-xs opacity-60 leading-tight" style={{ color: textColor }}>{sub}</span>
    </Link>
  );
}

function ReceiveBtn({ kane, profile }: { kane: any; profile: any }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!kane?.accountNumber) return;
    navigator.clipboard.writeText(kane.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl p-3 flex flex-col gap-1 transition-opacity hover:opacity-80 border border-slate-100 text-left"
        style={{ backgroundColor: "#f0f9ff", color: "#0369a1" }}
      >
        <span className="text-lg font-bold leading-none">←</span>
        <span className="text-sm font-semibold leading-tight">Resevwa</span>
        <span className="text-xs opacity-60 leading-tight">Nimewo kont</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif font-semibold text-lg" style={{ color: DARK_BLUE }}>Resevwa Lajan</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-5">Pataje nimewo kont ou a pou resevwa transfè.</p>
            <div className="rounded-xl p-4 mb-2" style={{ backgroundColor: "#f0f4ff", border: "1px solid #c7d4f8" }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Non</p>
              <p className="font-semibold text-slate-900">{profile?.firstName} {profile?.lastName}</p>
            </div>
            <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: "#f0f4ff", border: "1px solid #c7d4f8" }}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Nimewo Kont (Kanè)</p>
              <p className="font-mono font-bold text-xl" style={{ color: DARK_BLUE }}>{kane?.accountNumber ?? "—"}</p>
            </div>
            <button
              onClick={copy}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors"
              style={{ backgroundColor: copied ? "#dcfce7" : GOLD, color: copied ? "#15803d" : "#fff" }}
            >
              <Copy className="w-4 h-4" />
              {copied ? "Kopye!" : "Kopye Nimewo Kont"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

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

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <ActionBtn href="/send" color={GOLD} textColor="#fff" label="Voye Lajan" sub="Transfè" icon="→" />
            <ActionBtn href="/deposit" color="#dcfce7" textColor="#15803d" label="Depo" sub="Ajoute lajan" icon="↓" />
            <ActionBtn href="/withdraw" color="#fee2e2" textColor="#dc2626" label="Retrè" sub="Retire lajan" icon="↑" />
            <ActionBtn href="/loans" color="#eff6ff" textColor="#1d4ed8" label="Mande Prè" sub="Jwenn prè" icon="⬡" />
            <ReceiveBtn kane={kane} profile={profile} />
            <ActionBtn href="/transactions" color="#f8fafc" textColor="#475569" label="Istwa" sub="Tranzaksyon" icon="≡" />
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
