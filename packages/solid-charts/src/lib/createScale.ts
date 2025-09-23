import type { ChartContextType } from '@src/components/context'
import { getBarPadding } from '@src/lib/utils'
import {
  type ScaleLinear,
  type ScalePoint,
  scaleLinear,
  scalePoint,
} from 'd3-scale'
import { type Accessor, createMemo } from 'solid-js'

export type ScaleType = 'linear' | 'categorical'
export type Scale =
  | {
      type: 'linear'
      scale: ScaleLinear<number, number, any>
    }
  | {
      type: 'categorical'
      scale: ScalePoint<string>
    }

const createScale = (props: {
  axis: Accessor<'x' | 'y'>
  type: Accessor<ScaleType>
  axisId: Accessor<string>
  data: Accessor<any[]>
  chartContext: ChartContextType
}) => {
  return createMemo(() => {
    let start: number
    let end: number
    switch (props.axis()) {
      case 'x': {
        const barPadding = getBarPadding(props.chartContext)
        start = props.chartContext.getInset('left') + barPadding
        end =
          props.chartContext.width() -
          props.chartContext.getInset('right') -
          barPadding
        break
      }
      case 'y': {
        start =
          props.chartContext.height() - props.chartContext.getInset('bottom')
        end = props.chartContext.getInset('top')
        break
      }
    }

    switch (props.type()) {
      case 'linear': {
        const axis = props.chartContext.getAxis(props.axisId())
        let domainMin = axis.min
        if (!axis.userDefined) {
          domainMin = Math.min(axis.min, 0)
        }
        let scale = scaleLinear([domainMin, axis.max], [start, end])
        if (!axis.userDefined) {
          scale = scale.nice()
        }

        return {
          type: 'linear' as const,
          scale,
        }
      }
      case 'categorical':
        return {
          type: 'categorical' as const,
          scale: scalePoint(props.data(), [start, end]),
        }
    }
  })
}

export default createScale
