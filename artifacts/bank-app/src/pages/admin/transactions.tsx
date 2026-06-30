import { AppLayout } from "@/components/layout";
import { useAdminListTransactions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    completed: "Konplete",
    pending: "An atant",
    failed: "Echwe",
  };
  return map[status] ?? status;
}

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useAdminListTransactions({ limit: 100 });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Gran Liv Global</h1>
          <p className="text-slate-500 mt-1">Siveyans an tan reyèl tout tranzaksyon bank yo.</p>
        </div>

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
                          {tx.senderAccount ? `Expéditè: ${tx.senderAccount}` : tx.recipientAccount ? `Destinatè: ${tx.recipientAccount}` : `Itilizatè: ${tx.userId}`}
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
    </AppLayout>
  );
}
