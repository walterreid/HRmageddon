import { type DraftUnit } from 'shared'
import { dataManager } from '../data/DataManager'

export function generateAIDraft(budget: number, maxHeadcount: number): DraftUnit[] {
  const draft: DraftUnit[] = []
  let remainingBudget = budget
  
  // Get all available employees from DataManager
  const employees = dataManager.getAllEmployees()
  if (employees.length === 0) {
    console.error('No employees available for AI draft')
    return []
  }
  
  // Sort employees by cost (cheapest first)
  const sortedEmployees = employees.sort((a, b) => a.cost - b.cost)
  
  // AI strategy: Try to get a mix of units within budget
  // Priority: 1 expensive unit if affordable, then mid-tier, fill with cheapest
  
  // Try to get the most expensive unit if affordable
  const mostExpensive = sortedEmployees[sortedEmployees.length - 1]
  if (remainingBudget >= mostExpensive.cost && maxHeadcount > 0) {
    draft.push({ employeeKey: mostExpensive.key })
    remainingBudget -= mostExpensive.cost
    maxHeadcount--
  }
  
  // Add mid-tier units (middle cost range)
  const midTierEmployees = sortedEmployees.filter(emp => 
    emp.cost > sortedEmployees[0].cost && 
    emp.cost < sortedEmployees[sortedEmployees.length - 1].cost
  )
  
  // Add 1-2 mid-tier units if budget allows
  const midTierCount = Math.min(2, Math.floor(remainingBudget / 50), maxHeadcount)
  for (let i = 0; i < midTierCount; i++) {
    const availableMidTier = midTierEmployees.filter(emp => 
      emp.cost <= remainingBudget
    )
    
    if (availableMidTier.length > 0) {
      const selectedEmployee = availableMidTier[Math.floor(Math.random() * availableMidTier.length)]
      draft.push({ employeeKey: selectedEmployee.key })
      remainingBudget -= selectedEmployee.cost
      maxHeadcount--
    }
  }
  
  // Fill remaining slots with cheapest units
  const cheapestEmployee = sortedEmployees[0]
  while (maxHeadcount > 0 && remainingBudget >= cheapestEmployee.cost) {
    draft.push({ employeeKey: cheapestEmployee.key })
    remainingBudget -= cheapestEmployee.cost
    maxHeadcount--
  }
  
  // Ensure at least 2 units for viability
  if (draft.length < 2) {
    // If we don't have enough units, add more cheapest units even if it exceeds budget
    while (draft.length < 2) {
      draft.push({ employeeKey: cheapestEmployee.key })
    }
  }
  
  return draft
}
