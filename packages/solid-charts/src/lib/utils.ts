import type { ChartContextType } from '@src/components/context'
import { scaleBand } from 'd3-scale'

const accessData = <T>(data: unknown, dataKey: string | undefined): T[] => {
  if (!dataKey) return data as T[]

  const keys = dataKey.split('.')

  return (data as Record<string, any>[]).map((entry) =>
    keys.reduce((acc, key) => acc?.[key], entry),
  ) as T[]
}

const gapToPadding = (gap: number | `${number}%`, bandwidth: number) => {
  if (typeof gap === 'number') return gap / bandwidth
  return Number.parseInt(gap.slice(0, -1)) / 100
}

const getBarPadding = (chartContext: ChartContextType) => {
  if (chartContext.bars().size === 0) return 0

  const left = chartContext.getInset('left')
  const right = chartContext.width() - chartContext.getInset('right')

  const chartWidth = right - left
  const dataLength = chartContext.data().length

  const barConfig = chartContext.barConfig()
  const bandGap = gapToPadding(barConfig.bandGap, chartWidth / dataLength)

  const bandScale = scaleBand()
    .domain(Array(dataLength).keys().map(String))
    .range([left, right])
    .paddingInner(bandGap)

  return bandScale.bandwidth() / 2
}

// NaN is `typeof 'number'`, so a missing/invalid value used to pass this check
// and land in the generated path as `M x,NaN`. Check for finiteness instead.
const pointDefined = (point: [number, number]) =>
  Number.isFinite(point[0]) && Number.isFinite(point[1])

export { accessData, gapToPadding, getBarPadding, pointDefined }
