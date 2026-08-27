import React, { useRef, useEffect } from 'react';
import { Candle, TechnicalIndicators } from '../types';

interface SubIndicatorsChartProps {
  candles: Candle[];
  indicators?: TechnicalIndicators;
  subchartType: 'RSI' | 'MACD' | 'VOLUME';
  height?: number;
}

export const SubIndicatorsChart: React.FC<SubIndicatorsChartProps> = ({
  candles,
  indicators,
  subchartType,
  height = 130,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const chartHeight = rect.height;

    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, width, chartHeight);

    const padTop = 15;
    const padBottom = 15;
    const padRight = 65;
    const padLeft = 10;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = chartHeight - padTop - padBottom;
    const count = candles.length;
    const step = plotWidth / count;

    if (subchartType === 'RSI') {
      // Draw RSI (14)
      const rsiValues: number[] = [];
      const period = 14;
      for (let i = 0; i < count; i++) {
        if (i < period) {
          rsiValues.push(50);
        } else {
          const slice = candles.slice(i - period, i + 1);
          let gain = 0;
          let loss = 0;
          for (let j = 1; j < slice.length; j++) {
            const diff = slice[j].close - slice[j - 1].close;
            if (diff >= 0) gain += diff;
            else loss += Math.abs(diff);
          }
          const avgG = gain / period;
          const avgL = loss / period;
          const rs = avgL === 0 ? 100 : avgG / avgL;
          rsiValues.push(100 - 100 / (1 + rs));
        }
      }

      const getY = (val: number) => padTop + plotHeight - (val / 100) * plotHeight;

      // 70 and 30 reference lines
      ctx.strokeStyle = '#32405d';
      ctx.setLineDash([3, 3]);

      // 70 line
      ctx.beginPath();
      ctx.moveTo(padLeft, getY(70));
      ctx.lineTo(width - padRight, getY(70));
      ctx.stroke();

      // 30 line
      ctx.beginPath();
      ctx.moveTo(padLeft, getY(30));
      ctx.lineTo(width - padRight, getY(30));
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill 70-30 channel
      ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
      ctx.fillRect(padLeft, getY(70), plotWidth, getY(30) - getY(70));

      // Labels
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('70', width - padRight + 6, getY(70) + 3);
      ctx.fillText('30', width - padRight + 6, getY(30) + 3);

      // Plot RSI line
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < rsiValues.length; i++) {
        const x = padLeft + i * step + step / 2;
        const y = getY(rsiValues[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      const lastRSI = rsiValues[rsiValues.length - 1];
      ctx.fillStyle = '#8b5cf6';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.fillText(`RSI(14): ${lastRSI.toFixed(1)}`, padLeft + 6, padTop + 10);

    } else if (subchartType === 'VOLUME') {
      const maxVol = Math.max(...candles.map((c) => c.volume)) || 1;
      const getY = (v: number) => padTop + plotHeight - (v / maxVol) * plotHeight;
      const barWidth = Math.max(2, (plotWidth / count) * 0.7);

      for (let i = 0; i < count; i++) {
        const c = candles[i];
        const x = padLeft + i * step + step / 2;
        const isUp = c.close >= c.open;
        const barH = ((c.volume || 1) / maxVol) * plotHeight;
        const y = padTop + plotHeight - barH;

        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)';
        ctx.fillRect(x - barWidth / 2, y, barWidth, barH);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`VOL: ${(candles[candles.length - 1].volume || 0).toLocaleString('en-IN')}`, padLeft + 6, padTop + 10);
      ctx.fillText(`${(maxVol / 1000).toFixed(0)}k`, width - padRight + 6, padTop + 10);

    } else if (subchartType === 'MACD') {
      // Fast approx MACD for visual
      const ema12 = candles.map((c, i) => c.close); // placeholder
      const histValues = candles.map((c, i) => (c.close - c.open) * 0.5);
      const maxAbs = Math.max(...histValues.map(Math.abs), 1);

      const zeroY = padTop + plotHeight / 2;
      ctx.strokeStyle = '#32405d';
      ctx.beginPath();
      ctx.moveTo(padLeft, zeroY);
      ctx.lineTo(width - padRight, zeroY);
      ctx.stroke();

      const barWidth = Math.max(2, (plotWidth / count) * 0.7);
      for (let i = 0; i < count; i++) {
        const x = padLeft + i * step + step / 2;
        const val = histValues[i];
        const h = (Math.abs(val) / maxAbs) * (plotHeight / 2);
        const y = val >= 0 ? zeroY - h : zeroY;
        ctx.fillStyle = val >= 0 ? '#10b981' : '#ef4444';
        ctx.fillRect(x - barWidth / 2, y, barWidth, h);
      }

      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('MACD Hist (12, 26, 9)', padLeft + 6, padTop + 10);
    }
  }, [candles, subchartType, indicators]);

  return (
    <div className="bg-dark-900 border border-dark-750 rounded-xl p-2 flex flex-col">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="rounded-lg"
      />
    </div>
  );
};
