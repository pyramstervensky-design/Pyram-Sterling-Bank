import { AppLayout } from "@/components/layout";
import { useListMyLoans, useRequestLoan, useRepayLoan, getListMyLoansQueryKey, getGetKaneQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LoansPage() {
  const { data: loans, isLoading } = useListMyLoans();
  const requestLoan = useRequestLoan();
  const repayLoan = useRepayLoan();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !purpose) return;

    requestLoan.mutate(
      { data: { amount: Number(amount), purpose } },
      {
        onSuccess: () => {
          toast({ title: "Loan Requested", description: `Requested $${amount}` });
          setAmount("");
          setPurpose("");
          queryClient.invalidateQueries({ queryKey: getListMyLoansQueryKey() });
        },
      }
    );
  };

  const handleRepay = (loanId: number) => {
    if (!repayAmount) return;
    repayLoan.mutate(
      { loanId, data: { amount: Number(repayAmount) } },
      {
        onSuccess: () => {
          toast({ title: "Repayment Successful", description: `Paid $${repayAmount}` });
          setRepayAmount("");
          queryClient.invalidateQueries({ queryKey: getListMyLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetKaneQueryKey() });
        },
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
      case 'rejected': return "bg-rose-100 text-rose-800 hover:bg-rose-100";
      case 'pending': return "bg-amber-100 text-amber-800 hover:bg-amber-100";
      case 'repaid': return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Loans & Credit</h1>
            <p className="text-slate-500 mt-1">Manage your active loans and request new lines of credit.</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-medium">Request New Loan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Loan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRequest} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Amount (USD)</Label>
                  <Input type="number" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={5} />
                </div>
                <Button type="submit" className="w-full" disabled={requestLoan.isPending}>
                  Submit Request
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <Card><CardContent className="p-8"><div className="h-8 bg-slate-200 animate-pulse rounded w-1/3 mb-4" /><div className="h-4 bg-slate-200 animate-pulse rounded w-1/4" /></CardContent></Card>
          ) : loans?.length === 0 ? (
            <Card className="bg-slate-50 border-dashed border-2">
              <CardContent className="p-12 text-center text-slate-500">
                You have no loan history.
              </CardContent>
            </Card>
          ) : (
            loans?.map((loan) => (
              <Card key={loan.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 border-b pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-serif">${loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</CardTitle>
                    <CardDescription>{loan.purpose}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(loan.status)}>{loan.status}</Badge>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Repaid</p>
                      <p className="font-medium text-lg">${loan.amountRepaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Remaining Balance</p>
                      <p className="font-medium text-lg text-slate-900">${(loan.amount - loan.amountRepaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  
                  {loan.status === 'approved' && loan.amountRepaid < loan.amount && (
                    <div className="flex items-end gap-4 bg-slate-50 p-4 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Label>Make a Repayment</Label>
                        <Input 
                          type="number" 
                          max={loan.amount - loan.amountRepaid} 
                          value={repayAmount} 
                          onChange={(e) => setRepayAmount(e.target.value)} 
                          placeholder="Amount"
                        />
                      </div>
                      <Button onClick={() => handleRepay(loan.id)} disabled={!repayAmount || repayLoan.isPending}>
                        Pay Now
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
