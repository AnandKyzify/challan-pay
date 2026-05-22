import { createFileRoute } from "@tanstack/react-router";
import { ChallansListView } from "@/components/challans/ChallansListView";

export const Route = createFileRoute("/_app/challans/")({
  component: ChallansIndexPage,
});

function ChallansIndexPage() {
  return (
    <ChallansListView
      variant="default"
      title="Challans"
      description="Manage, track and update every challan in your organisation."
    />
  );
}
