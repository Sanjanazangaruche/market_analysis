import axios from 'axios';
import {
  StockScanResult, StockQuote, MarketIndex, AlertItem,
  AlertFilterSettings, WatchlistItem, PaperTrade,
  BacktestRequest, BacktestResult, AppSettings, AIAnalysisResult
} from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scannerApi = {
  getResults: async (): Promise<{ count: number; last_scan_time: string; results: StockScanResult[] }> => {
    const res = await api.get('/scanner/results');
    return res.data;
  },
  runScan: async (timeframe: string = '15m'): Promise<{ count: number; results: StockScanResult[] }> => {
    const res = await api.post(`/scanner/run?timeframe=${timeframe}`);
    return res.data;
  },
  startAutoScan: async (interval: number = 5): Promise<any> => {
    const res = await api.post(`/scanner/start?interval_minutes=${interval}`);
    return res.data;
  },
  stopAutoScan: async (): Promise<any> => {
    const res = await api.post('/scanner/stop');
    return res.data;
  },
  getStatus: async (): Promise<any> => {
    const res = await api.get('/scanner/status');
    return res.data;
  },
};

export const stocksApi = {
  getAnalysis: async (symbol: string, exchange: string = 'NSE', timeframe: string = '15m'): Promise<StockScanResult> => {
    const res = await api.get(`/stocks/${symbol}?exchange=${exchange}&timeframe=${timeframe}`);
    return res.data;
  },
  getCandles: async (symbol: string, exchange: string = 'NSE', timeframe: string = '15m', count: number = 150): Promise<any> => {
    const res = await api.get(`/stocks/${symbol}/candles?exchange=${exchange}&timeframe=${timeframe}&count=${count}`);
    return res.data;
  },
  getQuote: async (symbol: string, exchange: string = 'NSE'): Promise<StockQuote> => {
    const res = await api.get(`/stocks/${symbol}/quote?exchange=${exchange}`);
    return res.data;
  },
};

export const marketApi = {
  getOverview: async (): Promise<{
    is_market_open: boolean;
    session_status: string;
    market_indices: MarketIndex[];
    market_sentiment: string;
  }> => {
    const res = await api.get('/market/overview');
    return res.data;
  },
};

export const aiApi = {
  analyze: async (symbol: string, exchange: string = 'NSE', timeframe: string = '15m'): Promise<{
    symbol: string;
    current_price: number;
    score: number;
    classification: string;
    trade_setup: any;
    ai_analysis: AIAnalysisResult;
  }> => {
    const res = await api.post(`/ai/analyze?symbol=${symbol}&exchange=${exchange}&timeframe=${timeframe}`);
    return res.data;
  },
};

export const alertsApi = {
  getAlerts: async (limit: number = 50): Promise<AlertItem[]> => {
    const res = await api.get(`/alerts?limit=${limit}`);
    return res.data;
  },
  clearAlerts: async (): Promise<any> => {
    const res = await api.delete('/alerts');
    return res.data;
  },
  getSettings: async (): Promise<AlertFilterSettings> => {
    const res = await api.get('/alerts/settings');
    return res.data;
  },
  saveSettings: async (settings: AlertFilterSettings): Promise<any> => {
    const res = await api.post('/alerts/settings', settings);
    return res.data;
  },
};

export const watchlistApi = {
  getAll: async (): Promise<WatchlistItem[]> => {
    const res = await api.get('/watchlist');
    return res.data;
  },
  add: async (item: Partial<WatchlistItem>): Promise<any> => {
    const res = await api.post('/watchlist', item);
    return res.data;
  },
  remove: async (symbol: string): Promise<any> => {
    const res = await api.delete(`/watchlist/${symbol}`);
    return res.data;
  },
  toggleAlert: async (symbol: string): Promise<any> => {
    const res = await api.patch(`/watchlist/${symbol}/toggle-alert`);
    return res.data;
  },
};

export const paperTradesApi = {
  getTrades: async (): Promise<{ summary: any; trades: PaperTrade[] }> => {
    const res = await api.get('/paper-trades');
    return res.data;
  },
  placeOrder: async (order: any): Promise<PaperTrade> => {
    const res = await api.post('/paper-trades', order);
    return res.data;
  },
  closeTrade: async (id: number, exit_price?: number): Promise<PaperTrade> => {
    const url = exit_price ? `/paper-trades/${id}/close?exit_price=${exit_price}` : `/paper-trades/${id}/close`;
    const res = await api.post(url);
    return res.data;
  },
};

export const backtestApi = {
  run: async (req: BacktestRequest): Promise<BacktestResult> => {
    const res = await api.post('/backtest/run', req);
    return res.data;
  },
  getHistory: async (): Promise<any[]> => {
    const res = await api.get('/backtest/history');
    return res.data;
  },
};

export const settingsApi = {
  getSettings: async (): Promise<AppSettings> => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateSettings: async (payload: any): Promise<any> => {
    const res = await api.post('/settings', payload);
    return res.data;
  },
};

export default api;
