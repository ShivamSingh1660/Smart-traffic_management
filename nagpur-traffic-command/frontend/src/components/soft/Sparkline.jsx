export default function Sparkline() {
  return (
    <div className="w-32 h-20">
      <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
        {/* Soft, hand-drawn style curve */}
        <path 
          d="M 0,35 C 10,40 20,42 25,35 C 30,25 35,-5 45,5 C 55,15 60,0 70,5 C 80,10 85,35 90,38" 
          fill="none" 
          stroke="#7fc8a9" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
