import { useGameStore } from '../stores/gameStore'
import { UnitType, UNIT_STATS, UNIT_COSTS } from 'shared'

export function DraftScreen() {
  const { draftState, addUnitToDraft, removeUnitFromDraft, confirmDraft } = useGameStore()
  
  const totalCost = draftState.selectedUnits.reduce((sum, unit) => 
    sum + UNIT_COSTS[unit.type], 0
  )
  const remainingBudget = draftState.playerBudget - totalCost
  const canAddMore = draftState.selectedUnits.length < draftState.maxHeadcount && remainingBudget >= 20
  
  const handleAddUnit = (unitType: UnitType) => {
    if (canAddMore) {
      addUnitToDraft(unitType)
    }
  }
  
  const handleRemoveUnit = (index: number) => {
    removeUnitFromDraft(index)
  }
  
  const handleConfirmDraft = () => {
    if (draftState.selectedUnits.length >= 3) {
      confirmDraft()
    }
  }
  
  const canStartBattle = draftState.selectedUnits.length >= 3
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-2">Team Drafting</h1>
          <p className="text-slate-300 text-sm sm:text-base">Build your dream team for the ultimate HR battle!</p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left: Available Units */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-400">Available Units</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Object.values(UnitType).map((unitType) => {
                  const stats = UNIT_STATS[unitType]
                  const cost = UNIT_COSTS[unitType]
                  const canAfford = cost <= remainingBudget
                  const canAdd = canAddMore && canAfford
                  
                  return (
                    <div
                      key={unitType}
                      className={`bg-slate-700 rounded-lg p-3 sm:p-4 border-2 transition-all ${
                        canAdd ? 'border-green-500 hover:border-green-400' : 'border-slate-600 opacity-60'
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                          {unitType.charAt(0).toUpperCase()}
                        </div>
                        <h3 className="font-semibold text-xs sm:text-sm mb-1 capitalize">
                          {unitType.replace('_', ' ')}
                        </h3>
                        <p className="text-green-400 font-mono text-xs sm:text-sm mb-2">${cost}k</p>
                        
                        <div className="text-xs text-slate-300 space-y-1 mb-3">
                          <div>HP: {stats.hp}</div>
                          <div>Move: {stats.moveRange}</div>
                          <div>Attack: {stats.attackRange}/{stats.attackDamage}</div>
                        </div>
                        
                        <button
                          onClick={() => handleAddUnit(unitType)}
                          disabled={!canAdd}
                          className={`w-full py-2 px-2 sm:px-3 rounded text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                            canAdd
                              ? 'bg-green-600 hover:bg-green-500 text-white'
                              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {canAdd ? 'Add Unit' : 'Cannot Add'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          {/* Right: Team Roster & Controls */}
          <div className="space-y-4 sm:space-y-6">
            {/* Budget & Headcount */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-blue-400">Team Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Budget:</span>
                  <span className={`font-mono ${remainingBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${remainingBudget}k
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Headcount:</span>
                  <span className="font-mono">
                    {draftState.selectedUnits.length}/{draftState.maxHeadcount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-mono text-green-400">${totalCost}k</span>
                </div>
              </div>
            </div>
            
            {/* Selected Units */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-purple-400">Your Team</h2>
              {draftState.selectedUnits.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No units selected yet</p>
              ) : (
                <div className="space-y-3">
                  {draftState.selectedUnits.map((unit, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-700 rounded p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {unit.type.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium capitalize text-sm">
                            {unit.type.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-slate-400">
                            ${UNIT_COSTS[unit.type]}k
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveUnit(index)}
                        className="text-red-400 hover:text-red-300 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* AI Team Preview */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-red-400">AI Team</h2>
              <div className="space-y-2">
                {draftState.aiUnits.map((unit, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-slate-700 rounded p-2">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {unit.type.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm capitalize">
                      {unit.type.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Start Battle Button */}
            <button
              onClick={handleConfirmDraft}
              disabled={!canStartBattle}
              className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-base sm:text-lg font-bold transition-all min-h-[56px] ${
                canStartBattle
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              {canStartBattle ? 'Start Battle!' : 'Need at least 3 units'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
