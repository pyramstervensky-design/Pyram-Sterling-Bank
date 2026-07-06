import { AppLayout } from "@/components/layout";
import {
  useAdminListTransactions,
  useAdminApproveTransaction,
  useAdminRejectTransaction,
  getAdminListTransactionsQueryKey,
  getAdminGetStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Send, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const DARK_BLUE = "#1a2e6e";

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

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    completed: "Konplete",
    pending: "An atant",
    failed: "Echwe",
  };
  return map[status] ?? status;
}

const PENDING_SECTIONS = [
  { type: "deposit", label: "Depo an atant", icon: ArrowDownLeft, color: "#22c55e" },
  { type: "withdrawal", label: "Retrè an atant", icon: ArrowUpRight, color: "#ef4444" },
  { type: "transfer", label: "Transfè an atant", icon: Send, color: DARK_BLUE },
] as const;

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useAdminListTransactions({ limit: 200 });
  const approve = useAdminApproveTransaction();
  const reject = useAdminRejectTransaction();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getAdminListTransactionsQueryKey({ limit: 200 }) });
    queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
  };

  const handleAction = (id: number, action: "approve" | "reject") => {
    const mutator = action === "approve" ? approve : reject;
    mutator.mutate(
      { transactionId: id },
      {
        onSuccess: () => {
          toast({ title: action === "approve" ? "Tranzaksyon apwouve" : "Tranzaksyon rejte" });
          invalidate();
        },
        onError: (err: any) => {
          toast({
            title: "Erè",
            description: err?.response?.data?.error ?? err?.message ?? "Tanpri eseye ankò.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const pending = (transactions ?? []).filter((tx) => tx.status === "pending");
  const busy = approve.isPending || reject.isPending;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif tracking-tight" style={{ color: DARK_BLUE }}>Tranzaksyon</h1>
          <p className="text-slate-500 mt-1">Apwouve demann an atant epi siveye tout tranzaksyon bank yo.</p>
        </div>

        {/* Pending approvals grouped by type */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold font-serif" style={{ color: DARK_BLUE }}>
              Demann an atant{pending.length > 0 ? ` (${pending.length})` : ""}
            </h2>
          </div>

          {isLoading ? (
            <Card><CardContent className="p-8 text-center text-slate-500">Ap chaje...</CardContent></Card>
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                Pa gen demann an atant.
              </CardContent>
            </Card>
          ) : (
            PENDING_SECTIONS.map(({ type, label, icon: Icon, color }) => {
              const items = pending.filter((tx) => tx.type === type);
              if (items.length === 0) return null;
              return (
                <Card key={type}>
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="font-semibold text-slate-800 text-sm">{label}</span>
                      <Badge variant="outline" className="ml-1 text-[10px]">{items.length}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lè</TableHead>
                          <TableHead>Kliyan / Detay</TableHead>
                          <TableHead className="text-right">Montan</TableHead>
                          <TableHead className="text-right">Aksyon</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-slate-500">
                              {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-slate-900">{tx.description}</p>
                              <p className="text-xs text-slate-500 font-mono">
                                {tx.senderAccount ? `Ekspeditè: ${tx.senderAccount}` : `Itilizatè: ${tx.userId}`}
                                {tx.recipientAccount ? ` → ${tx.recipientAccount}` : ""}
                              </p>
                            </TableCell>
                            <TableCell className="text-right font-medium font-mono">
                              G {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                  onClick={() => handleAction(tx.id, "reject")}
                                  disabled={busy}
                                >
                                  Rejte
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleAction(tx.id, "approve")}
                                  disabled={busy}
                                >
                                  Apwouve
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Full ledger */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold font-serif" style={{ color: DARK_BLUE }}>Gran Liv Global</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lè</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Kont/Deskripsyon</TableHead>
                    <TableHead>Estati</TableHead>
                    <TableHead className="text-right">Montan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center p-8">Ap chaje...</TableCell></TableRow>
                  ) : (
                    transactions?.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-slate-500">
                          {format(new Date(tx.createdAt), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-[10px]">{translateType(tx.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{tx.description}</p>
                          <p className="text-xs text-slate-500 font-mono">
                            {tx.senderAccount ? `Ekspeditè: ${tx.senderAccount}` : tx.recipientAccount ? `Destinatè: ${tx.recipientAccount}` : `Itilizatè: ${tx.userId}`}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            tx.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            tx.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }>{translateStatus(tx.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium font-mono">
                          G {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
