import React, { useState } from 'react';
import { useScanner } from './hooks/useScanner';
import { Navigation } from './components/Navigation';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { StockDetailPage } from './pages/StockDetailPage';
import { AIAnalysisPage } from './pages/AIAnalysisPage';
import { AlertsPage } from './pages/AlertsPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { PaperTradingPage } from './pages/PaperTradingPage';
import { BacktestingPage } from './pages/BacktestingPage';
import { SettingsPage } from './pages/SettingsPage';
import { AISummaryModal } from './components/AISummaryModal';
import { TradeModal } from './components/TradeModal';
import { AlertToast } from './components/AlertToast';
import { StockScanResult } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');

  // Modal States
  const [aiModalItem, setAiModalItem] = useState<StockScanResult | null>(null);
  const [tradeModalItem, setTradeModalItem] = useState<StockScanResult | null>(null);

  const {
    results,
    alerts,
    indices,
    marketSentiment,
    isMarketOpen,
    isScanning,
    autoScannerRunning,
    lastScanTime,
    scanProgress,
    soundEnabled,
    toastAlert,
    triggerManualScan,
    toggleAutoScanner,
    toggleSound,
    clearToast,
    refreshData
  } = useScanner();

  const handleSelectStock = (sym: string) => {
    setSelectedStock(sym);
    setActiveTab('analysis');
  };

  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    triggerManualScan(tf);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-dark-950 text-slate-100">
      {/* Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'analysis') setSelectedStock(null);
        }}
        alertCount={alerts.length}
        openTradesCount={0}
        scannerRunning={autoScannerRunning}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          indices={indices}
          isMarketOpen={isMarketOpen}
          isScanning={isScanning}
          autoScannerRunning={autoScannerRunning}
          lastScanTime={lastScanTime}
          scanProgress={scanProgress}
          soundEnabled={soundEnabled}
          selectedTimeframe={selectedTimeframe}
          setSelectedTimeframe={handleTimeframeChange}
          onManualScan={() => triggerManualScan(selectedTimeframe)}
          onToggleAutoScanner={toggleAutoScanner}
          onToggleSound={toggleSound}
        />

        {/* Scrollable Page Views */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
          {activeTab === 'dashboard' && (
            <DashboardPage
              results={results}
              alerts={alerts}
              indices={indices}
              marketSentiment={marketSentiment}
              isMarketOpen={isMarketOpen}
              onSelectStock={handleSelectStock}
              onOpenAIModal={(item) => setAiModalItem(item)}
              onOpenTradeModal={(item) => setTradeModalItem(item)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerPage
              results={results}
              onSelectStock={handleSelectStock}
              onOpenAIModal={(item) => setAiModalItem(item)}
              onOpenTradeModal={(item) => setTradeModalItem(item)}
            />
          )}

          {activeTab === 'analysis' && (
            <StockDetailPage
              symbol={selectedStock || (results.length > 0 ? results[0].symbol : 'RELIANCE')}
              onBack={() => setActiveTab('scanner')}
              onOpenTradeModal={(item) => setTradeModalItem(item)}
              onOpenAIModal={(item) => setAiModalItem(item)}
            />
          )}

          {activeTab === 'ai' && (
            <AIAnalysisPage
              results={results}
              onSelectStock={handleSelectStock}
              onOpenTradeModal={(item) => setTradeModalItem(item)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsPage
              alerts={alerts}
              onSelectStock={handleSelectStock}
              onRefreshAlerts={refreshData}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistPage
              onSelectStock={handleSelectStock}
              onScanNow={() => triggerManualScan(selectedTimeframe)}
            />
          )}

          {activeTab === 'paper-trading' && (
            <PaperTradingPage
              onSelectStock={handleSelectStock}
            />
          )}

          {activeTab === 'backtest' && (
            <BacktestingPage
              onSelectStock={handleSelectStock}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Floating Modals and Toasts */}
      <AISummaryModal
        item={aiModalItem}
        onClose={() => setAiModalItem(null)}
      />

      <TradeModal
        item={tradeModalItem}
        onClose={() => setTradeModalItem(null)}
        onSuccess={() => {
          refreshData();
          setActiveTab('paper-trading');
        }}
      />

      <AlertToast
        alert={toastAlert}
        onClose={clearToast}
        onSelectStock={handleSelectStock}
      />
    </div>
  );
}

export default App;
