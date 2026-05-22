import { createFileRoute } from "@tanstack/react-router";
import { ChallansListView } from "@/components/challans/ChallansListView";

export const Route = createFileRoute("/_app/challans/sent-in-court")({
  component: CourtChallansPage,
});

function CourtChallansPage() {
  return (
    <ChallansListView
      variant="court"
      title="Challan sent in court"
      description="Challans with status Sent in Court — search, filter, export and manage records here."
    />
  );
}
