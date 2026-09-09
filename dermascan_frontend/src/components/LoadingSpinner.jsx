import React from 'react'

export default function LoadingSpinner({ size = 'md', className = '', text = '' }) {
  const sizeMap = {
    sm:  'h-4 w-4 border-2',
    md:  'h-8 w-8 border-2',
    lg:  'h-12 w-12 border-4',
    xl:  'h-16 w-16 border-4',
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-full border-blue-200 border-t-blue-600 animate-spin`}
      />
      {text && <p className="text-sm text-gray-500 animate-pulse">{text}</p>}
    </div>
  )
}
