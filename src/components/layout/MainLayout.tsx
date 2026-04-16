import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { BottomTabBar } from "./BottomTabBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background bg-mesh bg-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 flex justify-center">
          <main className="flex-1 max-w-[900px] w-full px-4 py-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
