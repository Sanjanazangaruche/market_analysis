import { AlertItem } from '../types';

class NotificationService {
  private permissionGranted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      this.permissionGranted = perm === 'granted';
      return this.permissionGranted;
    }
    return false;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public isGranted(): boolean {
    return this.permissionGranted;
  }

  public showBreakoutNotification(alert: AlertItem) {
    if (!this.permissionGranted || typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      const isBull = !alert.breakout_type.includes('BEARISH');
      const isHighConf = (alert.ai_confidence ?? 0) >= 90;
      const holding = alert.holding_period || 'Swing Entry (3 - 7 Days)';
      const title = `${isHighConf ? '🔥 [90%+ AI CONFIDENCE] ' : '🚨 '}${isBull ? 'BULLISH BREAKOUT' : 'BEARISH BREAKDOWN'}: ${alert.symbol} (${alert.exchange})`;
      const body = `🎯 Holding: ${holding}\n💰 Entry: ₹${alert.entry_min} - ₹${alert.entry_max} | SL: ₹${alert.stop_loss}\n🎯 Targets: T1 ₹${alert.target_1} | T2 ₹${alert.target_2} (R:R 1:${alert.risk_reward})\n⭐ AI Confidence: ${alert.ai_confidence}% | Score: ${alert.score}/100`;

      const notification = new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2310b981"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>',
        requireInteraction: false,
        silent: true, // We play our custom audio chime
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.warn('Notification error:', e);
    }
  }
}

export const notificationService = new NotificationService();
