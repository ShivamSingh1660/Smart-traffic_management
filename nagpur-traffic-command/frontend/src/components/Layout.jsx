import { NavLink, Outlet } from "react-router-dom";
import logoImg from "../assets/traffix-logo.png";
import { 
  LayoutGrid, 
  Map, 
  MapPin, 
  ShieldAlert, 
  AlertTriangle, 
  Lightbulb, 
  BarChart2,
  LightbulbOff
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: <LayoutGrid size={20} strokeWidth={1.5} /> },
  { to: "/heatmap", label: "Risk Heatmap", icon: <Map size={20} strokeWidth={1.5} /> },
  { to: "/locations", label: "High-Risk Locations", icon: <MapPin size={20} strokeWidth={1.5} /> },
  { to: "/deployment", label: "Police Deployment", icon: <ShieldAlert size={20} strokeWidth={1.5} /> },
  { to: "/incidents", label: "Active Incidents", icon: <AlertTriangle size={20} strokeWidth={1.5} /> },
  { to: "/recommendations", label: "Recommendations", icon: <Lightbulb size={20} strokeWidth={1.5} /> },
  { to: "/analytics", label: "Analytics", icon: <BarChart2 size={20} strokeWidth={1.5} /> },
];

function Sidebar() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <aside className="w-[260px] h-screen bg-bg-app flex flex-col pt-6 pb-6 border-r border-border-subtle shrink-0 hidden md:flex transition-colors">
      {/* Logo Area */}
      <div className="px-8 mb-10">
        <img 
          src={logoImg} 
          alt="Traffix AI Predict Logo" 
          className="h-14 w-auto object-contain" 
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 transition-colors duration-150 cursor-pointer ${
                isActive 
                  ? "border-sky-400 bg-bg-card backdrop-blur-xl backdrop-saturate-150 text-text-primary font-bold shadow-sm" 
                  : "border-transparent text-text-secondary hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover hover:text-text-primary font-medium"
              }`
            }
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Footer */}
      <div className="px-8 mt-auto flex items-center justify-between">
        <div className="text-xs text-text-tertiary font-medium">Nagpur v0.1</div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-card backdrop-blur-xl backdrop-saturate-150-hover transition-colors"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <LightbulbOff size={18} /> : <Lightbulb size={18} />}
        </button>
      </div>
    </aside>
  );
}

export default function Layout() {
  return (
    <div className="flex h-screen bg-bg-app overflow-hidden font-sans transition-colors">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-bg-content rounded-tl-[32px] md:my-2 md:mr-2 shadow-[var(--shadow-card)] border border-border-subtle transition-colors">
        <div className="p-8 md:p-12 mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
