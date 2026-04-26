import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { RightSidebar } from "./RightSidebar";
import { BottomTabBar } from "./BottomTabBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background bg-mesh bg-grid overflow-x-hidden max-w-[100vw]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 flex overflow-x-hidden">
          <main className="flex-1 max-w-[900px] mx-auto w-full px-4 py-6 pb-20 lg:pb-6 overflow-x-hidden max-w-full">
            {children}
          </main>
          <RightSidebar />
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
