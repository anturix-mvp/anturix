import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/duel/$legacy/duel/$duelId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/duel/$duelId",
      params: { duelId: params.duelId },
      replace: true,
    });
  },
});
