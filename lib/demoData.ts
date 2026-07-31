export function getDemoDashboardData() {
  return {
    totalIncome: 4200,
    generalExpenses: 900,
    carExpenses: 450,
    totalExpenses: 1350,
    carProfit: 1450,
    carFlipIncome: 2400,
    carFlipMarginPct: 60.4,
    totalTithe: 240,
    portfolioValue: 18250,
    activeCars: 1,
    totalCars: 2,
    otherIncome: 1800,
    combinedIncome: 3250,
    netWorth: 19400,
    momTotalIncome: null,
    momCarProfit: null,
    momOtherIncome: null,
    momCombinedIncome: null,
    momExpenses: null,
    recentIncome: [
      { id: 'demo-income-1', source_type: 'salary', amount: 2400, date: '2026-07-15', notes: 'Demo income' },
      { id: 'demo-income-2', source_type: 'car_flip', amount: 1800, date: '2026-07-10', notes: 'Demo flip' },
    ],
    recentCars: [
      { id: 'demo-car-1', make: 'Honda', model: 'Civic', year: 2018, status: 'active', purchase_price: 14000, purchase_date: '2026-06-01', sale_date: null },
      { id: 'demo-car-2', make: 'Toyota', model: 'Corolla', year: 2020, status: 'sold', purchase_price: 16500, purchase_date: '2026-04-01', sale_date: '2026-06-15' },
    ],
    periodChart: [
      { label: 'Apr', income: 2100, totalExpenses: 600, cashflow: 1500, titheTotal: 210 },
      { label: 'May', income: 2500, totalExpenses: 800, cashflow: 1700, titheTotal: 250 },
      { label: 'Jun', income: 2800, totalExpenses: 950, cashflow: 1850, titheTotal: 280 },
    ],
    soldInventoryDays: [
      { id: 'demo-car-2', carLabel: '2020 Toyota Corolla', purchaseDate: '2026-04-01', saleDate: '2026-06-15', days: 75 },
    ],
    avgSoldInventoryDays: 75,
    avgActiveInventoryDays: 29,
    portfolioPie: [
      { name: 'ETF', value: 12800 },
      { name: 'STOCK', value: 5450 },
    ],
  }
}
