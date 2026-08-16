import Sidebar from "./Sidebar";

export default function SoftDashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#ececec] overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f7f7f7] rounded-tl-[32px] md:my-2 md:mr-2 shadow-sm border border-black/5">
        <div className="p-8 md:p-12 max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
