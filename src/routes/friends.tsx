import { createFileRoute } from '@tanstack/react-router';
import { MainLayout } from '@/components/layout/MainLayout';
import { mockUsers, currentUser } from '@/data/mockData';
import { UserPlus, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/friends')({
  head: () => ({
    meta: [
      { title: 'Friends — Anturix' },
      { name: 'description', content: 'Connect with other predictors on Anturix.' },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const friends = mockUsers.filter(u => u.id !== currentUser.id);

  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-6">Friends</h1>

      <div className="space-y-3">
        {friends.map(user => (
          <div key={user.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border transition-all hover:border-primary/30">
            <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full border-2 border-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                {user.verified && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">✓</span>}
              </div>
              <p className="text-xs text-muted-foreground">{user.rank} · {user.wins}W/{user.losses}L · {user.winRate}% WR</p>
              {user.streak > 0 && (
                <p className="text-[10px] text-accent">🔥 {user.streak} streak</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Swords className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Challenge</span>
              </Button>
              <Button variant="cyan" size="sm" className="gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Follow</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}

