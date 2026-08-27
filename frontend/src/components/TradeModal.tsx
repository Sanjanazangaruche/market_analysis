import React, { useState } from 'react';
import { X, ShieldCheck, DollarSign, Target, ShieldAlert, ArrowRight } from 'lucide-react';
import { StockScanResult } from '../types';
import { paperTradesApi } from '../services/api';

interface TradeModalProps {
  item: StockScanResult | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({ item, onClose, onSuccess }) => {
  if (!item || !item.trade_setup) return null;

  const setup = item.trade_setup;
  const isBull = !item.breakout_signal.signal_type.includes('BEARISH');

  const [quantity, setQuantity] = useState<number>(25);
  const [entryPrice, setEntryPrice] = useState<number>(item.current_price);
  const [stopLoss, setStopLoss] = useState<number>(setup.stop_loss);
  const [target1, setTarget1] = useState<number>(setup.target_1);
  const [target2, setTarget2] = useState<number>(setup.target_2);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const totalCapitalRequired = Math.round(entryPrice * quantity);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const totalRisk = Math.round(riskPerShare * quantity);
  const potentialProfitT2 = Math.round(Math.abs(target2 - entryPrice) * quantity);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await paperTradesApi.placeOrder({
        symbol: item.symbol,
        exchange: item.exchange,
        signal_type: isBull ? 'BUY' : 'SELL',
        entry_price: entryPrice,
        quantity: quantity,
        stop_loss: stopLoss,
        target_1: target1,
        target_2: target2
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to place paper trade order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-dark-750 flex items-center justify-between bg-dark-850">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${isBull ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'}`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Execute Paper Trade</h3>
              <p className="text-xs text-slate-400 font-mono">
                {item.symbol} ({item.exchange}) • {isBull ? 'LONG / BUY' : 'SHORT / SELL'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-dark-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handlePlaceOrder} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Setup Summary Card */}
          <div className="bg-dark-800 rounded-xl p-3.5 border border-dark-700 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Current Market Price:</span>
              <span className="font-bold text-white">₹{item.current_price}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Breakout Score:</span>
              <span className="font-bold text-bull">{item.score_breakdown.total_score}/100</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Risk/Reward:</span>
              <span className="font-bold text-cyan-400">1:{setup.risk_reward_ratio}</span>
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 font-mono mb-1">Quantity (Shares)</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-bull focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 font-mono mb-1">Entry Price (₹)</label>
              <input
                type="number"
                step="0.05"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-bull focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-rose-400 font-mono mb-1 flex items-center">
                <ShieldAlert className="w-3 h-3 mr-1" /> Stop Loss (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-rose-300 font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-bull font-mono mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1" /> Target 1 (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={target1}
                onChange={(e) => setTarget1(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono focus:border-bull focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-bull font-mono mb-1 flex items-center">
                <Target className="w-3 h-3 mr-1" /> Major Target 2 (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={target2}
                onChange={(e) => setTarget2(parseFloat(e.target.value) || 0)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-emerald-300 font-mono focus:border-bull focus:outline-none"
              />
            </div>
          </div>

          {/* Financial Risk Estimation */}
          <div className="bg-dark-950 rounded-xl p-3.5 border border-dark-750 grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Position Size</span>
              <span className="text-xs font-bold text-white">₹{totalCapitalRequired.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 block">Total Risk</span>
              <span className="text-xs font-bold text-rose-400">₹{totalRisk.toLocaleString('en-IN')}</span>
            </div>
            <div>
              <span className="text-[10px] text-bull block">Est. Profit (T2)</span>
              <span className="text-xs font-bold text-bull">₹{potentialProfitT2.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-bull to-emerald-600 hover:from-bull-light hover:to-emerald-500 text-dark-950 font-bold text-sm shadow-lg shadow-bull/20 transition-all flex items-center justify-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Placing Simulated Order...' : `Confirm Paper ${isBull ? 'BUY' : 'SELL'} Order`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
