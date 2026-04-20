'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import type { ProgressDataPoint } from '@/types'

const CHART_THEME = {
  grid: 'rgba(255,255,255,0.04)',
  axis: 'rgba(255,255,255,0.2)',
  tooltip: {
    contentStyle: {
      background: '#1a1a22',
      border: '1px solid #2a2a3a',
      borderRadius: '10px',
      fontSize: '12px',
      color: '#f2f2f8',
    },
    labelStyle: { color: '#a0a0b8', marginBottom: 4 },
  },
}

interface ProgressChartsProps {
  data: ProgressDataPoint[]
}

export function ProgressCharts({ data }: ProgressChartsProps) {
  return (
    <div className="space-y-6">
      {/* Freeze Resilience — the headline chart */}
      <Card className="p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-1">
          Freeze Resilience Score
        </p>
        <p className="text-xs text-text-muted mb-6">Your signature metric over time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fill: CHART_THEME.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: CHART_THEME.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_THEME.tooltip} />
            <Line
              type="monotone"
              dataKey="freeze_resilience_score"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#6366f1', stroke: '#6366f140', strokeWidth: 4 }}
              name="Freeze Resilience"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* All scores */}
      <Card className="p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-6">
          All scores over time
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fill: CHART_THEME.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fill: CHART_THEME.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_THEME.tooltip} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#a0a0b8', paddingTop: 8 }} />
            <Line type="monotone" dataKey="clarity_score" stroke="#10b981" strokeWidth={1.5} dot={false} name="Clarity" />
            <Line type="monotone" dataKey="structure_score" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Structure" />
            <Line type="monotone" dataKey="composure_score" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Composure" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Timing metrics */}
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="p-6">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-6">
            Time to first sentence (ms)
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="date" tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_THEME.tooltip} formatter={(v: number) => [`${(v/1000).toFixed(1)}s`, 'Time to start']} />
              <Bar dataKey="time_to_first_sentence_ms" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.8} name="Time to start (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-6">
            Words per minute
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
              <XAxis dataKey="date" tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...CHART_THEME.tooltip} />
              <Bar dataKey="words_per_minute" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} name="WPM" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Filler frequency */}
      <Card className="p-6">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-6">
          Filler words per minute
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
            <XAxis dataKey="date" tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: CHART_THEME.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...CHART_THEME.tooltip} />
            <Bar dataKey="filler_per_minute" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.7} name="Fillers/min" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
