import { AppLayout } from "@/components/layout";
import { useAdminListUsers, useAdminUpdateCreditScore, getAdminListUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminUsersPage() {
  const { data: users, isLoading } = useAdminListUsers();
  const updateScore = useAdminUpdateCreditScore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newScore, setNewScore] = useState("");

  const handleUpdateScore = (userId: string) => {
    if (!newScore) return;
    updateScore.mutate(
      { userId, data: { creditScore: Number(newScore) } },
      {
        onSuccess: () => {
          toast({ title: "Credit Score Updated" });
          setNewScore("");
          queryClient.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 mt-1">View and manage all bank customers.</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Credit Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center p-8">Loading...</TableCell></TableRow>
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="font-mono text-xs">{user.kane?.accountNumber}</TableCell>
                      <TableCell className="text-right font-medium">
                        G {user.kane?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (user.kane?.creditScore || 0) >= 700 ? 'bg-emerald-100 text-emerald-800' :
                          (user.kane?.creditScore || 0) >= 600 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {user.kane?.creditScore || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">Edit Score</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Credit Score</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-end gap-4 pt-4">
                              <div className="flex-1 space-y-2">
                                <Input type="number" min="300" max="850" value={newScore} onChange={(e) => setNewScore(e.target.value)} placeholder="300-850" />
                              </div>
                              <Button onClick={() => handleUpdateScore(user.clerkId)} disabled={updateScore.isPending}>Save</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
