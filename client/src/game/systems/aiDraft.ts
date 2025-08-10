import { UnitType, UNIT_COSTS, type DraftUnit } from 'shared'

export function generateAIDraft(budget: number, maxHeadcount: number): DraftUnit[] {
  const draft: DraftUnit[] = []
  let remainingBudget = budget
  
  // AI strategy: Balance of offense, defense, and support
  // Priority: 1 Executive if affordable, 2-3 mid-tier, fill with Interns
  
  // Try to get an Executive for leadership bonus
  if (remainingBudget >= UNIT_COSTS[UnitType.EXECUTIVE] && maxHeadcount > 0) {
    draft.push({ type: UnitType.EXECUTIVE })
    remainingBudget -= UNIT_COSTS[UnitType.EXECUTIVE]
    maxHeadcount--
  }
  
  // Add some mid-tier units for balanced gameplay
  const midTierUnits = [
    UnitType.HR_MANAGER, 
    UnitType.IT_SPECIALIST, 
    UnitType.ACCOUNTANT,
    UnitType.LEGAL_COUNSEL
  ]
  
  // Add 2-3 mid-tier units if budget allows
  const midTierCount = Math.min(3, Math.floor(remainingBudget / 40), maxHeadcount)
  for (let i = 0; i < midTierCount; i++) {
    const availableMidTier = midTierUnits.filter(unitType => 
      UNIT_COSTS[unitType] <= remainingBudget
    )
    
    if (availableMidTier.length > 0) {
      const selectedUnit = availableMidTier[Math.floor(Math.random() * availableMidTier.length)]
      draft.push({ type: selectedUnit })
      remainingBudget -= UNIT_COSTS[selectedUnit]
      maxHeadcount--
    }
  }
  
  // Fill remaining slots with Interns for cost efficiency
  while (maxHeadcount > 0 && remainingBudget >= UNIT_COSTS[UnitType.INTERN]) {
    draft.push({ type: UnitType.INTERN })
    remainingBudget -= UNIT_COSTS[UnitType.INTERN]
    maxHeadcount--
  }
  
  // Ensure at least 3 units for viability
  if (draft.length < 3) {
    // If we don't have enough units, add more Interns even if it exceeds budget
    while (draft.length < 3) {
      draft.push({ type: UnitType.INTERN })
    }
  }
  
  return draft
}
