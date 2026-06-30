import { AppLayout } from "@/components/layout";
import { useAdminListLoans, useAdminApproveLoan, useAdminRejectLoan, getAdminListLoansQueryKey, getAdminGetStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "An atant",
    approved: "Apwouve",
    rejected: "Rejte",
    repaid: "Ranbouse",
  };
  return map[status] ?? status;
}

export default function AdminLoansPage() {
  const { data: loans, isLoading } = useAdminListLoans();
  const approveLoan = useAdminApproveLoan();
  const rejectLoan = useAdminRejectLoan();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutator = action === 'approve' ? approveLoan : rejectLoan;
    mutator.mutate(
      { loanId: id },
      {
        onSuccess: () => {
          toast({ title: action === 'approve' ? 'Prè apwouve avèk siksè' : 'Prè rejte avèk siksè' });
          queryClient.invalidateQueries({ queryKey: getAdminListLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Apwobasyon Prè</h1>
          <p className="text-slate-500 mt-1">Revize epi jere demann prè kliyan yo.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dat</TableHead>
                  <TableHead>Kliyan</TableHead>
                  <TableHead>Bi</TableHead>
                  <TableHead className="text-right">Montan</TableHead>
                  <TableHead>Estati</TableHead>
                  <TableHead className="text-right">Aksyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center p-8">Ap chaje...</TableCell></TableRow>
                ) : (
                  loans?.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="text-sm text-slate-500">{format(new Date(loan.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <p className="font-medium">{loan.userName}</p>
                        <p className="text-xs text-slate-500">{loan.userEmail}</p>
                      </TableCell>
                      <TableCell>{loan.purpose}</TableCell>
                      <TableCell className="text-right font-medium">
                        G {loan.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          loan.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          loan.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          loan.status === 'repaid' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }>{translateStatus(loan.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {loan.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleAction(loan.id, 'reject')} disabled={rejectLoan.isPending || approveLoan.isPending}>Rejte</Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(loan.id, 'approve')} disabled={rejectLoan.isPending || approveLoan.isPending}>Apwouve</Button>
                          </div>
                        )}
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
