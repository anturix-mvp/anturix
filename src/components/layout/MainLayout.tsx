import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { RightSidebar } from "./RightSidebar";
import { BottomTabBar } from "./BottomTabBar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background bg-mesh bg-grid max-w-[100vw]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <main className="flex-1 min-w-0 max-w-[900px] mx-auto w-full px-4 py-6 pb-20 lg:pb-6 overflow-x-hidden overflow-y-auto max-w-full">
            {children}
          </main>
          <RightSidebar />
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
