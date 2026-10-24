import React, { useState, useEffect, useId } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Animated count-up component for KPI metrics
 */
const AnimatedCounter = ({ value, duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Extract numeric portion if value is string like "28%" or "45 ms"
  const rawStr = String(value ?? '');
  const numericMatch = rawStr.match(/[-+]?[0-9]*\.?[0-9]+/);
  const numericValue = numericMatch ? parseFloat(numericMatch[0]) : null;
  const isNumeric = numericValue !== null && !isNaN(numericValue) && isFinite(numericValue);

  const suffix = isNumeric ? rawStr.replace(numericMatch[0], '').trim() : '';
  const isDecimal = isNumeric && numericMatch[0].includes('.');

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp = null;
    const startVal = 0;
    const endVal = numericValue;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo for crisp, premium feel
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (endVal - startVal) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    const reqId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(reqId);
  }, [numericValue, isNumeric, duration, value]);

  if (!isNumeric) return <span>{value ?? '—'}</span>;

  return (
    <span>
      {isDecimal
        ? Number(displayValue).toFixed(2)
        : Math.round(displayValue).toLocaleString()}
      {suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export const KpiCard = ({
  title,
  value,
  trend,
  trendLabel = 'vs previous period',
  subtitle,
  icon: Icon,
  accentColor = 'blue',
  sparkline = null
}) => {
  const filterId = useId();
  const isPositive = typeof trend === 'number' && trend > 0;
  const isNegative = typeof trend === 'number' && trend < 0;
  const isZero = typeof trend === 'number' && trend === 0;

  const colorStyles = {
    blue: {
      gradient: 'from-[#007aff]/15 to-[#7a7fd4]/10 text-[#007aff]',
      hex: '#007aff',
      stroke: '#007aff'
    },
    purple: {
      gradient: 'from-[#7a7fd4]/15 to-[#c98ab5]/10 text-[#7a7fd4]',
      hex: '#7a7fd4',
      stroke: '#7a7fd4'
    },
    rose: {
      gradient: 'from-rose-500/15 to-orange-500/10 text-rose-500',
      hex: '#f43f5e',
      stroke: '#f43f5e'
    },
    amber: {
      gradient: 'from-amber-500/15 to-yellow-500/10 text-amber-500',
      hex: '#f59e0b',
      stroke: '#f59e0b'
    },
    emerald: {
      gradient: 'from-emerald-500/15 to-teal-500/10 text-emerald-500',
      hex: '#10b981',
      stroke: '#10b981'
    }
  };

  const selectedColor = colorStyles[accentColor] || colorStyles.blue;

  // Build 6-8 synthetic or provided sparkline points for micro graph animation
  const generateSparklinePoints = () => {
    if (Array.isArray(sparkline) && sparkline.length >= 2) {
      return sparkline;
    }
    const num = typeof value === 'number' ? value : 20;
    const isUp = typeof trend === 'number' ? trend >= 0 : true;
    const base = Math.max(5, num * 0.7);
    if (isUp) {
      return [base * 0.8, base * 0.9, base * 0.85, base * 1.1, base * 1.05, num * 0.95, num];
    }
    return [num * 1.3, num * 1.25, num * 1.1, num * 1.15, num * 1.05, num * 1.02, num];
  };

  const points = generateSparklinePoints();
  const min = Math.min(...points);
  const max = Math.max(...points) || 1;
  const range = max - min || 1;

  // Map to SVG coordinates (width 100, height 28)
  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * 100;
    const y = 26 - ((p - min) / range) * 22;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = `M ${coords.join(' L ')}`;
  const areaPath = `M 0,28 L ${coords.join(' L ')} L 100,28 Z`;

  return (
    <div
      style={{ borderRadius: '6px' }}
      className="portal-card rounded-[6px] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 shadow-sm group"
    >
      {/* Ambient colorful backlight to complement the colored overlay */}
      <div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 opacity-20 dark:opacity-35 group-hover:opacity-45"
        style={{
          background: `radial-gradient(circle, ${selectedColor.hex} 0%, rgba(236,72,153,0.35) 60%, transparent 100%)`
        }}
      />

      {/* Postify Authentic Colored Layout Overlay in Bottom-Right Corner */}
      <div className="absolute -bottom-3 -right-3 w-22 h-22 sm:w-24 sm:h-24 pointer-events-none opacity-30 dark:opacity-45 group-hover:opacity-65 dark:group-hover:opacity-75 select-none overflow-hidden flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
        <img
          src="/postifylogo2.png"
          alt=""
          className="w-full h-full object-contain transform translate-x-1.5 translate-y-1.5 drop-shadow-sm"
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--portal-subtle)]">
              {title}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--portal-heading)]">
              <AnimatedCounter value={value} />
            </div>
          </div>

          {Icon && (
            <div
              style={{ borderRadius: '6px' }}
              className={`w-9 h-9 rounded-[6px] bg-gradient-to-br ${selectedColor.gradient} flex items-center justify-center shrink-0 border border-white/10 shadow-xs`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Micro Graph Sparkline with SVG Stroke & Fill Animation */}
        <div className="w-full h-8 mt-2 relative overflow-hidden">
          <svg
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 28"
          >
            <defs>
              <linearGradient id={`spark-grad-${filterId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={selectedColor.hex} stopOpacity="0.28" />
                <stop offset="100%" stopColor={selectedColor.hex} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={areaPath}
              fill={`url(#spark-grad-${filterId})`}
              className="transition-all duration-700 ease-out"
            />
            <path
              d={linePath}
              fill="none"
              stroke={selectedColor.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
        </div>
      </div>

      {/* Subtitle / Trend Badge Footer */}
      {(typeof trend === 'number' || subtitle) && (
        <div className="relative z-10 mt-3 pt-2.5 border-t border-[var(--portal-card-border)] flex items-center justify-between text-xs">
          {typeof trend === 'number' ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                style={{ borderRadius: '4px' }}
                className={`flex items-center font-bold px-1.5 py-0.5 rounded-[4px] text-[10px] shrink-0 ${
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : isNegative
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-zinc-500/10 text-zinc-500'
                }`}
              >
                {isPositive && <TrendingUp className="w-3 h-3 mr-0.5 inline" />}
                {isNegative && <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                {isZero && <Minus className="w-3 h-3 mr-0.5 inline" />}
                {isPositive ? `+${trend}%` : `${trend}%`}
              </span>
              <span className="text-[var(--portal-meta)] text-[11px] truncate">{trendLabel}</span>
            </div>
          ) : (
            <span className="text-[var(--portal-meta)] text-[11px] truncate">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};
