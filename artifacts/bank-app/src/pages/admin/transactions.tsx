import { AppLayout } from "@/components/layout";
import { useAdminListTransactions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading } = useAdminListTransactions({ limit: 100 });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Global Ledger</h1>
          <p className="text-slate-500 mt-1">Real-time monitoring of all bank transactions.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Account/Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center p-8">Loading...</TableCell></TableRow>
                ) : (
                  transactions?.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-slate-500">
                        {format(new Date(tx.createdAt), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">{tx.type.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {tx.senderAccount ? `From: ${tx.senderAccount}` : tx.recipientAccount ? `To: ${tx.recipientAccount}` : `User: ${tx.userId}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          tx.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          tx.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }>{tx.status}</Badge>
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
