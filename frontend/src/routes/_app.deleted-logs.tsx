import { createFileRoute } from "@tanstack/react-router";
import { DeletedChallanLogsView } from "@/components/challans/DeletedChallanLogsView";

export const Route = createFileRoute("/_app/deleted-logs")({
  component: DeletedChallanLogsPage,
});

function DeletedChallanLogsPage() {
  return <DeletedChallanLogsView />;
}
