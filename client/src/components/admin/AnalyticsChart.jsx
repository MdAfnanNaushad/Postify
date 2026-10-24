import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export const AnalyticsChart = ({
  type = 'area', // 'area' | 'line' | 'bar' | 'pie'
  data = [],
  series = [], // [{ dataKey: 'newUsers', name: 'New Users', stroke: '#007aff', fill: '#007aff' }]
  xAxisKey = 'date',
  height = 300,
  emptyMessage = 'No data recorded for this time range.'
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const gridColor = isDark ? '#2c2c38' : 'rgba(0, 0, 0, 0.06)';
  const textColor = isDark ? '#9292a3' : '#636363';
  const tooltipBg = isDark ? '#191922' : '#ffffff';
  const tooltipBorder = isDark ? '#2c2c38' : 'rgba(0, 0, 0, 0.1)';

  const defaultColors = ['#007aff', '#7a7fd4', '#c98ab5', '#e8a87c', '#10b981', '#f59e0b'];

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height, borderRadius: '6px' }}
        className="w-full flex items-center justify-center rounded-[6px] border border-dashed border-[var(--portal-card-border)] text-xs text-[var(--portal-meta)]"
      >
        {emptyMessage}
      </div>
    );
  }

  const renderTooltip = () => (
    <Tooltip
      contentStyle={{
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderRadius: '6px',
        color: isDark ? '#f5f5f7' : '#000000',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        padding: '8px 12px'
      }}
      itemStyle={{ padding: '2px 0' }}
    />
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' && (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {series.map((s, idx) => {
                const color = s.stroke || defaultColors[idx % defaultColors.length];
                return (
                  <linearGradient key={s.dataKey} id={`grad_${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} allowDecimals={false} />
            {renderTooltip()}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
            {series.map((s, idx) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                stroke={s.stroke || defaultColors[idx % defaultColors.length]}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad_${s.dataKey})`}
              />
            ))}
          </AreaChart>
        )}

        {type === 'line' && (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} allowDecimals={false} />
            {renderTooltip()}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
            {series.map((s, idx) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                stroke={s.stroke || defaultColors[idx % defaultColors.length]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: s.stroke || defaultColors[idx % defaultColors.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        )}

        {type === 'bar' && (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey={xAxisKey} stroke={textColor} fontSize={11} tickLine={false} />
            <YAxis stroke={textColor} fontSize={11} tickLine={false} allowDecimals={false} />
            {renderTooltip()}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
            {series.map((s, idx) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name || s.dataKey}
                fill={s.fill || defaultColors[idx % defaultColors.length]}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        )}

        {type === 'pie' && (
          <PieChart>
            {renderTooltip()}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
