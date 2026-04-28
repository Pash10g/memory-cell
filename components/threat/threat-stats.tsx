'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Bug, TrendingUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CveStats {
  total: number
  anomalies: number
  cvss: {
    average: number
    max: number
    min: number
  }
  bySeverity: Array<{ severity: string; count: number }>
  byExploitStatus: Array<{ status: string; count: number }>
  criticalCves: Array<{
    cve_id: string
    cvss_score: number
    vulnerability_type: string
    exploit_status: string
  }>
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-severity-critical text-white',
  HIGH: 'bg-severity-high text-white',
  MEDIUM: 'bg-severity-medium text-background',
  LOW: 'bg-severity-low text-white',
  INFO: 'bg-severity-info text-white',
}

const SEVERITY_TEXT_COLORS: Record<string, string> = {
  CRITICAL: 'text-severity-critical',
  HIGH: 'text-severity-high',
  MEDIUM: 'text-severity-medium',
  LOW: 'text-severity-low',
}

export function ThreatStats() {
  const [stats, setStats] = useState<CveStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cve/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const data = await res.json()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cell-accent" />
            <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Threat Intelligence
            </span>
          </div>
          <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-cell-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertTriangle className="w-6 h-6 text-severity-high" />
        <p className="text-xs font-mono text-muted-foreground">
          {error || 'No data available'}
        </p>
        <button
          onClick={fetchStats}
          className="text-xs font-mono text-cell-accent hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const exploitsAvailable =
    stats.byExploitStatus.find((s) => s.status === 'Exploit Available')?.count || 0

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cell-accent" />
          <span className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            Threat Intel
          </span>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="text-muted-foreground hover:text-cell-accent transition-colors"
          title="Refresh stats"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Bug}
          label="Total CVEs"
          value={stats.total.toLocaleString()}
          color="text-cell-accent"
        />
        <StatCard
          icon={AlertTriangle}
          label="With Exploits"
          value={exploitsAvailable.toLocaleString()}
          color="text-severity-critical"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg CVSS"
          value={stats.cvss.average.toFixed(1)}
          color="text-severity-medium"
        />
        <StatCard
          icon={Shield}
          label="Anomalies"
          value={stats.anomalies.toLocaleString()}
          color="text-severity-high"
        />
      </div>

      {/* Severity Breakdown */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          By Severity
        </p>
        <div className="flex flex-col gap-1">
          {stats.bySeverity.map((s) => (
            <div key={s.severity} className="flex items-center gap-2">
              <span
                className={cn(
                  'px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded',
                  SEVERITY_COLORS[s.severity] || 'bg-muted text-muted-foreground'
                )}
              >
                {s.severity}
              </span>
              <div className="flex-1 h-1.5 bg-cell-surface rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    s.severity === 'CRITICAL' && 'bg-severity-critical',
                    s.severity === 'HIGH' && 'bg-severity-high',
                    s.severity === 'MEDIUM' && 'bg-severity-medium',
                    s.severity === 'LOW' && 'bg-severity-low'
                  )}
                  style={{
                    width: `${Math.min(100, (s.count / stats.total) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                {s.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical CVEs */}
      {stats.criticalCves && stats.criticalCves.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Critical Threats
          </p>
          <div className="flex flex-col gap-1">
            {stats.criticalCves.slice(0, 3).map((cve) => (
              <div
                key={cve.cve_id}
                className="flex items-center justify-between p-2 bg-cell-surface rounded-lg border border-cell-border"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] font-mono font-semibold text-foreground truncate">
                    {cve.cve_id}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate">
                    {cve.vulnerability_type}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-[10px] font-mono font-bold', SEVERITY_TEXT_COLORS.CRITICAL)}>
                    {cve.cvss_score.toFixed(1)}
                  </span>
                  {cve.exploit_status === 'Exploit Available' && (
                    <span className="px-1 py-0.5 text-[8px] font-mono bg-severity-critical/20 text-severity-critical rounded">
                      EXP
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-1 p-3 bg-cell-surface rounded-lg border border-cell-border">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-[9px] font-mono text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <span className={cn('text-lg font-mono font-bold', color)}>{value}</span>
    </div>
  )
}
