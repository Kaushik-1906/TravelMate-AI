import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { Bed, Utensils, Compass, Bus, Sparkles, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#0D9488', '#0284C7', '#F59E0B', '#10B981', '#64748B'];

export default function BudgetChart({ breakdown, totalBudget, estimatedTotal, currency = 'USD' }) {
  const { isDark } = useTheme();
  if (!breakdown) return null;

  const data = [
    { name: 'Accommodation', value: Number(breakdown.accommodation) || 0, icon: Bed, color: '#0D9488' },
    { name: 'Food & Dining', value: Number(breakdown.food) || 0, icon: Utensils, color: '#0284C7' },
    { name: 'Activities', value: Number(breakdown.activities) || 0, icon: Compass, color: '#F59E0B' },
    { name: 'Transportation', value: Number(breakdown.transportation) || 0, icon: Bus, color: '#10B981' },
    { name: 'Miscellaneous', value: Number(breakdown.miscellaneous) || 0, icon: Sparkles, color: '#64748B' },
  ].filter((item) => item.value > 0);

  const remaining = Number(totalBudget) - Number(estimatedTotal);
  const isOverBudget = remaining < 0;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-navy-100 shadow-card">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-navy-100 gap-2">
        <div>
          <h3 className="text-base font-bold text-navy-900">Estimated Budget Allocation</h3>
          <p className="text-xs text-navy-500">Breakdown of estimated expenses across key travel categories</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-navy-400 block font-medium">Estimated Total</span>
          <span className="text-lg font-extrabold text-navy-900">{formatCurrency(estimatedTotal, currency)}</span>
        </div>
      </div>

      {/* Over-budget warning banner */}
      {isOverBudget && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Estimated expenses exceed planned budget by {formatCurrency(Math.abs(remaining), currency)}. Consider reducing activity costs or choosing budget transit options.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Donut Chart */}
        <div className="lg:col-span-5 h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                stroke={isDark ? '#111C2E' : '#FFFFFF'}
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [formatCurrency(val, currency), 'Estimated']}
                contentStyle={{
                  borderRadius: '12px',
                  border: `1px solid ${isDark ? '#2C3D57' : '#E2E8F0'}`,
                  background: isDark ? '#111C2E' : '#FFFFFF',
                  color: isDark ? '#E2E8F0' : '#0F172A',
                  boxShadow: isDark
                    ? '0 8px 24px rgba(0, 0, 0, 0.45)'
                    : '0 4px 12px rgba(0, 0, 0, 0.05)',
                }}
                itemStyle={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
                labelStyle={{ color: isDark ? '#94A3B8' : '#64748B' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.map((cat, idx) => {
            const Icon = cat.icon;
            const percent = estimatedTotal > 0 ? Math.round((cat.value / estimatedTotal) * 100) : 0;
            return (
              <div
                key={cat.name}
                className="p-3 rounded-xl border border-navy-100 bg-background/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-navy-800 block">{cat.name}</span>
                    <span className="text-[11px] text-navy-400">{percent}% of total</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-navy-900">{formatCurrency(cat.value, currency)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
