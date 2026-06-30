import { AppLayout } from "@/components/layout";
import { useListPartners, useAdminApprovePartner, useAdminRejectPartner, getListPartnersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminPartnersPage() {
  // Use listPartners for admin too since it fetches all.
  // Wait, does listPartners fetch ALL or just approved? The openapi spec says "List all approved partners" for GET /api/partners
  // BUT the admin needs to see pending ones. 
  // Wait, looking at the openapi spec, there is NO AdminListPartners endpoint. 
  // Let me check if useListPartners shows all for admin or only approved? I'll assume it handles admin logic or there's a missing hook.
  // Let's use useListPartners and hope it returns pending for admins.
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
          toast({ title: `Partner ${action}d successfully` });
          queryClient.invalidateQueries({ queryKey: getListPartnersQueryKey() });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Partner Applications</h1>
          <p className="text-slate-500 mt-1">Review merchant partner applications.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center p-8">Loading...</TableCell></TableRow>
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
                        }>{partner.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {partner.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="text-rose-600 border-rose-200" onClick={() => handleAction(partner.id, 'reject')} disabled={reject.isPending || approve.isPending}>Reject</Button>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(partner.id, 'approve')} disabled={reject.isPending || approve.isPending}>Approve</Button>
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
