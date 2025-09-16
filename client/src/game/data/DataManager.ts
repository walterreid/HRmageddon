import { type Employee, type DataAbility, type AttackPattern, type StatusEffect, type GameConfig, type Unit, UnitType } from 'shared'

interface LoadedData {
  employees: Map<string, Employee>
  abilities: Map<string, DataAbility>
  attackPatterns: Map<string, AttackPattern>
  statusEffects: Map<string, StatusEffect>
  gameConfig: GameConfig
}

export class DataManager {
  private static instance: DataManager
  private data: LoadedData
  private isLoaded: boolean = false

  private constructor() {
    this.data = {
      employees: new Map(),
      abilities: new Map(),
      attackPatterns: new Map(),
      statusEffects: new Map(),
      gameConfig: {} as GameConfig
    }
  }

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager()
    }
    return DataManager.instance
  }

  public async loadAll(): Promise<void> {
    console.log('DataManager: Starting to load all game data...')
    
    try {
      // Load all data files in parallel
      await Promise.all([
        this.loadEmployees(),
        this.loadAbilities(),
        this.loadAttackPatterns(),
        this.loadStatusEffects(),
        this.loadGameConfig()
      ])
      
      this.isLoaded = true
      console.log('DataManager: All game data loaded successfully!')
    } catch (error) {
      console.error('DataManager: Failed to load all game data:', error)
      throw error
    }
  }

  private async loadEmployees(): Promise<void> {
    try {
      const response = await fetch('/data/employees.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      const employees = jsonData.employees as Employee[]
      
      // Convert array to Map for O(1) lookup
      employees.forEach(employee => {
        this.data.employees.set(employee.key, employee)
      })
      
      console.log(`DataManager: Loaded ${employees.length} employees`)
    } catch (error) {
      console.error("Error loading 'employees.json':", error)
      throw error
    }
  }

  private async loadAbilities(): Promise<void> {
    try {
      const response = await fetch('/data/abilities.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      const abilities = jsonData.abilities as DataAbility[]
      
      // Convert array to Map for O(1) lookup
      abilities.forEach(ability => {
        this.data.abilities.set(ability.key, ability)
      })
      
      console.log(`DataManager: Loaded ${abilities.length} abilities`)
    } catch (error) {
      console.error("Error loading 'abilities.json':", error)
      throw error
    }
  }

  private async loadAttackPatterns(): Promise<void> {
    try {
      const response = await fetch('/data/attack_patterns.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      const attackPatterns = jsonData.attack_patterns as AttackPattern[]
      
      // Convert array to Map for O(1) lookup
      attackPatterns.forEach(pattern => {
        this.data.attackPatterns.set(pattern.key, pattern)
      })
      
      console.log(`DataManager: Loaded ${attackPatterns.length} attack patterns`)
    } catch (error) {
      console.error("Error loading 'attack_patterns.json':", error)
      throw error
    }
  }

  private async loadStatusEffects(): Promise<void> {
    try {
      const response = await fetch('/data/status_effects.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      const statusEffects = jsonData.status_effects as StatusEffect[]
      
      // Convert array to Map for O(1) lookup
      statusEffects.forEach(effect => {
        this.data.statusEffects.set(effect.key, effect)
      })
      
      console.log(`DataManager: Loaded ${statusEffects.length} status effects`)
    } catch (error) {
      console.error("Error loading 'status_effects.json':", error)
      throw error
    }
  }

  private async loadGameConfig(): Promise<void> {
    try {
      const response = await fetch('/data/game_config.json')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const jsonData = await response.json()
      this.data.gameConfig = jsonData as GameConfig
      
      console.log('DataManager: Loaded game configuration')
    } catch (error) {
      console.error("Error loading 'game_config.json':", error)
      throw error
    }
  }

  // Getter methods for easy access
  public getEmployee(key: string): Employee | undefined {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning undefined for employee:', key)
      return undefined
    }
    return this.data.employees.get(key)
  }

  public getAbility(key: string): DataAbility | undefined {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning undefined for ability:', key)
      return undefined
    }
    return this.data.abilities.get(key)
  }

  public getAttackPattern(key: string): AttackPattern | undefined {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning undefined for attack pattern:', key)
      return undefined
    }
    return this.data.attackPatterns.get(key)
  }

  public getStatusEffect(key: string): StatusEffect | undefined {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning undefined for status effect:', key)
      return undefined
    }
    return this.data.statusEffects.get(key)
  }

  public getConfig(): GameConfig {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning empty config')
      return {} as GameConfig
    }
    return this.data.gameConfig
  }

  public getAllEmployees(): Employee[] {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning empty array')
      return []
    }
    return Array.from(this.data.employees.values())
  }

  public getAllAbilities(): DataAbility[] {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning empty array')
      return []
    }
    return Array.from(this.data.abilities.values())
  }

  public getAllAttackPatterns(): AttackPattern[] {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning empty array')
      return []
    }
    return Array.from(this.data.attackPatterns.values())
  }

  public getAllStatusEffects(): StatusEffect[] {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning empty array')
      return []
    }
    return Array.from(this.data.statusEffects.values())
  }

  public isDataLoaded(): boolean {
    return this.isLoaded
  }

  // Utility method to get employee by ID (for backward compatibility)
  public getEmployeeById(id: number): Employee | undefined {
    if (!this.isLoaded) {
      console.warn('DataManager: Data not loaded yet, returning undefined for employee ID:', id)
      return undefined
    }
    return Array.from(this.data.employees.values()).find(emp => emp.id === id)
  }

  // Convert Employee data to Unit data for game logic
  public createUnitFromEmployee(employee: Employee, id: string, playerId: string, position: { x: number; y: number }): Unit {
    // Get abilities based on unit type mapping
    const abilities = this.getAbilitiesForUnitType(this.mapEmployeeKeyToUnitType(employee.key))
    
    return {
      id,
      playerId,
      type: this.mapEmployeeKeyToUnitType(employee.key),
      position,
      hp: employee.stats.health,
      maxHp: employee.stats.health,
      moveRange: employee.stats.speed,
      attackRange: employee.attack.range,
      attackDamage: employee.stats.attack_power,
      actionsRemaining: 2, // Default actions
      maxActions: 2,
      status: [],
      cost: employee.cost,
      hasMoved: false,
      hasAttacked: false,
      abilities: abilities,
      abilityCooldowns: {},
      movementUsed: 0,
      remainingMovement: employee.stats.speed,
    }
  }

  // Get abilities for a specific unit type based on the UNIT_ABILITIES mapping
  private getAbilitiesForUnitType(unitType: UnitType): string[] {
    const abilityMapping: Record<UnitType, string[]> = {
      [UnitType.INTERN]: ['fetch_coffee', 'overtime'],
      [UnitType.SECRETARY]: ['file_it'],
      [UnitType.SALES_REP]: ['harass'],
      [UnitType.HR_MANAGER]: ['pink_slip', 'mediation'],
      [UnitType.IT_SPECIALIST]: ['hack_system', 'tech_support'],
      [UnitType.ACCOUNTANT]: ['audit', 'creative_accounting'],
      [UnitType.LEGAL_COUNSEL]: ['legal_threat', 'contract_negotiation'],
      [UnitType.EXECUTIVE]: ['executive_order', 'corporate_restructuring', 'paperclip_storm'],
    }
    
    return abilityMapping[unitType] || []
  }

  // Map employee keys to UnitType enum
  private mapEmployeeKeyToUnitType(employeeKey: string): UnitType {
    const keyMap: Record<string, UnitType> = {
      'salesman': UnitType.SALES_REP,
      'secretary': UnitType.SECRETARY,
      'manager': UnitType.HR_MANAGER,
      'it_guy': UnitType.IT_SPECIALIST,
    }
    return keyMap[employeeKey] || UnitType.INTERN
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance()