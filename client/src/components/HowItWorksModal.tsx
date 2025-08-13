import React from 'react'

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="relative bg-slate-800 rounded-lg border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800">
              <h2 className="text-xl font-semibold text-blue-300">How to Play</h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-full hover:bg-slate-700"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Game Overview */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">Game Overview</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  HRmageddon is a turn-based tactical strategy game where you wage cubicle warfare for control of the office floor. 
                  Build your team, capture strategic positions, and outmaneuver your opponent in this satirical office battle.
                </p>
              </div>

              {/* Team Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Teams & Units</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                    <h4 className="text-blue-300 font-semibold mb-2">Blue Team (You)</h4>
                    <p className="text-slate-300 text-sm">You control the blue units. Each unit has unique abilities and stats.</p>
                  </div>
                  
                  <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                    <h4 className="text-red-300 font-semibold mb-2">Red Team (AI)</h4>
                    <p className="text-slate-300 text-sm">AI controls the red units. They will use strategic tactics against you.</p>
                  </div>
                </div>
              </div>

              {/* Gameplay Instructions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">How to Play</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-400 text-lg mt-1">•</span>
                    <div>
                      <strong className="text-slate-200">Objective:</strong>
                      <span className="text-slate-300 text-sm ml-2">Capture cubicles and eliminate enemy units to achieve victory.</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-green-400 text-lg mt-1">•</span>
                    <div>
                      <strong className="text-slate-200">Controls:</strong>
                      <span className="text-slate-300 text-sm ml-2">Tap units to select, tap tiles to move/attack.</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-yellow-400 text-lg mt-1">•</span>
                    <div>
                      <strong className="text-slate-200">End Turn:</strong>
                      <span className="text-slate-300 text-sm ml-2">Tap "End Turn" when you're done with your actions.</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <span className="text-purple-400 text-lg mt-1">•</span>
                    <div>
                      <strong className="text-slate-200">Abilities:</strong>
                      <span className="text-slate-300 text-sm ml-2">Select units to see their special abilities and costs.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile-Specific Tips */}
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-300 mb-3">📱 Mobile Tips</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>• <strong>Touch-Friendly:</strong> All buttons and tiles are optimized for touch interaction</p>
                  <p>• <strong>Responsive Design:</strong> Game automatically adapts to your screen size</p>
                  <p>• <strong>Gesture Support:</strong> Swipe and tap gestures for smooth gameplay</p>
                  <p>• <strong>Orientation:</strong> Works in both portrait and landscape modes</p>
                </div>
              </div>

              {/* Victory Conditions */}
              <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-300 mb-3">🏆 Victory Conditions</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <p>• <strong>Capture Points:</strong> Control 51% of available cubicles</p>
                  <p>• <strong>Elimination:</strong> Destroy all enemy units</p>
                  <p>• <strong>Strategic Positioning:</strong> Use terrain and abilities to your advantage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
