import { AppLayout } from "@/components/layout";
import { useTransfer, useGetKane, getGetKaneQueryKey, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";

export default function SendPage() {
  const { data: kane } = useGetKane();
  const transfer = useTransfer();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !recipient) return;

    transfer.mutate(
      { data: { amount: Number(amount), recipientAccount: recipient, description } },
      {
        onSuccess: () => {
          toast({ title: "Transfè Reyisi", description: `Voye G ${amount} bay ${recipient}` });
          setAmount("");
          setRecipient("");
          setDescription("");
          queryClient.invalidateQueries({ queryKey: getGetKaneQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Transfè Echwe", description: err.message || "Yon bagay mal pase", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Voye Lajan</h1>
          <p className="text-slate-500 mt-1">Voye lajan an sekirite nan yon lòt kont Pyram Sterling Bank.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Detay Transfè</CardTitle>
              <CardDescription>Balans disponib: G {kane?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</CardDescription>
            </CardHeader>
            <form onSubmit={handleTransfer}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Montan (HTG)</Label>
                  <Input 
                    id="amount" 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Nimewo Kont Destinatè</Label>
                  <Input 
                    id="recipient" 
                    placeholder="eks: PSB1000000002" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsyon (Opsyonèl)</Label>
                  <Input 
                    id="description" 
                    placeholder="eks: Ranbousman dine" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium bg-amber-500 hover:bg-amber-600 text-slate-950"
                  disabled={transfer.isPending || !amount || !recipient}
                >
                  {transfer.isPending ? "Ap trete..." : (
                    <>
                      <SendIcon className="w-5 h-5 mr-2" />
                      Voye Transfè
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          <div className="space-y-4">
            <Card className="bg-slate-50 border-none shadow-none">
              <CardContent className="p-6 text-sm text-slate-600 space-y-4">
                <h4 className="font-semibold text-slate-900">Limit Transfè</h4>
                <p>Kont estanda ka transfere jiska G 50,000 pa jou.</p>
                <h4 className="font-semibold text-slate-900 pt-2">Sekirite</h4>
                <p>Tout transfè yo chifre epi surveye pou aktivite fwodè.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
