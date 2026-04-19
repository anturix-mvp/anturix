import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Search as SearchIcon, Users, Swords, Lock, X, TrendingUp } from 'lucide-react';
import { mockUsers, mockDuels, mockPredictions } from '@/data/mockData';

export const Route = createFileRoute('/search')({
  head: () => ({
    meta: [
      { title: 'Buscar — Anturix' },
      { name: 'description', content: 'Busca usuarios, duelos, predicciones y pools en Anturix.' },
    ],
  }),
  component: SearchPage,
});

const categories = [
  { id: 'all', label: 'Todo', icon: SearchIcon },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'duels', label: 'Duelos', icon: Swords },
  { id: 'predictions', label: 'Predicciones', icon: Lock },
] as const;

type Category = typeof categories[number]['id'];

function SearchPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  const filteredUsers = useMemo(() =>
    query.length >= 1
      ? mockUsers.filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
      : mockUsers,
    [query]
  );

  const filteredDuels = useMemo(() =>
    query.length >= 1
      ? mockDuels.filter(d => d.eventLabel.toLowerCase().includes(query.toLowerCase()) || d.title.toLowerCase().includes(query.toLowerCase()))
      : mockDuels,
    [query]
  );

  const filteredPredictions = useMemo(() =>
    query.length >= 1
      ? mockPredictions.filter(p => p.eventLabel.toLowerCase().includes(query.toLowerCase()) || p.sport.toLowerCase().includes(query.toLowerCase()))
      : mockPredictions,
    [query]
  );

  const counts = {
    all: filteredUsers.length + filteredDuels.length + filteredPredictions.length,
    users: filteredUsers.length,
    duels: filteredDuels.length,
    predictions: filteredPredictions.length,
  };

  const showUsers = activeCategory === 'all' || activeCategory === 'users';
  const showDuels = activeCategory === 'all' || activeCategory === 'duels';
  const showPredictions = activeCategory === 'all' || activeCategory === 'predictions';

  const totalVisible = (showUsers ? filteredUsers.length : 0) + (showDuels ? filteredDuels.length : 0) + (showPredictions ? filteredPredictions.length : 0);

  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-4">Buscar</h1>

      {/* Search input */}
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios, duelos, predicciones..."
          className="w-full h-11 pl-11 pr-10 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-border transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_var(--color-primary)]'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
            <span className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold ${
              activeCategory === cat.id
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-border text-muted-foreground'
            }`}>
              {counts[cat.id]}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      {query.length >= 1 && (
        <p className="text-xs text-muted-foreground mb-4">
          {totalVisible} resultado{totalVisible !== 1 ? 's' : ''} {query && <>para "<span className="text-primary font-medium">{query}</span>"</>}
        </p>
      )}

      {/* No results */}
      {query.length >= 1 && totalVisible === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <SearchIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Sin resultados</p>
          <p className="text-sm mt-1">No encontramos nada para "{query}"</p>
        </div>
      )}

      {/* Users section */}
      {showUsers && filteredUsers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-heading font-bold text-muted-foreground tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> USUARIOS
            </h2>
            {activeCategory === 'all' && filteredUsers.length > 3 && (
              <button onClick={() => setActiveCategory('users')} className="text-xs text-primary font-medium hover:underline">
                Ver todos ({filteredUsers.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(activeCategory === 'all' ? filteredUsers.slice(0, 3) : filteredUsers).map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full border-2 border-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                    {user.verified && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.rank} · {user.winRate}% WR · {user.wins}W</p>
                </div>
                {user.streak > 0 && (
                  <div className="flex items-center gap-1 text-xs text-accent font-bold">
                    <TrendingUp className="w-3.5 h-3.5" /> {user.streak}🔥
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duels section */}
      {showDuels && filteredDuels.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-heading font-bold text-muted-foreground tracking-wider flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary" /> DUELOS
            </h2>
            {activeCategory === 'all' && filteredDuels.length > 3 && (
              <button onClick={() => setActiveCategory('duels')} className="text-xs text-primary font-medium hover:underline">
                Ver todos ({filteredDuels.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(activeCategory === 'all' ? filteredDuels.slice(0, 3) : filteredDuels).map(duel => (
              <div key={duel.id} className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">LIVE</span>
                  <span className="text-xs font-bold text-primary">{duel.totalPool} SOL</span>
                </div>
                <p className="text-sm font-bold text-foreground">{duel.eventLabel}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <img src={duel.challenger.avatar} alt="" className="w-5 h-5 rounded-full" />
                  <span>{duel.challenger.username}</span>
                  <span className="text-primary font-bold">VS</span>
                  <span>{duel.opponent.username}</span>
                  <img src={duel.opponent.avatar} alt="" className="w-5 h-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions section */}
      {showPredictions && filteredPredictions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-heading font-bold text-muted-foreground tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> PREDICCIONES
            </h2>
            {activeCategory === 'all' && filteredPredictions.length > 3 && (
              <button onClick={() => setActiveCategory('predictions')} className="text-xs text-primary font-medium hover:underline">
                Ver todos ({filteredPredictions.length})
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(activeCategory === 'all' ? filteredPredictions.slice(0, 3) : filteredPredictions).map(pred => (
              <div key={pred.id} className="p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pred.hotStreak ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {pred.sport} {pred.hotStreak && '🔥'}
                  </span>
                  <span className="text-xs font-bold text-primary">{pred.unlockPrice} SOL</span>
                </div>
                <p className="text-sm font-bold text-foreground">{pred.eventLabel}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <img src={pred.expert.avatar} alt="" className="w-5 h-5 rounded-full" />
                  <span>{pred.expert.username}</span>
                  <span>· {pred.pastPerfect} perfect</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no query */}
      {query.length === 0 && activeCategory === 'all' && (
        <div className="text-center py-8 text-muted-foreground">
          <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Escribe para filtrar resultados en tiempo real</p>
        </div>
      )}
    </MainLayout>
  );
}
