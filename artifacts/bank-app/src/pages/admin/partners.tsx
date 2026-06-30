import { AppLayout } from "@/components/layout";
import { useListPartners, useAdminApprovePartner, useAdminRejectPartner, getListPartnersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "An atant",
    approved: "Apwouve",
    rejected: "Rejte",
  };
  return map[status] ?? status;
}

export default function AdminPartnersPage() {
  const { data: partners, isLoading } = useListPartners();
  const approve = useAdminApprovePartner();
  const reject = useAdminRejectPartner();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAction = (id: number, action: 'approve' | 'reject') => {
    const mutator = action === 'approve' ? approve : reject;
    mutator.mutate(
      { partnerId: id },
      {
        onSuccess: () => {
          toast({ title: action === 'approve' ? 'Patnè apwouve avèk siksè' : 'Patnè rejte avèk siksè' });
          queryClient.invalidateQueries({ queryKey: getListPartnersQueryKey() });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Aplikasyon Patnè</h1>
          <p className="text-slate-500 mt-1">Revize aplikasyon patnè marchann yo.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Non Biznis</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Deskripsyon</TableHead>
                  <TableHead>Estati</TableHead>
                  <TableHead className="text-right">Aksyon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center p-8">Ap chaje...</TableCell></TableRow>
                ) : (
                  partners?.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.businessName}</TableCell>
                      <TableCell>{partner.businessType}</TableCell>
                      <TableCell className="max-w-xs truncate">{partner.description}</TableCell>
                      <TableCell>
                        <Badge className={
                          partner.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          partner.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }>{translateStatus(partner.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {partner.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-rose-600 border-rose-200" onClick={() => handleAction(partner.id, 'reject')} disabled={reject.isPending || approve.isPending}>Rejte</Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(partner.id, 'approve')} disabled={reject.isPending || approve.isPending}>Apwouve</Button>
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
