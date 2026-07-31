export type CarStatus = 'active' | 'sold'

export interface Car {
  id: string
  make: string
  model: string
  year: number
  purchase_price: number
  purchase_date: string
  sale_price: number | null
  sale_date: string | null
  status: CarStatus
  notes: string | null
  created_at: string
}

export interface CarExpense {
  id: string
  car_id: string
  category: string
  amount: number
  date: string
  description: string | null
  created_at: string
}

export interface Income {
  id: string
  source_type: 'car_flip' | 'salary' | 'freelance' | 'rental' | 'dividend' | 'va_benefits' | 'other'
  source_id: string | null
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export interface Expense {
  id: string
  category: string
  amount: number
  date: string
  description: string | null
  created_at: string
}

export interface Investment {
  id: string
  type: 'stock' | 'IRA' | 'ETF' | 'crypto' | 'other'
  ticker: string | null
  name: string
  amount_invested: number
  current_value: number
  funded_from: 'car_profit' | 'salary' | 'other' | null
  date: string
  notes: string | null
  created_at: string
}

export interface Distribution {
  id: string
  investment_id: string
  amount: number
  date: string
  type: 'dividend' | 'contribution' | 'withdrawal'
  notes: string | null
  created_at: string
}

export interface InvestmentRule {
  id: string
  name: string
  type: 'stock' | 'IRA' | 'ETF' | 'crypto' | 'other'
  ticker: string | null
  percentage: number
  created_at: string
}
