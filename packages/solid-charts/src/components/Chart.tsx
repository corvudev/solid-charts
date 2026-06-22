import { combineStyle } from '@corvu/utils/dom'
import { mergeRefs } from '@corvu/utils/reactivity'
import { type BarConfig, ChartContext } from '@src/components/context'
import createSize from '@src/lib/dom/createSize'
import type { OverrideProps } from '@src/lib/types'
import {
  type ComponentProps,
  type JSX,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  splitProps,
} from 'solid-js'

const DEFAULT_INSET = 8

export type ChartProps = OverrideProps<
  Omit<ComponentProps<'svg'>, 'viewBox'>,
  {
    /**
     * The data array to be used in the chart. Can either be a simple array of numbers or an array of objects.
     */
    data: number[] | object[]
    /**
     * The `viewBox` width of the chart. Can be a number or 'responsive'.
     * @defaultValue `'responsive'`
     */
    width?: 'responsive' | number
    /**
     * The `viewBox` height of the chart. Can be a number or 'responsive'.
     * @defaultValue `'responsive'`
     */
    height?: 'responsive' | number
    /**
     * The inset padding of the chart. Used to accommodate for line series with curve interpolation that might overflow the chart area.
     * @defaultValue `8`
     */
    inset?:
      | number
      | {
          top?: number
          right?: number
          bottom?: number
          left?: number
        }
    /**
     * The global configuration for bar series.
     * @defaultValue `{ bandGap: '10%', barGap: '10%' }`
     */
    barConfig?: Partial<BarConfig>
    /** @hidden */
    children?: JSX.Element
  }
>

/**
 * svg element and context provider for the chart.
 *
 * @data `data-sc-chart` - Present on every chart svg element.
 * @data `data-sc-wrapper` - Present on every chart wrapper element.
 */
const Chart = (props: ChartProps) => {
  const defaultedProps = mergeProps(
    {
      width: 'responsive' as const,
      height: 'responsive' as const,
      inset: DEFAULT_INSET,
      barConfig: {
        bandGap: '10%',
        barGap: '10%',
      },
    },
    props,
  )

  const [localProps, otherProps] = splitProps(defaultedProps, [
    'data',
    'width',
    'height',
    'inset',
    'barConfig',
    'ref',
    'style',
  ])

  const [inset, setInset] = createSignal({
    top: new Map<string, number>(),
    right: new Map<string, number>(),
    bottom: new Map<string, number>(),
    left: new Map<string, number>(),
  })

  const [stacks, setStacks] = createSignal(
    new Map<
      string,
      Map<
        string,
        {
          seriesIds: Set<string>
          values: number[]
        }
      >
    >(),
  )

  const [axes, setAxes] = createSignal(
    new Map<
      string,
      {
        series: Map<string, { min: number; max: number }>
        userRange: [number | 'min', number | 'max'] | null
      }
    >(),
  )

  const [bars, setBars] = createSignal(new Set<string>())

  const [pointerPosition, setPointerPosition] = createSignal<{
    x: number
    y: number
  } | null>(null)

  const [svgRef, setSvgRef] = createSignal<SVGElement | null>(null)
  const [wrapperRef, setWrapperRef] = createSignal<HTMLDivElement | null>(null)

  const containerSize = createSize({
    element: () => {
      const svg = svgRef()
      return svg ? svg.parentElement : null
    },
  })

  createEffect(() => {
    const inset = localProps.inset
    setInset((prev) => {
      if (typeof inset === 'number') {
        prev.top.set('top', inset)
        prev.right.set('right', inset)
        prev.bottom.set('bottom', inset)
        prev.left.set('left', inset)
        return { ...prev }
      }
      prev.top.set('top', inset.top ?? DEFAULT_INSET)
      prev.right.set('right', inset.right ?? DEFAULT_INSET)
      prev.bottom.set('bottom', inset.bottom ?? DEFAULT_INSET)
      prev.left.set('left', inset.left ?? DEFAULT_INSET)
      return { ...prev }
    })
  })

  const resolveSize = (
    size: 'responsive' | number,
    dimension: 'width' | 'height',
  ) => {
    if (size === 'responsive') {
      const _containerSize = containerSize()
      if (!_containerSize) return 0
      return dimension === 'width' ? _containerSize[0] : _containerSize[1]
    }
    return size as number
  }

  const svgSize = createMemo(() => {
    return [
      resolveSize(localProps.width, 'width'),
      resolveSize(localProps.height, 'height'),
    ] as [number, number]
  })

  const getInset = (
    edge: 'top' | 'right' | 'bottom' | 'left',
    exclude?: string,
  ) =>
    inset()
      [edge].entries()
      .reduce((acc, [key, value]) => {
        if (key === exclude) return acc
        return acc + value
      }, 0)

  const pointerInChart = createMemo(() => {
    const _pointerPosition = pointerPosition()
    if (!_pointerPosition) return false

    const left = getInset('left')
    const right = svgSize()[0] - getInset('right')

    const top = getInset('top')
    const bottom = svgSize()[1] - getInset('bottom')

    const x = toSvgPosition(_pointerPosition.x, 'width')
    const y = toSvgPosition(_pointerPosition.y, 'height')

    return x >= left && x <= right && y >= top && y <= bottom
  })

  const toSvgPosition = (position: number, dimension: 'width' | 'height') => {
    const _containerSize = containerSize()![dimension === 'width' ? 0 : 1]
    if (!containerSize) return 0
    const _svgSize = svgSize()![dimension === 'width' ? 0 : 1]
    return (position / _containerSize) * _svgSize
  }

  const toContainerPosition = (
    position: number,
    dimension: 'width' | 'height',
  ) => {
    const _containerSize = containerSize()![dimension === 'width' ? 0 : 1]
    if (!_containerSize) return 0
    const _svgSize = svgSize()![dimension === 'width' ? 0 : 1]
    return (position / _svgSize) * _containerSize
  }

  return (
    <ChartContext.Provider
      value={{
        data: () => localProps.data,
        width: () => svgSize()[0],
        height: () => svgSize()[1],
        getInset,
        registerInset: (edge, key, value) => {
          setInset((prev) => {
            prev[edge].set(key, value)
            return { ...prev }
          })
        },
        unregisterInset: (edge, key) => {
          setInset((prev) => {
            prev[edge].delete(key)
            return { ...prev }
          })
        },
        pointerPosition,
        pointerInChart,
        wrapperRef,
        stacks,
        registerStack: (stackId, dataKey, seriesId, values) => {
          setStacks((prev) => {
            const stack =
              prev.get(stackId) ??
              new Map<
                string,
                {
                  seriesIds: Set<string>
                  values: number[]
                }
              >()
            const existingDataKey = stack.get(dataKey) ?? {
              seriesIds: new Set<string>(),
              values: values,
            }
            existingDataKey.seriesIds.add(seriesId)
            stack.set(dataKey, existingDataKey)
            prev.set(stackId, stack)
            return new Map(prev)
          })
        },
        unregisterStack: (stackId, dataKey, seriesId) => {
          setStacks((prev) => {
            const stack = prev.get(stackId)
            if (!stack) return prev
            const dataKeyStack = stack.get(dataKey)
            if (!dataKeyStack) return prev
            dataKeyStack.seriesIds.delete(seriesId)
            if (dataKeyStack.seriesIds.size === 0) {
              stack.delete(dataKey)
            }
            if (stack.size === 0) {
              prev.delete(stackId)
            }
            return new Map(prev)
          })
        },
        registerAxis: (axisId, data) => {
          setAxes((prev) => {
            const axis = prev.get(axisId) ?? {
              series: new Map<string, { min: number; max: number }>(),
              userRange: null,
            }

            if (data.type === 'series') {
              axis.series.set(data.seriesId, {
                min: data.min,
                max: data.max,
              })
            } else {
              axis.userRange = data.range
            }
            prev.set(axisId, axis)
            return new Map(prev)
          })
        },
        unregisterAxis: (axisId, data) => {
          setAxes((prev) => {
            const axis = prev.get(axisId)
            if (!axis) return prev
            if (data.type === 'series') {
              axis.series.delete(data.seriesId)
            } else {
              axis.userRange = null
            }
            if (axis.series.size === 0 && axis.userRange === null) {
              prev.delete(axisId)
            }
            return new Map(prev)
          })
        },
        getAxis: (axisId) => {
          const axis = axes().get(axisId)
          // Fallback while rendering. Maybe there is a better solution for this?
          if (!axis || axis.series.size === 0) {
            return {
              min: 0,
              max: 0,
              userDefined: false,
            }
          }
          const series = axis.series.values().reduce(
            (acc, data) => {
              return {
                min: Math.min(acc.min, data.min),
                max: Math.max(acc.max, data.max),
              }
            },
            { min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY },
          )
          const userMin = axis.userRange?.[0]
          const userMax = axis.userRange?.[1]
          return {
            min: typeof userMin === 'number' ? userMin : series.min,
            max: typeof userMax === 'number' ? userMax : series.max,
            userDefined: !!axis.userRange,
          }
        },
        barConfig: () => localProps.barConfig as BarConfig,
        bars,
        registerBar: (key) => {
          setBars((prev) => {
            prev.add(key)
            return new Set(prev)
          })
        },
        unregisterBar: (key) => {
          setBars((prev) => {
            prev.delete(key)
            return new Set(prev)
          })
        },
        toSvgPosition,
        toContainerPosition,
      }}
    >
      <div
        ref={setWrapperRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
        data-sc-wrapper=""
      >
        <svg
          ref={mergeRefs(setSvgRef, localProps.ref)}
          style={combineStyle(
            {
              width: '100%',
              height: '100%',
            },
            localProps.style,
          )}
          viewBox={`0 0 ${svgSize()[0]} ${svgSize()[1]}`}
          onMouseMove={(event) => {
            setPointerPosition({
              x:
                event.clientX -
                event.currentTarget.getBoundingClientRect().left,
              y:
                event.clientY - event.currentTarget.getBoundingClientRect().top,
            })
          }}
          onMouseLeave={() => {
            setPointerPosition(null)
          }}
          data-sc-chart=""
          {...otherProps}
        >
          {props.children}
        </svg>
      </div>
    </ChartContext.Provider>
  )
}

export default Chart
