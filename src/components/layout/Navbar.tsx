import { Bell, Plus, Search, ChevronDown } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import atxLogo from '@/assets/atx-logo.jpg';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-4 gap-3">
      {/* Logo (mobile) */}
      <Link to="/" className="lg:hidden flex items-center gap-2">
        <img src={atxLogo} alt="ATX" className="w-8 h-8 rounded-lg object-cover" />
        <span className="font-heading font-bold text-primary text-sm tracking-wider">ANTURIX</span>
      </Link>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="What's on your mind?"
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">3</span>
        </button>

        <Button variant="cyan" size="sm" className="hidden sm:flex gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Antaler</span>
        </Button>

        {/* Balance chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195]" />
          <span className="text-sm font-heading font-semibold text-foreground">42.5</span>
          <span className="text-xs text-muted-foreground">SOL</span>
        </div>

        {/* Avatar */}
        <button className="flex items-center gap-1.5">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoAlpha" alt="avatar" className="w-8 h-8 rounded-full border-2 border-primary" />
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
