import { useState, useEffect, useCallback, useRef } from 'react';
import { StockScanResult, AlertItem, MarketIndex } from '../types';
import { scannerApi, marketApi, alertsApi } from '../services/api';
import { soundService } from '../services/sound';
import { notificationService } from '../services/notifications';

export function useScanner() {
  const [results, setResults] = useState<StockScanResult[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [marketSentiment, setMarketSentiment] = useState<string>('NEUTRAL');
  const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [autoScannerRunning, setAutoScannerRunning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<{ scanned: number; total: number; status: string }>({
    scanned: 0,
    total: 0,
    status: 'IDLE'
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toastAlert, setToastAlert] = useState<AlertItem | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      const [resData, mktData, alertData, statusData] = await Promise.all([
        scannerApi.getResults(),
        marketApi.getOverview(),
        alertsApi.getAlerts(30),
        scannerApi.getStatus()
      ]);

      if (resData && resData.results) {
        setResults(resData.results);
        setLastScanTime(resData.last_scan_time || '');
      }
      if (mktData) {
        setIndices(mktData.market_indices || []);
        setMarketSentiment(mktData.market_sentiment || 'NEUTRAL');
        setIsMarketOpen(mktData.is_market_open);
      }
      if (alertData) {
        setAlerts(alertData);
      }
      if (statusData) {
        setAutoScannerRunning(statusData.is_running);
      }
    } catch (e) {
      console.error('Failed to fetch initial market data:', e);
    }
  }, []);

  // WebSocket Connection
  useEffect(() => {
    fetchInitialData();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let socket: WebSocket;
    let reconnectTimeout: any;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('⚡ Connected to Breakout Scanner WebSocket stream');
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'NEW_ALERT') {
              const newAlert: AlertItem = msg.data;
              setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
              setToastAlert(newAlert);

              // Sound Chime
              if (newAlert.breakout_type.includes('BEARISH')) {
                soundService.playBearishChime();
              } else {
                soundService.playBullishChime();
              }

              // Desktop Native Notification
              notificationService.showBreakoutNotification(newAlert);
            } else if (msg.type === 'SCAN_PROGRESS') {
              setScanProgress(msg.data);
              setIsScanning(msg.data.status === 'SCANNING');
            } else if (msg.type === 'SCAN_COMPLETED') {
              setIsScanning(false);
              setLastScanTime(msg.data.timestamp);
              // Refresh results
              scannerApi.getResults().then((data) => {
                if (data && data.results) setResults(data.results);
              });
              marketApi.getOverview().then((data) => {
                if (data) setIndices(data.market_indices || []);
              });
            }
          } catch (err) {
            console.error('Error processing WS event:', err);
          }
        };

        socket.onclose = () => {
          console.log('WS connection closed. Reconnecting in 3s...');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    // Periodic market overview poll every 30 seconds
    const interval = setInterval(() => {
      marketApi.getOverview().then((data) => {
        if (data) {
          setIndices(data.market_indices || []);
          setMarketSentiment(data.market_sentiment || 'NEUTRAL');
          setIsMarketOpen(data.is_market_open);
        }
      }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(reconnectTimeout);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchInitialData]);

  const triggerManualScan = async (timeframe: string = '15m') => {
    setIsScanning(true);
    setScanProgress({ scanned: 0, total: 30, status: 'SCANNING' });
    try {
      const data = await scannerApi.runScan(timeframe);
      if (data && data.results) {
        setResults(data.results);
        setLastScanTime(new Date().toLocaleTimeString());
      }
      const updatedAlerts = await alertsApi.getAlerts(30);
      setAlerts(updatedAlerts);
    } catch (e) {
      console.error('Error running manual scan:', e);
    } finally {
      setIsScanning(false);
      setScanProgress({ scanned: 0, total: 0, status: 'IDLE' });
    }
  };

  const toggleAutoScanner = async (interval: number = 5) => {
    if (autoScannerRunning) {
      await scannerApi.stopAutoScan();
      setAutoScannerRunning(false);
    } else {
      await scannerApi.startAutoScan(interval);
      setAutoScannerRunning(true);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.setEnabled(next);
  };

  const clearToast = () => setToastAlert(null);

  return {
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
    refreshData: fetchInitialData
  };
}
