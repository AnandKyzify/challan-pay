import { Outlet, createFileRoute } from "@tanstack/react-router";

/**
 * Layout for `/challans/*`. Child routes (e.g. `/challans/sent-in-court`) render in <Outlet />.
 */
export const Route = createFileRoute("/_app/challans")({
  component: ChallansLayout,
});

function ChallansLayout() {
  return <Outlet />;
}
