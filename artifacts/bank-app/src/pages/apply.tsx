import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import {
  useSubmitApplication,
  useGetMyApplication,
  getGetMyApplicationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Clock, XCircle, ChevronLeft, Landmark, Shield, CreditCard } from "lucide-react";
import { AppLayout } from "@/components/layout";

type FormData = {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  appointmentDate: string;
  appointmentTime: string;
  agreedToFee: boolean;
};

export default function ApplyPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myApp, isLoading: appLoading } = useGetMyApplication({ query: { retry: false } as any });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>();
  const agreedToFee = watch("agreedToFee");

  const submit = useSubmitApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyApplicationQueryKey() });
        toast({ title: "Aplikasyon soumèt!", description: "Nou pral revize aplikasyon ou an." });
      },
      onError: (err: any) => {
        toast({ title: "Erè", description: err?.message ?? "Iespere eseye ankò.", variant: "destructive" });
      },
    },
  });

  async function onSubmit(data: FormData) {
    submit.mutate({ data: { firstName: data.firstName, lastName: data.lastName, phone: data.phone, nationalId: data.nationalId, appointmentDate: data.appointmentDate, appointmentTime: data.appointmentTime } });
  }

  if (appLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      </AppLayout>
    );
  }

  if (myApp && myApp.status === "approved") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-serif text-slate-900 mb-3">Kont ou aktive!</h1>
          <p className="text-slate-500 mb-8">Aplikasyon ou an apwouve. Kont Pyram Sterling Bank ou a aktif kounye a.</p>
          <Button asChild><Link href="/dashboard">Al nan Tablo de bò</Link></Button>
        </div>
      </AppLayout>
    );
  }

  if (myApp && myApp.status === "pending") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-serif text-slate-900 mb-3">Aplikasyon an Atant</h1>
          <p className="text-slate-500 mb-4">
            Aplikasyon ou an soumèt avèk siksè. Nou ap revize enfòmasyon ou yo.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-8">
            <p className="text-sm font-semibold text-amber-800 mb-1">Randevou ou:</p>
            <p className="text-sm text-amber-700">{myApp.appointmentDate} a {myApp.appointmentTime}</p>
            <p className="text-xs text-amber-600 mt-2">
              Tanpri parèt nan bank la ak yon ID nasyonal valid ak frè ouvèti kont (500 HTG) an lajan kach.
            </p>
          </div>
          <p className="text-xs text-slate-400">Yo pral kontakte ou apre randevou ou an.</p>
        </div>
      </AppLayout>
    );
  }

  if (myApp && myApp.status === "rejected") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-rose-600" />
          </div>
          <h1 className="text-2xl font-serif text-slate-900 mb-3">Aplikasyon Rejte</h1>
          <p className="text-slate-500 mb-4">
            Nou regret enfòme ou ke aplikasyon ou an pa te apwouve.
            {myApp.notes && <span className="block mt-2 text-slate-600">Rezon: {myApp.notes}</span>}
          </p>
          <p className="text-sm text-slate-400 mb-8">Kontakte nou pou plis enfòmasyon.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Retounen nan Tablo de bò
          </Link>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Ouvè yon Kont (Kanè)</h1>
          <p className="text-slate-500 mt-2">Ranpli fòm sa a pou aplike pou yon kont Pyram Sterling Bank.</p>
        </div>

        {/* Fee Info */}
        <div className="bg-slate-900 text-white rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <Landmark className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <p className="font-semibold text-lg">Frè Ouvèti Kont</p>
              <p className="text-amber-400 text-2xl font-light">500 HTG</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-4">
              <Shield className="w-5 h-5 text-amber-400 mb-2" />
              <p className="text-sm font-medium">250 HTG</p>
              <p className="text-xs text-slate-400 mt-1">Pou kreye kont Kanè ou ak Kat Pyram Sterling Bank</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <CreditCard className="w-5 h-5 text-emerald-400 mb-2" />
              <p className="text-sm font-medium">250 HTG</p>
              <p className="text-xs text-slate-400 mt-1">Depoze kòm balans inisyal nan kont ou apre apwobasyon</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Enfòmasyon Pèsonèl</CardTitle>
            <CardDescription>Antre enfòmasyon ou ki kòrèk epi aktyèl.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenon *</Label>
                  <Input
                    id="firstName"
                    placeholder="Prenon ou"
                    {...register("firstName", { required: "Prenon obligatwa" })}
                  />
                  {errors.firstName && <p className="text-xs text-rose-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Siyati *</Label>
                  <Input
                    id="lastName"
                    placeholder="Siyati ou"
                    {...register("lastName", { required: "Siyati obligatwa" })}
                  />
                  {errors.lastName && <p className="text-xs text-rose-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Nimewo Telefòn *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+509 xxxx-xxxx"
                  {...register("phone", { required: "Nimewo telefòn obligatwa" })}
                />
                {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationalId">Nimewo ID Nasyonal Ayisyen *</Label>
                <Input
                  id="nationalId"
                  placeholder="Nimewo ID nasyonal ou"
                  {...register("nationalId", { required: "Nimewo ID nasyonal obligatwa" })}
                />
                {errors.nationalId && <p className="text-xs text-rose-500">{errors.nationalId.message}</p>}
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h3 className="font-semibold text-slate-900 mb-4 font-serif">Randevou</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Chwazi dat ak lè pou vini nan bank la pou verifikasyon idantite ou ak pèman frè ouvèti kont la.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointmentDate">Dat Randevou *</Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      {...register("appointmentDate", { required: "Dat randevou obligatwa" })}
                    />
                    {errors.appointmentDate && <p className="text-xs text-rose-500">{errors.appointmentDate.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointmentTime">Lè Randevou *</Label>
                    <Input
                      id="appointmentTime"
                      type="time"
                      {...register("appointmentTime", { required: "Lè randevou obligatwa" })}
                    />
                    {errors.appointmentTime && <p className="text-xs text-rose-500">{errors.appointmentTime.message}</p>}
                  </div>
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 accent-amber-600"
                    {...register("agreedToFee", { required: true })}
                  />
                  <span className="text-sm text-amber-800 font-medium">
                    Mwen dakò pou peye frè ouvèti kont 500 HTG la lè mwen prezante nan bank la pou randevou mwen an.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                disabled={!agreedToFee || isSubmitting || submit.isPending}
              >
                {submit.isPending ? "Soumèt..." : "Soumèt Aplikasyon"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
