import { useState } from "react";
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/auth";

const schema = z.object({
  username: z.string().trim().min(2, "Username is required"),
  password: z.string().min(4, "Min 4 characters"),
  remember: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "admin", password: "admin123", remember: true },
  });

  if (isAuthenticated) return <Navigate to="/dashboard" />;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await authService.login({ username: values.username, password: values.password });
      login(res.user, res.token);
      toast.success(`Welcome back, ${res.user.name}`);
      navigate({ to: "/dashboard" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 10%, color-mix(in oklab, var(--primary) 22%, transparent), transparent), radial-gradient(50% 40% at 90% 90%, color-mix(in oklab, var(--info) 20%, transparent), transparent)",
        }}
      />
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Challan Management</CardTitle>
            <CardDescription>Sign in to your admin console</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" autoComplete="username" {...form.register("username")} />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!form.watch("remember")}
                  onCheckedChange={(c) => form.setValue("remember", !!c)}
                />
                Remember me
              </label>
              <a href="#" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Demo credentials: <span className="font-medium">admin / admin123</span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
