import { useState } from "react";
import {
  useAdminListApplications,
  useAdminApproveApplication,
  useAdminRejectApplication,
  getAdminListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layout";
import { CheckCircle2, XCircle, Clock, User, Phone, CreditCard, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

function statusBadge(status: string) {
  switch (status) {
    case "pending": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">An atant</Badge>;
    case "approved": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Apwouve</Badge>;
    case "rejected": return <Badge className="bg-rose-100 text-rose-700 border-rose-200">Rejte</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function ApplicationCard({ app }: { app: any }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const approve = useAdminApproveApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListApplicationsQueryKey() });
        toast({ title: "Apwouve!", description: `Kont ${app.firstName} ${app.lastName} kreye avèk siksè.` });
        setAction(null);
      },
      onError: (err: any) => {
        toast({ title: "Erè", description: err?.message ?? "Iespere eseye ankò.", variant: "destructive" });
      },
    },
  });

  const reject = useAdminRejectApplication({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminListApplicationsQueryKey() });
        toast({ title: "Rejte", description: `Aplikasyon ${app.firstName} ${app.lastName} rejte.` });
        setAction(null);
      },
      onError: (err: any) => {
        toast({ title: "Erè", description: err?.message ?? "Iespere eseye ankò.", variant: "destructive" });
      },
    },
  });

  const hasAccount = !!app.userId;

  return (
    <Card className={`border ${app.status === "pending" ? "border-amber-200 bg-amber-50/30" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-slate-900">{app.firstName} {app.lastName}</p>
                {statusBadge(app.status)}
                {!hasAccount && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-500">Pako konekte</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{app.phone}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1"><CreditCard className="w-3 h-3" />ID: {app.nationalId}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" />Randevou: {app.appointmentDate} a {app.appointmentTime}</p>
              </div>
              <p className="text-xs text-slate-400 mt-1">Soumèt: {format(new Date(app.createdAt), "MMM d, yyyy")}</p>
              {app.userInfo?.email && (
                <p className="text-xs text-blue-600 mt-1">Kont: {app.userInfo.email}</p>
              )}
              {app.notes && (
                <p className="text-xs text-slate-600 mt-1 italic">Nòt: {app.notes}</p>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded((e) => !e)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {expanded && app.status === "pending" && (
          <div className="mt-4 border-t border-slate-200 pt-4 space-y-3">
            {!hasAccount && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Itilizatè a pako kreye kont sou aplikasyon an. Mande kliyan an konekte premye.
              </div>
            )}
            {action === "reject" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rezon Rejeksyon (opsyonèl):</label>
                <Textarea
                  placeholder="Eksplike rezon rejeksyon an..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}
            {action === "approve" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nòt (opsyonèl):</label>
                <Textarea
                  placeholder="Ajoute yon nòt..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            )}
            <div className="flex gap-3">
              {action === null && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setAction("approve")}
                    disabled={!hasAccount}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Apwouve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 text-rose-600 hover:bg-rose-50"
                    onClick={() => setAction("reject")}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rejte
                  </Button>
                </>
              )}
              {action === "approve" && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => approve.mutate({ id: app.id, data: { notes: notes || undefined } })}
                    disabled={approve.isPending}
                  >
                    {approve.isPending ? "..." : "Konfime Apwobasyon"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Anile</Button>
                </>
              )}
              {action === "reject" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-300 text-rose-600 hover:bg-rose-50"
                    onClick={() => reject.mutate({ id: app.id, data: { notes: notes || undefined } })}
                    disabled={reject.isPending}
                  >
                    {reject.isPending ? "..." : "Konfime Rejeksyon"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Anile</Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminApplicationsPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const { data: apps = [], isLoading } = useAdminListApplications();

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Aplikasyon Kont</h1>
          <p className="text-slate-500 mt-1">Revize ak jere aplikasyon ouvèti kont.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(["pending", "all", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {f === "pending" ? `An atant${pendingCount > 0 ? ` (${pendingCount})` : ""}` : f === "all" ? `Tout (${apps.length})` : f === "approved" ? "Apwouve" : "Rejte"}
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
              <p className="font-medium">Pa gen aplikasyon{filter !== "all" ? ` ${filter === "pending" ? "an atant" : filter === "approved" ? "apwouve" : "rejte"}` : ""}.</p>
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
