import React, { useRef, useEffect } from 'react';

interface EquityCurvePoint {
  time: string;
  equity: number;
  pnl?: number;
}

interface EquityCurveChartProps {
  data: EquityCurvePoint[];
  height?: number;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ data, height = 240 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

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

    const padTop = 20;
    const padBottom = 25;
    const padRight = 75;
    const padLeft = 15;
    const plotWidth = width - padLeft - padRight;
    const plotHeight = chartHeight - padTop - padBottom;

    const equities = data.map((d) => d.equity);
    let minEquity = Math.min(...equities);
    let maxEquity = Math.max(...equities);
    const range = (maxEquity - minEquity) || 1000;
    minEquity -= range * 0.05;
    maxEquity += range * 0.05;
    const totalRange = maxEquity - minEquity;

    const getY = (val: number) => padTop + plotHeight - ((val - minEquity) / totalRange) * plotHeight;
    const step = plotWidth / (data.length - 1 || 1);

    // Horizontal Grid Lines
    ctx.strokeStyle = '#161d2d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const eq = minEquity + (totalRange / 4) * i;
      const y = getY(eq);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`₹${Math.round(eq).toLocaleString('en-IN')}`, width - padRight + 6, y + 3);
    }

    // Gradient fill under equity line
    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + plotHeight);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotHeight);
    for (let i = 0; i < data.length; i++) {
      const x = padLeft + i * step;
      const y = getY(data[i].equity);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(padLeft + (data.length - 1) * step, padTop + plotHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Equity Line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = padLeft + i * step;
      const y = getY(data[i].equity);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Latest value marker
    const lastX = padLeft + (data.length - 1) * step;
    const lastY = getY(data[data.length - 1].equity);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [data]);

  return (
    <div className="bg-dark-900 border border-dark-750 rounded-xl p-3">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="rounded-lg"
      />
    </div>
  );
};
