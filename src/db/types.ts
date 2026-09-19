import type { Profile } from '../goals'
import type { Nutrients } from '../nutrition'

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface SyncMeta { id: string; updatedAt: string; deletedAt: string | null }

export interface LogEntry extends SyncMeta {
  date: string
  meal: Meal
  hall: string | null
  station: string | null
  name: string
  recipeNumber: string | null
  customFoodId: string | null
  portion: string
  servings: number
  perServing: Nutrients
}

export interface CustomFood extends SyncMeta {
  name: string
  portion: string
  perServing: Nutrients
}

export interface WeightEntry extends SyncMeta {
  date: string
  weightLb: number
}

export interface ProfileRow extends SyncMeta, Profile {}

export interface Tables {
  food_log: LogEntry
  custom_foods: CustomFood
  weights: WeightEntry
  profile: ProfileRow
}

export type TableName = keyof Tables
