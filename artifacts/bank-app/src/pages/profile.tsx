import { AppLayout } from "@/components/layout";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { data: profile } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateMe.mutate(
      { data: { firstName, lastName, phone } },
      {
        onSuccess: () => {
          toast({ title: "Profile Updated" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-serif text-slate-900 tracking-tight">Profile Settings</h1>
          <p className="text-slate-500 mt-1">Manage your personal information.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Update your contact information.</CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdate}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-slate-50 text-slate-500" />
                <p className="text-xs text-slate-500">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </CardContent>
            <div className="p-6 bg-slate-50 border-t rounded-b-xl flex justify-end">
              <Button type="submit" disabled={updateMe.isPending}>Save Changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}
