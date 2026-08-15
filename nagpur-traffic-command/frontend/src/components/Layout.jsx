import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/heatmap", label: "Risk Heatmap" },
  { to: "/locations", label: "High-Risk Locations" },
  { to: "/deployment", label: "Police Deployment" },
  { to: "/incidents", label: "Active Incidents" },
  { to: "/recommendations", label: "AI Recommendations" },
  { to: "/analytics", label: "Analytics" },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 py-5 border-b border-gray-800">
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-400">
            Navigation
          </h2>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm font-medium border-l-2 transition-colors duration-150 ${
                  isActive
                    ? "border-cyan-500 bg-gray-800/60 text-cyan-400"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
          Nagpur Traffic Command v0.1
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="h-14 flex-shrink-0 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
          <h1 className="text-base font-semibold tracking-wide text-gray-100">
            Nagpur Traffic Command &amp; Decision Support
          </h1>
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase bg-amber-900/40 text-amber-400 border border-amber-700/50">
            Simulated Data — Hackathon Prototype
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
