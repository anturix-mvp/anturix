import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { RightSidebar } from "./RightSidebar";
import { BottomTabBar } from "./BottomTabBar";
import { CreateBetModal } from "../bet/CreateBetModal";
import { useWalletContext } from "@/contexts/WalletContext";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const {
    showCreateBetModal,
    setShowCreateBetModal,
    createBetPreset,
    setCreateBetPreset,
  } = useWalletContext();

  return (
    <div className="flex min-h-screen bg-background bg-mesh bg-grid">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <div className="flex-1 flex">
          <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-6 pb-20 lg:pb-6">
            {children}
          </main>
          <RightSidebar />
        </div>
      </div>
      <BottomTabBar />
      <CreateBetModal
        open={showCreateBetModal}
        preset={createBetPreset}
        onClose={() => {
          setShowCreateBetModal(false);
          setCreateBetPreset("standard");
        }}
      />
    </div>
  );
}
