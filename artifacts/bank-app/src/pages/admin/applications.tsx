import { useState } from "react";
import {
  useAdminListApplications,
  useAdminConfirmApplication,
  useAdminRescheduleApplication,
  useAdminCompleteApplication,
  useAdminRejectApplication,
  getAdminListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout";
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  BadgeCheck,
} from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">An atant</Badge>;
    case "confirmed":
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Konfime</Badge>;
    case "rescheduled":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Chanje</Badge>;
    case "rejected":
      return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Rejte</Badge>;
    case "completed":
    case "approved":
      return <Badge className="bg-slate-200 text-slate-700 border-slate-300">Konplete</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function ApplicationCard({ app }: { app: any }) {
  const [expanded, setExpanded] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState(app.appointmentDate ?? "");
  const [newTime, setNewTime] = useState(app.appointmentTime ?? "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getAdminListApplicationsQueryKey() });

  const onError = (err: any) =>
    toast({
      title: "Erè",
      description: err?.response?.data?.error ?? err?.message ?? "Tanpri eseye ankò.",
      variant: "destructive",
    });

  const confirm = useAdminConfirmApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Randevou konfime", description: `Randevou ${app.firstName} ${app.lastName} konfime.` });
      },
      onError,
    },
  });

  const reschedule = useAdminRescheduleApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Randevou chanje", description: "Nouvo dat ak lè anrejistre." });
        setRescheduleOpen(false);
      },
      onError,
    },
  });

  const complete = useAdminCompleteApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Konplete!", description: `Kont ${app.firstName} ${app.lastName} kreye avèk siksè.` });
      },
      onError,
    },
  });

  const reject = useAdminRejectApplication({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Rejte", description: `Randevou ${app.firstName} ${app.lastName} rejte.` });
        setRejectOpen(false);
      },
      onError,
    },
  });

  const hasAccount = !!app.userId;
  const isOpen = app.status !== "completed" && app.status !== "approved" && app.status !== "rejected";
  const anyPending = confirm.isPending || reschedule.isPending || complete.isPending || reject.isPending;

  return (
    <>
      <Card className={`border ${app.status === "pending" ? "border-amber-200 bg-amber-50/30" : ""}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900">
                    {app.firstName} {app.lastName}
                  </p>
                  {statusBadge(app.status)}
                  {!hasAccount && (
                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">
                      Pako konekte
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {app.phone}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    ID: {app.nationalId}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Randevou: {app.appointmentDate} a {app.appointmentTime}
                  </p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Soumèt: {format(new Date(app.createdAt), "MMM d, yyyy")}
                </p>
                {app.userInfo?.email && (
                  <p className="text-xs text-blue-600 mt-1">Kont: {app.userInfo.email}</p>
                )}
                {app.notes && <p className="text-xs text-slate-600 mt-1 italic">Nòt: {app.notes}</p>}
                {app.rejectionReason && (
                  <p className="text-xs text-rose-600 mt-1 italic">Rezon rejeksyon: {app.rejectionReason}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {expanded && isOpen && (
            <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
              {!hasAccount && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Itilizatè a pako kreye kont sou aplikasyon an. Ou ka konfime oswa chanje randevou a, men ou dwe
                  mande kliyan an konekte anvan ou konplete randevou a pou kreye kont bankè a.
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(app.status === "pending" || app.status === "rescheduled") && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => confirm.mutate({ id: app.id, data: {} })}
                    disabled={anyPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Aksepte
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    setNewDate(app.appointmentDate ?? "");
                    setNewTime(app.appointmentTime ?? "");
                    setRescheduleOpen(true);
                  }}
                  disabled={anyPending}
                >
                  <CalendarClock className="w-4 h-4 mr-1" />
                  Chanje Randevou
                </Button>
                {(app.status === "confirmed" || app.status === "rescheduled") && (
                  <Button
                    size="sm"
                    className="bg-slate-800 hover:bg-slate-900 text-white"
                    onClick={() => complete.mutate({ id: app.id, data: {} })}
                    disabled={anyPending || !hasAccount}
                    title={!hasAccount ? "Kliyan an dwe konekte anvan" : "Konplete e kreye kont"}
                  >
                    <BadgeCheck className="w-4 h-4 mr-1" />
                    Konplete e Kreye Kont
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-300 text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    setReason("");
                    setRejectOpen(true);
                  }}
                  disabled={anyPending}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Rejte
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejte Randevou</DialogTitle>
            <DialogDescription>
              Ou pral rejte randevou {app.firstName} {app.lastName}. Kliyan an ap resevwa yon notifikasyon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rezon rejeksyon (opsyonèl)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Eksplike rezon rejeksyon an..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Anile
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => reject.mutate({ id: app.id, data: { reason: reason || undefined } })}
              disabled={reject.isPending}
            >
              {reject.isPending ? "..." : "Konfime Rejeksyon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chanje Randevou</DialogTitle>
            <DialogDescription>
              Chwazi yon nouvo dat ak lè pou randevou {app.firstName} {app.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">Nouvo dat</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-time">Nouvo lè</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>
              Anile
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() =>
                reschedule.mutate({
                  id: app.id,
                  data: { appointmentDate: newDate, appointmentTime: newTime },
                })
              }
              disabled={reschedule.isPending || !newDate || !newTime}
            >
              {reschedule.isPending ? "..." : "Anrejistre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "rescheduled" | "completed" | "rejected">(
    "pending",
  );
  const { data: apps = [], isLoading } = useAdminListApplications();

  const isCompleted = (s: string) => s === "completed" || s === "approved";
  const filtered =
    filter === "all"
      ? apps
      : filter === "completed"
        ? apps.filter((a) => isCompleted(a.status))
        : apps.filter((a) => a.status === filter);
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  const filterLabel: Record<string, string> = {
    pending: "an atant",
    confirmed: "konfime",
    rescheduled: "chanje",
    completed: "konplete",
    rejected: "rejte",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Jesyon Randevou</h1>
          <p className="text-slate-500 mt-1">Revize, konfime, chanje oswa konplete randevou ouvèti kont.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["pending", "confirmed", "rescheduled", "completed", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {f === "pending"
                ? `An atant${pendingCount > 0 ? ` (${pendingCount})` : ""}`
                : f === "all"
                  ? `Tout (${apps.length})`
                  : f === "confirmed"
                    ? "Konfime"
                    : f === "rescheduled"
                      ? "Chanje"
                      : f === "completed"
                        ? "Konplete"
                        : "Rejte"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="font-medium">
                Pa gen randevou{filter !== "all" ? ` ${filterLabel[filter]}` : ""}.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
