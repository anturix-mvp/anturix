import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import { mockDuels, mockPools } from "@/data/mockData";
import { Calendar as CalendarIcon, Clock, Swords, Users } from "lucide-react";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — Anturix" },
      {
        name: "description",
        content: "Upcoming events and scheduled duels on Anturix.",
      },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const events = [
    ...mockDuels.map((d) => ({
      id: d.id,
      type: "duel" as const,
      title: d.eventLabel,
      date: d.createdAt,
      amount: d.betAmount,
      icon: Swords,
    })),
    ...mockPools.map((p) => ({
      id: p.id,
      type: "pool" as const,
      title: p.title,
      date: new Date().toISOString(),
      amount: p.buyIn,
      icon: Users,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-6">
        Calendar
      </h1>
      <div className="space-y-4">
        {events.map((event) => {
          const date = new Date(event.date);
          const formattedDate = date.toLocaleDateString("en", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const formattedTime = date.toLocaleTimeString("en", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div
              key={event.id}
              className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border transition-all hover:border-primary/30"
            >
              <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-muted">
                <CalendarIcon className="w-4 h-4 text-primary mb-0.5" />
                <span className="text-[10px] font-bold text-foreground">
                  {date.getDate()}
                </span>
                <span className="text-[8px] text-muted-foreground uppercase">
                  {date.toLocaleDateString("en", { month: "short" })}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <event.icon className="w-4 h-4 text-primary" />
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.type === "duel" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}
                  >
                    {event.type === "duel" ? "DUEL" : "POOL"}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">
                  {event.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" /> {formattedDate} ·{" "}
                    {formattedTime}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {event.amount} SOL
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
