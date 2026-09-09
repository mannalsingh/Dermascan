import React from 'react'
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react'

const config = {
  low:    { cls: 'badge-low',    icon: ShieldCheck,  label: 'Low Risk' },
  medium: { cls: 'badge-medium', icon: AlertTriangle, label: 'Medium Risk' },
  high:   { cls: 'badge-high',   icon: ShieldAlert,  label: 'High Risk' },
}

export default function RiskBadge({ level, showIcon = true, size = 'sm' }) {
  const key = (level || 'low').toLowerCase()
  const cfg = config[key] || config.low
  const Icon = cfg.icon

  return (
    <span className={cfg.cls}>
      {showIcon && <Icon className={`inline mr-1 ${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />}
      {cfg.label}
    </span>
  )
}

export function PredictionBadge({ prediction }) {
  const isMalignant = prediction?.toLowerCase() === 'malignant'
  return (
    <span className={isMalignant ? 'badge-malignant' : 'badge-benign'}>
      {isMalignant ? '⚠ Malignant' : '✓ Benign'}
    </span>
  )
}
