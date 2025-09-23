import type { Scale } from '@src/lib/createScale'
import { type Accessor, createMemo } from 'solid-js'

const createTicks = (props: {
  scale: Accessor<Scale>
  tickCount: Accessor<number>
  tickValues: Accessor<any[] | undefined>
}) => {
  return createMemo(() => {
    const tickValues = props.tickValues()
    if (tickValues) return tickValues

    const scale = props.scale()
    switch (scale.type) {
      case 'linear':
        return scale.scale.ticks(props.tickCount())
      case 'categorical': {
        return scale.scale.domain()
      }
    }
  })
}

export default createTicks
