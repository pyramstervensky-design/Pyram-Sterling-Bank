import { AppLayout } from "@/components/layout";
import { useListPartners, useGetMyPartner, useApplyPartner, usePayPartner, getListPartnersQueryKey, getGetMyPartnerQueryKey, getGetKaneQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function PartnersPage() {
  const { data: partners, isLoading: partnersLoading } = useListPartners();
  const { data: myPartner, isLoading: myPartnerLoading } = useGetMyPartner();
  
  const applyPartner = useApplyPartner();
  const payPartner = usePayPartner();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  
  const [payAmount, setPayAmount] = useState("");
  const [payDescription, setPayDescription] = useState("");

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    applyPartner.mutate(
      { data: { businessName, businessType, description } },
      {
        onSuccess: () => {
          toast({ title: "Application Submitted", description: "Your partner application is under review." });
          queryClient.invalidateQueries({ queryKey: getGetMyPartnerQueryKey() });
        },
      }
    );
  };

  const handlePay = (partnerId: number) => {
    if (!payAmount) return;
    payPartner.mutate(
      { partnerId, data: { amount: Number(payAmount), description: payDescription } },
      {
        onSuccess: () => {
          toast({ title: "Payment Successful", description: `Paid G ${payAmount}` });
          setPayAmount("");
          setPayDescription("");
          queryClient.invalidateQueries({ queryKey: getGetKaneQueryKey() });
        },
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Partner Network</h1>
          <p className="text-slate-500 mt-1">Discover approved merchants and manage your partner status.</p>
        </div>

        {/* My Partner Status */}
        <Card className="bg-slate-900 text-white border-none">
          <CardHeader>
            <CardTitle className="font-serif text-amber-500">Merchant Portal</CardTitle>
            <CardDescription className="text-slate-400">Become a Pyram Sterling Bank verified partner to accept payments directly.</CardDescription>
          </CardHeader>
          <CardContent>
            {!myPartnerLoading && !myPartner && (
              <form onSubmit={handleApply} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label className="text-slate-300">Business Name</Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Business Type</Label>
                  <Input value={businessType} onChange={(e) => setBusinessType(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <Button type="submit" className="bg-amber-500 text-slate-950 hover:bg-amber-600" disabled={applyPartner.isPending}>Apply for Partnership</Button>
              </form>
            )}
            
            {myPartner && (
              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">{myPartner.businessName}</h3>
                  <Badge className={
                    myPartner.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 
                    myPartner.status === 'rejected' ? 'bg-rose-500/20 text-rose-400' : 
                    'bg-amber-500/20 text-amber-400'
                  }>{myPartner.status.toUpperCase()}</Badge>
                </div>
                <p className="text-slate-400 mb-2">{myPartner.businessType}</p>
                {myPartner.status === 'approved' && (
                  <p className="text-sm font-mono text-emerald-400 mt-4 bg-slate-950 p-3 rounded">Merchant Account: {myPartner.accountNumber}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Directory */}
        <h2 className="text-2xl font-serif text-slate-900 pt-8">Verified Partners</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partnersLoading ? (
             <Card><CardContent className="p-8"><div className="h-8 bg-slate-200 animate-pulse rounded w-1/3 mb-4" /></CardContent></Card>
          ) : partners?.map(partner => (
            <Card key={partner.id}>
              <CardHeader>
                <CardTitle>{partner.businessName}</CardTitle>
                <CardDescription>{partner.businessType}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{partner.description}</p>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">Pay Partner</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Pay {partner.businessName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Amount (HTG)</Label>
                        <Input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input value={payDescription} onChange={(e) => setPayDescription(e.target.value)} />
                      </div>
                      <Button onClick={() => handlePay(partner.id)} className="w-full" disabled={!payAmount || payPartner.isPending}>
                        Send Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
