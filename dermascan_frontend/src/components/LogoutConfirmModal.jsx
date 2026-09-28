import React from 'react'
import { LogOut, X } from 'lucide-react'

export default function LogoutConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-[#102A43]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-scale"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-[#D9E5E3] w-full max-w-sm p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#829AB1] hover:text-[#102A43] transition-colors p-1 rounded-lg hover:bg-[#F5F9F9]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 bg-[#FDF0F0] border border-[#F1C4C4] rounded-2xl mx-auto mb-4 text-[#B42318] shadow-xs">
          <LogOut className="h-6 w-6 ml-0.5" />
        </div>

        {/* Title */}
        <h2
          id="logout-modal-title"
          className="text-lg font-bold text-[#102A43] mb-1.5"
        >
          Log out of DermaScan?
        </h2>
        <p className="text-[#486581] text-xs leading-relaxed mb-6">
          Are you sure you want to end your current session? You will need to sign in again to access your screening history and reports.
        </p>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-secondary text-sm py-2.5 rounded-xl font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 bg-[#B42318] hover:bg-[#991B1B] active:bg-[#7F1D1D] text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-150 text-sm flex items-center justify-center gap-1.5 shadow-xs"
          >
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
