import { createWritableMemo } from '@solid-primitives/memo'
import { AxisContext } from '@src/axis/context'
import { useChartContext } from '@src/components/context'
import createScale, { type ScaleType } from '@src/lib/createScale'
import createTicks from '@src/lib/createTicks'
import { accessData } from '@src/lib/utils'
import {
  type JSX,
  createEffect,
  createMemo,
  mergeProps,
  onCleanup,
} from 'solid-js'

export type AxisProps = {
  /**
   * The key in the data object to use for this axis. Don't provide a key if the data is a simple array of numbers.
   */
  dataKey?: string
  /**
   * The id of the axis.
   * @defaultValue '0'
   */
  axisId?: string
  /**
   * The scale type of the axis.
   */
  type?: ScaleType
  /**
   * The count of axis ticks.
   */
  tickCount?: number
  /**
   * Force specific tick values.
   */
  tickValues?: any[]
  /**
   * The range of the axis. Only used when `type` is set to `'linear'`.
   * @defaultValue 'auto'
   */
  axisRange?: 'auto' | [number | 'min', number | 'max']
  /** @hidden */
  children?: JSX.Element
} & (XAxisProps | YAxisProps)

export type XAxisProps = {
  /**
   * The axis type.
   */
  axis: 'x'
  /**
   * The position of the axis labels.
   */
  position: 'top' | 'bottom'
}

export type YAxisProps = {
  /**
   * The axis type.
   */
  axis: 'y'
  /**
   * The position of the axis labels.
   */
  position: 'left' | 'right'
}

export type { ScaleType }

/** Context provider for axis components. */
const Axis = (props: AxisProps) => {
  const defaultedProps = mergeProps(
    {
      type: props.axis === 'x' ? ('categorical' as const) : ('linear' as const),
      axisId: '0',
      tickCount: 5,
      axisRange: 'auto' as const,
    },
    props,
  )
  const chartContext = useChartContext()

  const data = createMemo(() => {
    return accessData(chartContext.data(), defaultedProps.dataKey)
  })

  createEffect(() => {
    const axisRange = defaultedProps.axisRange
    if (axisRange === 'auto') return
    chartContext.registerAxis(defaultedProps.axisId, {
      type: 'user',
      range: axisRange,
    })
    onCleanup(() =>
      chartContext.unregisterAxis(defaultedProps.axisId, { type: 'user' }),
    )
  })

  const scale = createScale({
    axis: () => defaultedProps.axis,
    type: () => defaultedProps.type,
    axisId: () => defaultedProps.axisId,
    data,
    chartContext,
  })

  const ticks = createTicks({
    scale,
    tickCount: () => defaultedProps.tickCount,
    tickValues: () => defaultedProps.tickValues,
  })

  const [labelTicks, setLabelTicks] = createWritableMemo(() => ticks())

  return (
    <AxisContext.Provider
      value={{
        axis: () => defaultedProps.axis,
        position: () => defaultedProps.position,
        scale,
        ticks,
        labelTicks,
        setLabelTicks,
      }}
    >
      {defaultedProps.children}
    </AxisContext.Provider>
  )
}

export default Axis
