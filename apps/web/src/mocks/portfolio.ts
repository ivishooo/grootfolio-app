import type { PortfolioSummary, QuizQuestion, RiskProfileResult } from '@grootfolio/shared'

export const mockPortfolio: PortfolioSummary = {
  totalValue: 100000,
  pnlAbsolute: 3709,
  pnlPercent: 15.2,
  bestAsset: {
    id: 'mock-btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    currency: 'USD',
  },
  distribution: [
    { type: 'crypto', value: 45000 },
    { type: 'stock', value: 32000 },
    { type: 'bond', value: 15000 },
    { type: 'currency', value: 8000 },
  ],
  monthlyReturn: [
    { month: 'Ene', value: 45000 },
    { month: 'Feb', value: 76000 },
    { month: 'Mar', value: 89000 },
    { month: 'Abr', value: 70000 },
    { month: 'May', value: 98000 },
    { month: 'Jun', value: 78000 },
  ],
  holdings: [
    { assetId: '1', asset: { id: '1', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', currency: 'USD' }, quantity: 0.5, avgPrice: 40000, currentPrice: 50000, value: 25000, pnl: 2500, pnlPercent: 12.5 },
    { assetId: '2', asset: { id: '2', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', currency: 'USD' }, quantity: 100, avgPrice: 150, currentPrice: 180, value: 18000, pnl: 1380, pnlPercent: 8.3 },
    { assetId: '3', asset: { id: '3', symbol: 'ETH', name: 'Ethereum', type: 'crypto', currency: 'USD' }, quantity: 8, avgPrice: 2500, currentPrice: 2420, value: 20000, pnl: -640, pnlPercent: -3.2 },
    { assetId: '4', asset: { id: '4', symbol: 'US-T', name: 'US Treasury', type: 'bond', currency: 'USD' }, quantity: 150, avgPrice: 100, currentPrice: 102, value: 15000, pnl: 315, pnlPercent: 2.1 },
    { assetId: '5', asset: { id: '5', symbol: 'EUR', name: 'EUR/USD', type: 'currency', currency: 'USD' }, quantity: 8000, avgPrice: 1.08, currentPrice: 1.1, value: 8600, pnl: 154, pnlPercent: 1.8 },
  ],
}

export const mockQuiz: QuizQuestion[] = [
  {
    id: 'q1', order: 1,
    text: 'Que experiencia previa tenes en inversiones?',
    options: [
      { id: 'q1-o1', label: 'No tengo experiencia en inversiones', score: 1 },
      { id: 'q1-o2', label: 'Invierto en plazo fijo', score: 2 },
      { id: 'q1-o3', label: 'Invierto en bonos, letras u obligaciones negociables', score: 3 },
      { id: 'q1-o4', label: 'Invierto en acciones', score: 4 },
      { id: 'q1-o5', label: 'Invierto en instrumentos como CFD, futuros u opciones', score: 5 },
    ],
  },
  {
    id: 'q2', order: 2,
    text: 'Cual es tu horizonte de inversion?',
    options: [
      { id: 'q2-o1', label: 'Menos de 1 ano', score: 1 },
      { id: 'q2-o2', label: 'Entre 1 y 3 anos', score: 2 },
      { id: 'q2-o3', label: 'Entre 3 y 5 anos', score: 3 },
      { id: 'q2-o4', label: 'Mas de 5 anos', score: 4 },
    ],
  },
  {
    id: 'q3', order: 3,
    text: 'Como reaccionarias ante una caida del 20% en tu portafolio?',
    options: [
      { id: 'q3-o1', label: 'Vendo todo para evitar perder mas', score: 1 },
      { id: 'q3-o2', label: 'Vendo una parte para limitar perdidas', score: 2 },
      { id: 'q3-o3', label: 'Mantengo posiciones y espero', score: 3 },
      { id: 'q3-o4', label: 'Compro mas aprovechando los precios bajos', score: 4 },
    ],
  },
  {
    id: 'q4', order: 4,
    text: 'Que porcentaje de tus ingresos pensas invertir?',
    options: [
      { id: 'q4-o1', label: 'Menos del 10%', score: 1 },
      { id: 'q4-o2', label: 'Entre 10% y 25%', score: 2 },
      { id: 'q4-o3', label: 'Entre 25% y 50%', score: 3 },
      { id: 'q4-o4', label: 'Mas del 50%', score: 4 },
    ],
  },
]

export const mockProfileResult: RiskProfileResult = {
  profile: 'conservative',
  score: 8,
  description: 'Buscas un balance entre riesgo y rendimiento...',
  recommendations: [
    'Diversifica tu portafolio segun tu nivel de riesgo',
    'Revisa tus inversiones regularmente',
    'Manten un fondo de emergencia antes de invertir',
    'Continua educandote sobre finanzas e inversiones',
  ],
  calculatedAt: new Date().toISOString(),
}
