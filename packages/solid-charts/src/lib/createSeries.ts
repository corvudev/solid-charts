import type { ChartContextType } from '@src/components/context'
import { type Accessor, createEffect, onCleanup } from 'solid-js'

const createSeries = (props: {
  seriesId: string
  dataKey: Accessor<string | undefined>
  axisId: Accessor<string>
  stackId: Accessor<string | undefined>
  data: Accessor<number[]>
  chartContext: ChartContextType
}) => {
  createEffect(() => {
    const stackId = props.stackId()
    if (!stackId) return

    props.chartContext.registerStack(
      stackId,
      props.dataKey() ?? '',
      props.seriesId,
      props.data(),
    )
    onCleanup(() =>
      props.chartContext.unregisterStack(
        stackId,
        props.dataKey() ?? '',
        props.seriesId,
      ),
    )
  })

  createEffect(() => {
    const stackId = props.stackId()
    const stack =
      stackId !== undefined && props.chartContext.stacks().get(stackId)

    const data = props.data()

    const stackValues = stack
      ? [...stack.values()].flatMap((stack) => stack.values)
      : []
    // A series with holes (missing dataKey on some entries) yields undefined/NaN.
    // Math.min/max over those returns NaN, which poisons the axis domain and makes
    // every point on the axis NaN - not just the missing one.
    const finiteData = data.filter((value) => Number.isFinite(value))
    const finiteStackValues = stackValues.filter((value) =>
      Number.isFinite(value),
    )
    const min =
      finiteData.length + finiteStackValues.length > 0
        ? Math.min(...finiteData, ...finiteStackValues)
        : 0

    let max: number | null = null
    if (stack) {
      const stackDataKeys = [...stack.keys()]

      for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
        let stackedValue = 0

        for (const stackDataKey of stackDataKeys) {
          const value = stack.get(stackDataKey)?.values[dataIdx]
          stackedValue += Number.isFinite(value) ? (value as number) : 0
        }

        max = Math.max(max ?? stackedValue, stackedValue)
      }
    }
    max = max ?? (finiteData.length > 0 ? Math.max(...finiteData) : 0)

    props.chartContext.registerAxis(props.axisId(), {
      type: 'series',
      seriesId: props.seriesId,
      min,
      max,
    })
    onCleanup(() =>
      props.chartContext.unregisterAxis(props.axisId(), {
        type: 'series',
        seriesId: props.seriesId,
      }),
    )
  })
}

export default createSeries
