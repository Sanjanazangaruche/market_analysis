import React from 'react';
import {
  LayoutDashboard,
  ScanSearch,
  TrendingUp,
  Sparkles,
  BellRing,
  BookmarkCheck,
  Briefcase,
  LineChart,
  Settings2,
  Activity,
  Cpu
} from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount: number;
  openTradesCount: number;
  scannerRunning: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  alertCount,
  openTradesCount,
  scannerRunning,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'Stock Scanner', icon: ScanSearch },
    { id: 'analysis', label: 'Stock Analysis', icon: TrendingUp },
    { id: 'ai', label: 'AI Intelligence', icon: Sparkles, highlight: true },
    { id: 'alerts', label: 'Alerts', icon: BellRing, badge: alertCount },
    { id: 'watchlist', label: 'Watchlist', icon: BookmarkCheck },
    { id: 'paper-trading', label: 'Paper Trading', icon: Briefcase, badge: openTradesCount },
    { id: 'backtest', label: 'Backtesting', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-750 flex flex-col justify-between select-none shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-dark-750 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-bull-dark via-bull to-emerald-300 flex items-center justify-center shadow-lg shadow-bull/20">
              <Activity className="w-5 h-5 text-dark-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wider text-white flex items-center gap-1.5">
                <span>BREAKOUT</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-dark-750 text-bull font-mono border border-bull/30">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">NSE / BSE TERMINAL</p>
            </div>
          </div>
        </div>

        {/* Live Engine Status Badge */}
        <div className="px-4 py-3">
          <div className="bg-dark-850 border border-dark-700/70 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${scannerRunning ? 'bg-bull animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-xs font-medium text-slate-300">
                {scannerRunning ? 'Auto Scanner Active' : 'Scanner Standby'}
              </span>
            </div>
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Nav Links */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-bull/15 text-bull-light border border-bull/30 shadow-sm shadow-bull/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-bull'
                        : item.highlight
                        ? 'text-accent-purple group-hover:text-purple-400'
                        : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-bull text-dark-950'
                        : 'bg-dark-750 text-bull-light border border-bull/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Safety Notice Footer */}
      <div className="p-3 border-t border-dark-750 bg-dark-950/50">
        <div className="p-2.5 rounded-lg bg-dark-850/80 border border-dark-700/50">
          <div className="text-[10px] text-slate-400 leading-tight">
            <span className="font-semibold text-slate-300 block mb-0.5">Disclaimer:</span>
            AI-generated technical analysis is for decision support only and is not financial advice.
          </div>
        </div>
      </div>
    </aside>
  );
};
