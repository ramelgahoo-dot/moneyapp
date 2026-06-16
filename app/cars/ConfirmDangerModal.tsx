'use client'

import { createPortal } from 'react-dom'

interface ConfirmDangerModalProps {
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  error: string
  onCancel: () => void
  onConfirm: () => void
  tone?: 'danger' | 'warning'
}

export default function ConfirmDangerModal({
  title,
  message,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
  tone = 'danger',
}: ConfirmDangerModalProps) {
  const confirmButtonClass =
    tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500'
      : 'bg-red-600 hover:bg-red-500'

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300">{message}</p>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-sm text-gray-400 hover:text-white disabled:opacity-60 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`${confirmButtonClass} disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}