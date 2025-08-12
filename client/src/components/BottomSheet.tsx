import React, { useState, useEffect, useRef, useCallback } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  className?: string
  snapPoints?: number[] // Heights in pixels for different snap points
  initialSnapPoint?: number // Index of initial snap point
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  className = '',
  snapPoints = [200, 400, 600], // Default snap points
  initialSnapPoint = 0
}: BottomSheetProps) {
  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }, [])

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    
    const deltaY = e.touches[0].clientY - startY
    const newTranslateY = Math.max(0, deltaY)
    setTranslateY(newTranslateY)
    setCurrentY(e.touches[0].clientY)
  }, [isDragging, startY])

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    const deltaY = currentY - startY
    
    // Determine which snap point to go to
    if (deltaY > 100) {
      // Swipe down - close or go to lower snap point
      if (currentSnapPoint > 0) {
        setCurrentSnapPoint(currentSnapPoint - 1)
      } else {
        onClose()
      }
    } else if (deltaY < -100) {
      // Swipe up - go to higher snap point
      if (currentSnapPoint < snapPoints.length - 1) {
        setCurrentSnapPoint(currentSnapPoint + 1)
      }
    }
    
    setTranslateY(0)
  }, [isDragging, currentY, startY, currentSnapPoint, snapPoints.length, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Calculate current height based on snap point
  const currentHeight = snapPoints[currentSnapPoint] || snapPoints[0]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-xl shadow-2xl z-50 transition-all duration-300 ease-out ${className}`}
        style={{
          height: `${currentHeight}px`,
          transform: `translateY(${translateY}px)`,
          touchAction: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 pb-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Snap point indicators */}
        <div className="flex justify-center gap-2 pb-4">
          {snapPoints.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSnapPoint(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSnapPoint ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
