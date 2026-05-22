import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { isBrowser } from "@/lib/apiBase";
import { userService } from "@/services/userService";
import { useAuthStore } from "@/store/auth";
import { isAdminRole } from "@/services/authService";
import { cn } from "@/lib/utils";

const schema = z.object({
  username: z.string().trim().min(2, "Username required"),
  password: z.string().min(4, "Min 4 characters"),
});

type FormValues = z.infer<typeof schema>;

export function AddUserDialog() {
  const qc = useQueryClient();
  const authUserId = useAuthStore((s) => s.user?.id);
  const [open, setOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });
  const { data: users = [], refetch, isFetching } = useQuery({
    queryKey: ["admin-users"],
    queryFn: userService.list,
    enabled: open && isBrowser,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: async () => {
      toast.success("User removed");
      setConfirmDeleteId(null);
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete user"),
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const user = await userService.create({
        username: values.username,
        password: values.password,
      });
      toast.success(`User "${user.username}" created. Password: ${values.password}`);
      form.reset();
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="hidden lg:inline-flex">
            <UserPlus className="mr-2 h-4 w-4" />
            Users
          </Button>
        </DialogTrigger>
        <DialogContent className="gap-0 sm:max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold">Manage users</DialogTitle>
            <DialogDescription className="text-sm leading-snug">
              Create accounts with username and password. You can remove anyone except yourself.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 border-b pb-4">
            <div className="grid gap-2">
              <Label htmlFor="new-username" className="text-sm font-medium">
                Username
              </Label>
              <Input id="new-username" autoComplete="off" {...form.register("username")} className="h-10 text-sm" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                Password
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                {...form.register("password")}
                className="h-10 text-sm"
              />
            </div>
            <DialogFooter className="pt-1">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create user
              </Button>
            </DialogFooter>
          </form>
          <div className="pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Users ({users.length})
            </p>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {isFetching && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!isFetching && users.length === 0 && (
                <p className="text-sm text-muted-foreground">No users loaded.</p>
              )}
              {users.map((u) => {
                const isSelf = u.id === authUserId;
                const isAdminUser = isAdminRole(u.role);
                return (
                  <div key={u.id} className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0 text-sm leading-snug">
                      <span className="font-medium">{u.username}</span>
                      {isAdminUser && (
                        <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                          Admin
                        </Badge>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/90">Pass:</span>{" "}
                        {u.password || "—"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive",
                        isSelf && "pointer-events-none opacity-35",
                      )}
                      disabled={isSelf || deleteMutation.isPending}
                      title={isSelf ? "Cannot delete your own login" : "Delete user"}
                      onClick={() => setConfirmDeleteId(u.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer be able to log in. This cannot be undone from the CMS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDeleteId && deleteMutation.mutate(confirmDeleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
