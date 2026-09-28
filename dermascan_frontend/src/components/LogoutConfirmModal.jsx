import React from 'react'
import { LogOut, X } from 'lucide-react'

export default function LogoutConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-5">
          <LogOut className="h-8 w-8 text-red-600" />
        </div>

        {/* Title */}
        <h2
          id="logout-modal-title"
          className="text-xl font-bold text-gray-900 text-center mb-2"
        >
          Sign out of DermaScan?
        </h2>
        <p className="text-gray-500 text-sm text-center mb-7">
          Are you sure you want to logout? You will need to sign in again to access your account.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-secondary rounded-xl py-2.5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  )
}
