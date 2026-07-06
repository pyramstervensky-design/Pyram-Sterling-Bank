import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { useWithdraw, useGetKane, getGetKaneQueryKey, getListTransactionsQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

const DARK_BLUE = "#1a2e6e";
const GOLD = "#d4960a";

export default function WithdrawPage() {
  const { data: kane } = useGetKane();
  const withdraw = useWithdraw();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const balance = kane?.balance ?? 0;
  const numAmount = Number(amount);
  const exceedsBalance = numAmount > balance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0 || exceedsBalance) return;

    withdraw.mutate(
      { data: { amount: numAmount, description: description || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Demann retrè soumèt", description: `Demann retrè G ${numAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ap tann apwobasyon admin.` });
          setAmount("");
          setDescription("");
          queryClient.invalidateQueries({ queryKey: getGetKaneQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Erè", description: err?.message ?? "Iespere eseye ankò.", variant: "destructive" });
        },
      }
    );
  };

  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000];

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Retounen
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
            <ArrowUpRight className="w-6 h-6" style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-semibold" style={{ color: DARK_BLUE }}>Retrè</h1>
            <p className="text-sm text-slate-500">Retire lajan nan kont ou</p>
          </div>
        </div>

        <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: "#f0f4ff", border: "1px solid #c7d4f8" }}>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Balans Disponib</p>
          <p className="text-2xl font-semibold" style={{ color: DARK_BLUE }}>
            <span className="text-base font-normal text-slate-400 mr-1">G</span>
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold text-slate-700">Montan (HTG) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">G</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                max={balance}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={`pl-8 text-lg font-medium ${exceedsBalance ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
            </div>
            {exceedsBalance && (
              <p className="text-sm text-red-500">Montan an depase balans disponib ou (G {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}).</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Montan rapid</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(Math.min(q, balance)))}
                  disabled={q > balance}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${amount === String(Math.min(q, balance)) && q <= balance ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  G {q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-slate-700">Nòt (Opsyonèl)</Label>
            <Input
              id="description"
              placeholder="eks: Depans pèsonèl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            style={{ backgroundColor: GOLD, color: "#fff" }}
            disabled={withdraw.isPending || !amount || numAmount <= 0 || exceedsBalance}
          >
            {withdraw.isPending ? "Ap trete..." : "Konfime Retrè"}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
