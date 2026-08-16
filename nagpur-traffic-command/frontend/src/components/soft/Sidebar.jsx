import { useState } from "react";
import { 
  LayoutGrid, 
  Box, 
  Users, 
  ShoppingBag, 
  TrendingUp, 
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function Sidebar() {
  const [productExpanded, setProductExpanded] = useState(true);

  return (
    <aside className="w-[260px] h-screen bg-[#f0f0f0] flex flex-col pt-6 pb-6 border-r border-black/5 shrink-0 hidden md:flex">
      {/* Logo Area */}
      <div className="px-8 mb-10">
        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center shadow-lg shadow-black/10">
          <div className="w-4 h-4 bg-white/20 rounded-sm rotate-45 transform"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <NavItem icon={<LayoutGrid size={20} strokeWidth={1.5} />} label="Dashboard" />
        
        {/* Expandable Section */}
        <div className="pt-2">
          <button 
            onClick={() => setProductExpanded(!productExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#1a1a1a] rounded-xl hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Box size={20} strokeWidth={1.5} />
              <span>Product</span>
            </div>
            {productExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {/* Nested Items */}
          {productExpanded && (
            <div className="pl-6 ml-6 mt-1 space-y-1 border-l border-black/10">
              <NestedNavItem label="Overview" active={true} />
              <NestedNavItem label="Drafts" badge="3" badgeColor="bg-[#f4c9a8]" />
              <NestedNavItem label="Released" />
              <NestedNavItem label="Comments" />
              <NestedNavItem label="Scheduled" badge="8" badgeColor="bg-[#7fc8a9]" badgeText="text-black" />
            </div>
          )}
        </div>

        <div className="pt-2">
          <NavItem icon={<Users size={20} strokeWidth={1.5} />} label="Customers" hasChevron />
          <NavItem icon={<ShoppingBag size={20} strokeWidth={1.5} />} label="Shop" />
          <NavItem icon={<TrendingUp size={20} strokeWidth={1.5} />} label="Income" hasChevron />
          <NavItem icon={<Award size={20} strokeWidth={1.5} />} label="Promote" />
        </div>
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, active, hasChevron }) {
  if (active) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] cursor-pointer text-[#1a1a1a]">
        <div className="flex items-center gap-3 font-semibold text-sm">
          {icon}
          <span>{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 text-[#8a8a8a] rounded-xl hover:bg-black/5 hover:text-[#1a1a1a] transition-colors cursor-pointer">
      <div className="flex items-center gap-3 font-medium text-sm">
        {icon}
        <span>{label}</span>
      </div>
      {hasChevron && <ChevronDown size={16} />}
    </div>
  );
}

function NestedNavItem({ label, active, badge, badgeColor, badgeText = "text-[#1a1a1a]" }) {
  if (active) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 my-1 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] cursor-pointer text-[#1a1a1a] relative -left-3 border border-transparent">
        <span className="font-semibold text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 my-1 text-[#8a8a8a] hover:text-[#1a1a1a] transition-colors cursor-pointer text-sm font-medium">
      <span>{label}</span>
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeColor} ${badgeText}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
