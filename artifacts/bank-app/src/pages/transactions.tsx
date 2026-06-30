import { AppLayout } from "@/components/layout";
import { useListTransactions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Repeat, Landmark, ArrowRight, Filter } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
  const [filter, setFilter] = useState<string>("all");
  const { data: transactions, isLoading } = useListTransactions(
    filter !== "all" ? { type: filter as any } : {}
  );

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Transactions</h1>
            <p className="text-slate-500 mt-1">Your complete transaction history.</p>
          </div>
          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">All</Button>
            <Button variant={filter === "deposit" ? "default" : "outline"} onClick={() => setFilter("deposit")} size="sm">Deposits</Button>
            <Button variant={filter === "withdrawal" ? "default" : "outline"} onClick={() => setFilter("withdrawal")} size="sm">Withdrawals</Button>
            <Button variant={filter === "transfer" ? "default" : "outline"} onClick={() => setFilter("transfer")} size="sm">Transfers</Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-slate-100 p-6 space-y-4">
                {[...Array(6)].map((_, i) => (
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
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <Filter className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-lg font-medium text-slate-900">No transactions found</p>
                <p>Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions?.map((tx) => (
                  <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      {['deposit', 'loan_disbursement'].includes(tx.type) ? (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><ArrowDownRight className="w-6 h-6" /></div>
                      ) : ['withdrawal', 'partner_payment'].includes(tx.type) ? (
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><ArrowUpRight className="w-6 h-6" /></div>
                      ) : tx.type === 'transfer' ? (
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Repeat className="w-6 h-6" /></div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center"><Landmark className="w-6 h-6" /></div>
                      )}
                      
                      <div>
                        <p className="font-medium text-slate-900 text-lg">{tx.description || tx.type.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-500">{format(new Date(tx.createdAt), "MMMM d, yyyy 'at' h:mm a")}</p>
                        {(tx.recipientAccount || tx.senderAccount) && (
                          <p className="text-xs text-slate-400 mt-1">
                            {tx.recipientAccount ? `To: ${tx.recipientAccount}` : `From: ${tx.senderAccount}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`text-xl font-medium ${['deposit', 'loan_disbursement'].includes(tx.type) ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {['deposit', 'loan_disbursement'].includes(tx.type) ? '+' : '-'}G {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
