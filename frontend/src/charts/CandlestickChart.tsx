import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Candle, TechnicalIndicators, SupportResistanceSummary, TradeSetup } from '../types';

interface CandlestickChartProps {
  candles: Candle[];
  indicators?: TechnicalIndicators;
  supportResistance?: SupportResistanceSummary;
  tradeSetup?: TradeSetup;
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  indicators,
  supportResistance,
  tradeSetup,
  height = 420,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [showEMA20, setShowEMA20] = useState<boolean>(true);
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showEMA200, setShowEMA200] = useState<boolean>(true);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const [showSRLevels, setShowSRLevels] = useState<boolean>(true);
  const [showTradePlan, setShowTradePlan] = useState<boolean>(true);

  // Compute EMA Series for the chart
  const ema20Series = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const k = 2 / (20 + 1);
    let ema = candles[0].close;
    return candles.map((c) => {
      ema = c.close * k + ema * (1 - k);
      return ema;
    });
  }, [candles]);

  const ema50Series = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const k = 2 / (50 + 1);
    let ema = candles[0].close;
    return candles.map((c) => {
      ema = c.close * k + ema * (1 - k);
      return ema;
    });
  }, [candles]);

  const vwapSeries = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    let cumVol = 0;
    let cumVolPrice = 0;
    return candles.map((c) => {
      const typical = (c.high + c.low + c.close) / 3;
      cumVol += c.volume || 1;
      cumVolPrice += typical * (c.volume || 1);
      return cumVol > 0 ? cumVolPrice / cumVol : c.close;
    });
  }, [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;

    // Clear canvas
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, chartHeight);

    // Padding
    const padTop = 30;
    const padBottom = 30;
    const padRight = 65;
    const padLeft = 10;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = chartHeight - padTop - padBottom;

    // Find min and max price across candles & key levels
    let minPrice = Math.min(...candles.map((c) => c.low));
    let maxPrice = Math.max(...candles.map((c) => c.high));

    if (showTradePlan && tradeSetup) {
      if (tradeSetup.stop_loss > 0) minPrice = Math.min(minPrice, tradeSetup.stop_loss * 0.995);
      if (tradeSetup.target_2 > 0) maxPrice = Math.max(maxPrice, tradeSetup.target_2 * 1.005);
    }

    const priceMargin = (maxPrice - minPrice) * 0.08 || 5;
    minPrice -= priceMargin;
    maxPrice += priceMargin;
    const priceRange = maxPrice - minPrice;

    const getY = (price: number) => {
      return padTop + plotHeight - ((price - minPrice) / priceRange) * plotHeight;
    };

    const count = candles.length;
    const candleWidth = Math.max(2, (plotWidth / count) * 0.7);
    const step = plotWidth / count;

    // Draw Grid Lines
    ctx.strokeStyle = '#161d2d';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const p = minPrice + (priceRange / gridSteps) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      // Price label on right axis
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`₹${p.toFixed(1)}`, width - padRight + 6, y + 3);
    }

    // Draw Support & Resistance horizontal lines if enabled
    if (showSRLevels && supportResistance) {
      // Resistance Line
      if (supportResistance.nearest_resistance > 0) {
        const resY = getY(supportResistance.nearest_resistance);
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, resY);
        ctx.lineTo(width - padRight, resY);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`RES ₹${supportResistance.nearest_resistance}`, padLeft + 6, resY - 4);
      }

      // Support Line
      if (supportResistance.nearest_support > 0) {
        const supY = getY(supportResistance.nearest_support);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, supY);
        ctx.lineTo(width - padRight, supY);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`SUP ₹${supportResistance.nearest_support}`, padLeft + 6, supY - 4);
      }
      ctx.setLineDash([]);
    }

    // Draw Trade Setup Targets & SL if enabled
    if (showTradePlan && tradeSetup) {
      // Stop Loss Red Line
      if (tradeSetup.stop_loss > 0) {
        const slY = getY(tradeSetup.stop_loss);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, slY);
        ctx.lineTo(width - padRight, slY);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(width - padRight, slY - 9, padRight, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`SL ₹${tradeSetup.stop_loss}`, width - padRight + 4, slY + 3);
      }

      // Target 1 Green Line
      if (tradeSetup.target_1 > 0) {
        const t1Y = getY(tradeSetup.target_1);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, t1Y);
        ctx.lineTo(width - padRight, t1Y);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.fillRect(width - padRight, t1Y - 9, padRight, 18);
        ctx.fillStyle = '#06090e';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`T1 ₹${tradeSetup.target_1}`, width - padRight + 4, t1Y + 3);
      }

      // Target 2 Green Line
      if (tradeSetup.target_2 > 0) {
        const t2Y = getY(tradeSetup.target_2);
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padLeft, t2Y);
        ctx.lineTo(width - padRight, t2Y);
        ctx.stroke();

        ctx.fillStyle = '#059669';
        ctx.fillRect(width - padRight, t2Y - 9, padRight, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.fillText(`T2 ₹${tradeSetup.target_2}`, width - padRight + 4, t2Y + 3);
      }
    }

    // Draw EMA Overlay Lines
    const drawLineSeries = (series: number[], color: string, widthPx: number = 1.5) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = widthPx;
      ctx.beginPath();
      for (let i = 0; i < series.length; i++) {
        const x = padLeft + i * step + step / 2;
        const y = getY(series[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    if (showEMA20 && ema20Series.length > 0) {
      drawLineSeries(ema20Series, '#f59e0b', 1.5);
    }
    if (showEMA50 && ema50Series.length > 0) {
      drawLineSeries(ema50Series, '#3b82f6', 1.5);
    }
    if (showVWAP && vwapSeries.length > 0) {
      drawLineSeries(vwapSeries, '#06b6d4', 1.5);
    }

    // Draw Candlesticks
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = padLeft + i * step + step / 2;
      const isUp = c.close >= c.open;

      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const color = isUp ? '#10b981' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }

    // Time Axis Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(count / 6));
    for (let i = 0; i < count; i += labelStep) {
      const x = padLeft + i * step + step / 2;
      const timeStr = candles[i].time.split(' ')[1] || candles[i].time.split('T')[1] || candles[i].time;
      ctx.fillText(timeStr.slice(0, 5), x, chartHeight - 10);
    }
  }, [candles, ema20Series, ema50Series, vwapSeries, showEMA20, showEMA50, showVWAP, showSRLevels, showTradePlan, supportResistance, tradeSetup]);

  // Handle Mouse Hover for Tooltip
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 10;
    const padRight = 65;
    const plotWidth = rect.width - padLeft - padRight;
    const step = plotWidth / candles.length;

    const idx = Math.floor((x - padLeft) / step);
    if (idx >= 0 && idx < candles.length) {
      setHoveredCandle(candles[idx]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredCandle(null);
  };

  const latestCandle = candles[candles.length - 1];
  const activeCandle = hoveredCandle || latestCandle;

  return (
    <div ref={containerRef} className="bg-dark-900 border border-dark-750 rounded-xl p-3 flex flex-col relative">
      {/* Top Header with Indicator Toggles and OHLC Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-dark-750/80">
        {/* OHLC Bar */}
        {activeCandle && (
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="text-slate-400">Time: <span className="text-slate-200">{activeCandle.time}</span></span>
            <span className="text-slate-400">O: <span className="text-white font-bold">{activeCandle.open}</span></span>
            <span className="text-slate-400">H: <span className="text-bull font-bold">{activeCandle.high}</span></span>
            <span className="text-slate-400">L: <span className="text-bear font-bold">{activeCandle.low}</span></span>
            <span className="text-slate-400">C: <span className={activeCandle.close >= activeCandle.open ? 'text-bull font-bold' : 'text-bear font-bold'}>{activeCandle.close}</span></span>
            <span className="text-slate-400">Vol: <span className="text-slate-300 font-bold">{activeCandle.volume.toLocaleString('en-IN')}</span></span>
          </div>
        )}

        {/* Overlay Indicator Toggles */}
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <button
            onClick={() => setShowEMA20(!showEMA20)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showEMA20
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                : 'bg-dark-800 text-slate-500 border-dark-700'
            }`}
          >
            EMA 20
          </button>
          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showEMA50
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold'
                : 'bg-dark-800 text-slate-500 border-dark-700'
            }`}
          >
            EMA 50
          </button>
          <button
            onClick={() => setShowVWAP(!showVWAP)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showVWAP
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold'
                : 'bg-dark-800 text-slate-500 border-dark-700'
            }`}
          >
            VWAP
          </button>
          <button
            onClick={() => setShowSRLevels(!showSRLevels)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showSRLevels
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold'
                : 'bg-dark-800 text-slate-500 border-dark-700'
            }`}
          >
            S/R Zones
          </button>
          <button
            onClick={() => setShowTradePlan(!showTradePlan)}
            className={`px-2 py-0.5 rounded border transition-colors ${
              showTradePlan
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                : 'bg-dark-800 text-slate-500 border-dark-700'
            }`}
          >
            Trade Plan (SL/TP)
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair rounded-lg"
      />
    </div>
  );
};
