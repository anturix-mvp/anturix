import { createFileRoute } from "@tanstack/react-router";
import { MainLayout } from "@/components/layout/MainLayout";
import { currentUser } from "@/data/mockData";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type AccentColor } from "@/contexts/ThemeContext";
import {
  User,
  Bell,
  Shield,
  Palette,
  Wallet,
  Globe,
  LogOut,
  ChevronRight,
  ChevronDown,
  Camera,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  MessageSquare,
  Sun,
  Moon,
  Monitor,
  Check,
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Anturix" },
      { name: "description", content: "Configure your Anturix account." },
    ],
  }),
  component: SettingsPage,
});

type SectionKey =
  | "profile"
  | "wallet"
  | "security"
  | "notifications"
  | "appearance"
  | "language"
  | null;

const STORAGE_KEY = "anturix_settings";

function loadSettings() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSettings(data: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function SettingsPage() {
  const [openSection, setOpenSection] = useState<SectionKey>(null);
  const { authenticated, solanaWallet, logout, login } = useAuth();
  const publicKey = solanaWallet?.address || null;
  const walletName = "Privy Wallet";
  const {
    theme,
    accent: accentColor,
    setTheme,
    setAccent: setAccentColor,
  } = useTheme();

  // Profile state — use defaults for SSR, hydrate from localStorage
  const [username, setUsername] = useState(currentUser.username);
  const [bio, setBio] = useState("Crypto degen & prediction enthusiast 🎲");

  // Security state
  const [showPassword, setShowPassword] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  // Notifications state
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifInApp, setNotifInApp] = useState(true);

  // Language state
  const [language, setLanguage] = useState("en");

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = loadSettings();
    if (!saved) return;
    if (saved.username) setUsername(saved.username);
    if (saved.bio) setBio(saved.bio);
    if (saved.twoFA !== undefined) setTwoFA(saved.twoFA);
    if (saved.notifPush !== undefined) setNotifPush(saved.notifPush);
    if (saved.notifEmail !== undefined) setNotifEmail(saved.notifEmail);
    if (saved.notifInApp !== undefined) setNotifInApp(saved.notifInApp);
    if (saved.language) setLanguage(saved.language);
  }, []);

  const toggle = (key: SectionKey) =>
    setOpenSection((prev) => (prev === key ? null : key));

  const handleSaveProfile = () => {
    saveSettings({ ...loadSettings(), username, bio });
    toast.success("Profile updated");
  };

  const handleSaveSecurity = () => {
    saveSettings({ ...loadSettings(), twoFA });
    toast.success("Security settings saved");
  };

  const handleSaveNotifications = () => {
    saveSettings({ ...loadSettings(), notifPush, notifEmail, notifInApp });
    toast.success("Notification preferences saved");
  };

  const handleSaveLanguage = () => {
    saveSettings({ ...loadSettings(), language });
    toast.success("Language updated");
  };

  const handleLogout = () => {
    logout();
    toast("Session closed");
  };

  const copyWalletAddress = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    toast.success("Copied!");
  };

  const accents = [
    {
      id: "cyan" as AccentColor,
      label: "Cyan",
      color: "bg-[oklch(0.78_0.15_195)]",
    },
    {
      id: "magenta" as AccentColor,
      label: "Magenta",
      color: "bg-[oklch(0.65_0.25_330)]",
    },
    {
      id: "gold" as AccentColor,
      label: "Gold",
      color: "bg-[oklch(0.82_0.16_85)]",
    },
    {
      id: "green" as AccentColor,
      label: "Green",
      color: "bg-[oklch(0.72_0.19_145)]",
    },
  ];

  const settingsItems: {
    key: SectionKey;
    icon: typeof User;
    label: string;
    desc: string;
  }[] = [
    { key: "profile", icon: User, label: "Profile", desc: "Name, avatar, bio" },
    {
      key: "wallet",
      icon: Wallet,
      label: "Wallet",
      desc: "Connect or change wallet",
    },
    { key: "security", icon: Shield, label: "Security", desc: "Password, 2FA" },
    {
      key: "notifications",
      icon: Bell,
      label: "Notifications",
      desc: "Push, email, in-app",
    },
    {
      key: "appearance",
      icon: Palette,
      label: "Appearance",
      desc: "Theme, colors",
    },
    {
      key: "language",
      icon: Globe,
      label: "Language",
      desc: "Spanish, English",
    },
  ];

  const groups = [
    { title: "ACCOUNT", items: settingsItems.slice(0, 3) },
    { title: "PREFERENCES", items: settingsItems.slice(3) },
  ];

  const renderPanel = (key: SectionKey) => {
    switch (key) {
      case "profile":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={currentUser.avatar}
                  alt="avatar"
                  className="w-16 h-16 rounded-full border-2 border-primary"
                />
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                </button>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Username
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-muted/50 border-border"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                maxLength={160}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {bio.length}/160
              </p>
            </div>
            <Button
              variant="cyan"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveProfile}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        );
      case "wallet":
        return (
          <div className="space-y-3">
            {authenticated ? (
              <>
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-xs text-success font-medium">
                      Connected · {walletName}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-foreground truncate">
                    {publicKey}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => login()}>
                    Change Wallet
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      logout();
                      toast("Wallet disconnected");
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No wallet connected
                </p>
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => login()}
                  className="gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" /> Connect Wallet
                </Button>
              </div>
            )}
          </div>
        );
      case "security":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Current password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="bg-muted/50 border-border pr-10"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                New password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    2FA Authentication
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Protect your account with two-step verification
                  </p>
                </div>
              </div>
              <Switch checked={twoFA} onCheckedChange={setTwoFA} />
            </div>
            <Button
              variant="cyan"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveSecurity}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-3">
            {[
              {
                icon: Smartphone,
                label: "Push",
                desc: "Notifications on your device",
                checked: notifPush,
                set: setNotifPush,
              },
              {
                icon: Mail,
                label: "Email",
                desc: "Summaries and alerts by email",
                checked: notifEmail,
                set: setNotifEmail,
              },
              {
                icon: MessageSquare,
                label: "In-App",
                desc: "Notifications inside the app",
                checked: notifInApp,
                set: setNotifInApp,
              },
            ].map((n) => (
              <div
                key={n.label}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  <n.icon className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {n.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {n.desc}
                    </p>
                  </div>
                </div>
                <Switch checked={n.checked} onCheckedChange={n.set} />
              </div>
            ))}
            <Button
              variant="cyan"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveNotifications}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        );
      case "appearance":
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "dark" as const, icon: Moon, label: "Dark" },
                  { id: "light" as const, icon: Sun, label: "Light" },
                  { id: "system" as const, icon: Monitor, label: "System" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                      theme === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <t.icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Accent Color</p>
              <div className="flex gap-3">
                {accents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccentColor(a.id)}
                    className="relative flex flex-col items-center gap-1"
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${a.color} border-2 ${accentColor === a.id ? "border-foreground scale-110" : "border-transparent"} transition-all`}
                    >
                      {accentColor === a.id && (
                        <Check className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {a.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Changes are applied in real-time ✨
            </p>
          </div>
        );
      case "language":
        return (
          <div className="space-y-3">
            {[
              { id: "es", label: "Spanish", flag: "🇪🇸" },
              { id: "en", label: "English", flag: "🇺🇸" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  language === lang.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/50 hover:border-primary/30"
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="text-sm font-medium text-foreground">
                  {lang.label}
                </span>
                {language === lang.id && (
                  <Check className="w-4 h-4 text-primary ml-auto" />
                )}
              </button>
            ))}
            <Button
              variant="cyan"
              size="sm"
              className="gap-1.5"
              onClick={handleSaveLanguage}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <h1 className="text-xl font-heading font-bold text-foreground mb-6">
        Settings
      </h1>

      {/* Profile card */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border mb-6">
        <img
          src={currentUser.avatar}
          alt={currentUser.username}
          className="w-14 h-14 rounded-full border-2 border-primary"
        />
        <div>
          <p className="font-bold text-foreground">{username}</p>
          <p className="text-xs text-muted-foreground">
            {currentUser.rank} · {currentUser.reputationScore.toLocaleString()}{" "}
            XP
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-heading font-bold text-foreground">
            Connected Wallet
          </h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Devnet
          </span>
        </div>
        {publicKey ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs font-mono text-foreground truncate">
              {publicKey}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWalletAddress}
              className="gap-1.5 h-10"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No connected wallet</p>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className="text-xs font-heading font-bold text-muted-foreground mb-3 tracking-wider">
            {group.title}
          </h2>
          <div className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border">
            {group.items.map((item) => (
              <div key={item.key}>
                <button
                  onClick={() => toggle(item.key)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <item.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: openSection === item.key ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openSection === item.key && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-border/50">
                        {renderPanel(item.key)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">Disconnect Wallet</span>
      </button>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Built for Colosseum Hackathon 2025
      </p>
    </MainLayout>
  );
}
