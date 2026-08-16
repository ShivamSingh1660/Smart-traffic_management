import { HelpCircle, TrendingUp, TrendingDown, Folder, User } from "lucide-react";
import Sparkline from "./Sparkline";

export default function StatCard() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.04)] p-8">
      <h2 className="text-[#1a1a1a] font-bold text-xl mb-10">Overview</h2>
      
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        
        {/* Earning Stat */}
        <div className="flex-1">
          <div className="w-14 h-14 rounded-full bg-[#f7f7f7] flex items-center justify-center mb-8">
            <Folder className="text-[#8a8a8a]" size={24} strokeWidth={1.5} />
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#8a8a8a] font-medium text-sm">Earning</span>
            <HelpCircle size={14} className="text-[#c0c0c0]" strokeWidth={2} />
          </div>
          
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-[#8a8a8a] text-3xl font-medium">$</span>
            <span className="text-[#1a1a1a] text-5xl md:text-6xl font-bold tracking-tight">128k</span>
          </div>
          
          <div className="flex items-center gap-3">
            <TrendBadge trend="up" value="36.8%" />
            <span className="text-[#c0c0c0] text-sm font-medium">vs last year</span>
          </div>
        </div>
        
        {/* Sparkline in middle */}
        <div className="hidden md:flex items-center justify-center flex-1">
          <Sparkline />
        </div>
        
        {/* Customer Stat */}
        <div className="flex-1 md:text-right flex flex-col md:items-end">
          <div className="w-14 h-14 rounded-full bg-[#f7f7f7] flex items-center justify-center mb-8">
            <User className="text-[#c0c0c0]" size={24} strokeWidth={1.5} />
          </div>
          
          <div className="flex items-center gap-2 mb-2 justify-end w-full">
            <span className="text-[#c0c0c0] font-medium text-sm">Customer</span>
            <HelpCircle size={14} className="text-[#e0e0e0]" strokeWidth={2} />
          </div>
          
          <div className="mb-6">
            <span className="text-[#c0c0c0] text-5xl md:text-6xl font-bold tracking-tight">512</span>
          </div>
          
          <div className="flex items-center gap-3 justify-end w-full opacity-60">
            <TrendBadge trend="down" value="36.8%" />
            <span className="text-[#e0e0e0] text-sm font-medium">vs last year</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function TrendBadge({ trend, value }) {
  const isUp = trend === "up";
  
  return (
    <div 
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
        ${isUp ? "bg-[#e8f5f0] text-[#4eb88c]" : "bg-[#fdf0ef] text-[#e87a71]"}`}
    >
      {isUp ? (
        <TrendingUp size={14} strokeWidth={3} />
      ) : (
        <TrendingDown size={14} strokeWidth={3} />
      )}
      <span>{value}</span>
    </div>
  );
}
