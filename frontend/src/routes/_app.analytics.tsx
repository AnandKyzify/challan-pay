import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Deep-dive reporting on collection trends, agent performance and regional breakdowns.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div
          className="h-32 w-full"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--primary) 35%, transparent), color-mix(in oklab, var(--info) 35%, transparent))",
          }}
        />
        <CardContent className="-mt-12 space-y-5 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-background bg-card shadow-lg">
            <BarChart3 className="h-9 w-9 text-primary" />
          </div>
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            Coming soon
          </Badge>
          <div className="mx-auto max-w-md space-y-2">
            <h2 className="text-xl font-semibold">Advanced analytics in the works</h2>
            <p className="text-sm text-muted-foreground">
              We're building cohort analysis, predictive collection forecasts and exportable
              executive reports. The dashboard already surfaces real-time KPIs in the meantime.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
