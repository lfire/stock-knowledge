<script setup lang="ts">
/**
 * 行情图组件（KLineChart 内核，A 股专业行情软件观感）
 *
 * 三种调用形态：
 *  1. type="candle"  K 线蜡烛图（主图：K线 + 均线；副图：VOL / MACD / KDJ ... 任意堆叠）
 *  2. type="line"    简易折线 / 区域图（兼容旧调用：points / channel / markLines）
 *  3. type="minute"  专业分时图（昨收基准线 + 涨绿跌红双色面积 + 黄色均价 + 量柱）
 *
 * 兼容性：保留旧组件的所有 props（candles / ma / points / channel / avg / markLines / categories / volumes / base / area / zoom / title / height / theme）。
 *
 * 性能：
 *  - klinecharts 通过动态 import 全站只加载一次
 *  - IntersectionObserver 懒加载首次渲染
 *  - ResizeObserver 自适应；卸载时 dispose
 *  - 自定义指标只注册一次（模块级标志）
 */
import { ref, onMounted, onBeforeUnmount, shallowRef, watch } from 'vue'

// ===== 类型 =====
interface MarkLineItem {
  y: number
  text?: string
  color?: string
}
interface MinuteData {
  times: string[]
  prices: number[]
  avg?: number[]
  volumes?: number[]
  base: number // 昨收 / 基准
}
type Overlay =
  | { type: 'priceLine'; value: number; text?: string; color?: string }
  | { type: 'segment'; from: [number, number]; to: [number, number]; text?: string }
  | { type: 'rect'; from: [number, number]; to: [number, number]; text?: string }

const props = withDefaults(
  defineProps<{
    type?: 'candle' | 'line' | 'minute'
    title?: string
    height?: number
    // ---- K 线模式 ----
    candles?: number[][]            // 兼容旧格式 [[open, close, low, high], ...]
    ma?: Record<string, (number | null)[]> | number[] // 兼容老对象形式 或 [5,10,20]
    volumes?: number[]
    subIndicators?: string[]        // ['VOL','MACD','KDJ','BOLL','RSI']
    // ---- 折线 / 分时 兼容字段 ----
    points?: number[]
    channel?: { upper: number[]; lower: number[] }
    avg?: number[]
    base?: number
    categories?: string[]
    markLines?: MarkLineItem[]
    area?: boolean
    smooth?: boolean
    // ---- 分时专用 ----
    minute?: MinuteData
    // ---- 通用 ----
    overlays?: Overlay[]
    zoom?: boolean
    theme?: 'auto' | 'dark' | 'light'
    // 可见 K 线根数：传入后等效于"滚轮放大到只显示 N 根 K 线"。
    // 不传则使用 klinecharts 默认自适应。
    visibleBars?: number
    // 在指定 K 线下方强制显示文字标签（绕开 klinecharts X 轴 tick 稀疏算法）。
    // 适用于"图例/教学"场景里，确保每根真实 K 都有标签。
    bottomLabels?: { dataIndex: number; text: string }[]
  }>(),
  {
    type: 'candle',
    height: 360,
    theme: 'auto',
    smooth: true
  }
)

const root = ref<HTMLElement | null>(null)
const chart = shallowRef<any>(null)
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
let mo: MutationObserver | null = null

// ===== KLineChart 全站共享加载器 + 一次性自定义指标 / overlay 注册 =====
let klcPromise: Promise<any> | null = null
let customRegistered = false

function loadKLC() {
  if (!klcPromise) {
    klcPromise = import('klinecharts').then((mod) => {
      if (!customRegistered) {
        registerCustomIndicators(mod)
        registerCustomOverlays(mod)
        customRegistered = true
      }
      return mod
    })
  }
  return klcPromise
}

// ===== 自定义 overlay：在指定 K 线下方画文字标签 =====
// 用法：inst.createOverlay({ name: 'bottomLabel', points: [{ dataIndex }], extendData: '阳线 ▲' })
function registerCustomOverlays(mod: any) {
  const { registerOverlay } = mod
  registerOverlay({
    name: 'bottomLabel',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates, bounding }: any) => {
      const text = overlay.extendData ?? ''
      if (!coordinates?.[0] || !text) return []
      const x = coordinates[0].x
      // 画在主图底部下方 8px 处（bounding.height 是当前 pane 高度）
      const y = (bounding?.height ?? 200) - 6
      return [
        {
          type: 'text',
          attrs: {
            x,
            y,
            text,
            align: 'center',
            baseline: 'bottom'
          },
          styles: {
            color: '#c8ccd1',
            size: 12,
            family: 'inherit'
          },
          ignoreEvent: true
        }
      ]
    }
  })
}

// ===== 行情主题（A 股红涨绿跌）=====
const UP = '#ef232a'
const DOWN = '#16b15a'
const AVG_COLOR = '#ffb300'
const MA_COLORS = ['#ffb300', '#3e9eff', '#bd5cff', '#22d3ee', '#f472b6']

function getThemeMode(): 'dark' | 'light' {
  if (props.theme === 'dark') return 'dark'
  if (props.theme === 'light') return 'light'
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light'
}

function buildStyles(mode: 'dark' | 'light') {
  const isDark = mode === 'dark'
  const bg = isDark ? '#0e1217' : '#ffffff'
  const text = isDark ? '#c8ccd1' : '#444'
  const axis = isDark ? '#3a414b' : '#bbb'
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const cross = isDark ? '#1f2630' : '#5b6470'

  return {
    grid: {
      horizontal: { color: grid },
      vertical: { color: grid }
    },
    candle: {
      bar: {
        upColor: UP,
        downColor: DOWN,
        upBorderColor: UP,
        downBorderColor: DOWN,
        upWickColor: UP,
        downWickColor: DOWN
      },
      tooltip: {
        showRule: 'always',
        showType: 'standard',
        labels: ['时间', '开', '收', '高', '低', '量', '涨幅'],
        text: { color: text, size: 12 }
      },
      priceMark: {
        last: {
          show: true,
          upColor: UP,
          downColor: DOWN,
          line: { show: true, style: 'dashed' },
          text: { show: true, color: '#fff' }
        }
      }
    },
    indicator: {
      ohlc: { upColor: UP, downColor: DOWN, noChangeColor: text },
      bars: [{ style: 'fill', borderStyle: 'solid', upColor: UP, downColor: DOWN, noChangeColor: text }],
      lines: [
        { style: 'solid', smooth: false, size: 1.2, dashedValue: [2, 2], color: MA_COLORS[0] },
        { style: 'solid', smooth: false, size: 1.2, dashedValue: [2, 2], color: MA_COLORS[1] },
        { style: 'solid', smooth: false, size: 1.2, dashedValue: [2, 2], color: MA_COLORS[2] },
        { style: 'solid', smooth: false, size: 1.2, dashedValue: [2, 2], color: MA_COLORS[3] }
      ],
      tooltip: { text: { color: text, size: 11 } }
    },
    xAxis: {
      axisLine: { color: axis },
      tickLine: { color: axis },
      tickText: { color: text, size: 11 }
    },
    yAxis: {
      position: 'right',
      axisLine: { color: axis },
      tickLine: { color: axis },
      tickText: { color: text, size: 11 }
    },
    crosshair: {
      horizontal: {
        line: { color: axis, style: 'dashed', dashedValue: [4, 2] },
        text: { color: '#fff', backgroundColor: cross }
      },
      vertical: {
        line: { color: axis, style: 'dashed', dashedValue: [4, 2] },
        text: { color: '#fff', backgroundColor: cross }
      }
    },
    overlay: {
      text: { color: text, size: 11 },
      line: { color: AVG_COLOR }
    },
    separator: { size: 1, color: axis },
    // 关键：背景
    bg: { color: bg }
  } as any
}

// ===== 三个自定义指标：AVG / MINUTE_AREA / VOL_MINUTE =====
function registerCustomIndicators(mod: any) {
  const { registerIndicator } = mod

  // 1. 分时均价线（数据来自 dataList 上的 avg 字段）
  registerIndicator({
    name: 'AVG',
    shortName: '均价',
    series: 'price',
    precision: 2,
    figures: [
      { key: 'avg', title: '均价: ', type: 'line', styles: () => ({ color: AVG_COLOR, size: 1.4 }) }
    ],
    calc: (dataList: any[]) =>
      dataList.map((d) => ({ avg: (d as any).avg ?? null }))
  })

  // 2. 分时双色面积（基准线上红、下绿；自绘 Canvas 路径）
  registerIndicator({
    name: 'MINUTE_AREA',
    shortName: '',
    series: 'price',
    precision: 2,
    figures: [{ key: 'close', title: '', type: 'line' }],
    calc: (dataList: any[]) => dataList.map((d) => ({ close: d.close })),
    draw: ({ ctx, kLineDataList, visibleRange, indicator, xAxis, yAxis }: any) => {
      const base = indicator?.extendData?.base
      if (base == null || !kLineDataList?.length) return false

      const { from, to } = visibleRange
      const baseY = yAxis.convertToPixel(base)

      type Pt = { x: number; y: number; v: number }
      const pts: Pt[] = []
      for (let i = from; i < to; i++) {
        const d = kLineDataList[i]
        if (!d) continue
        const x = xAxis.convertToPixel(i)
        const y = yAxis.convertToPixel(d.close)
        pts.push({ x, y, v: d.close })
      }
      if (pts.length < 2) return false

      // 收集 baseY 上下交叉点，分段绘制双色面积
      const segs: { side: 'up' | 'down'; pts: Pt[] }[] = []
      let cur: { side: 'up' | 'down'; pts: Pt[] } | null = null

      function startSeg(side: 'up' | 'down', p: Pt) {
        cur = { side, pts: [p] }
        segs.push(cur)
      }

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const side = p.v >= base ? 'up' : 'down'
        if (!cur) {
          startSeg(side, p)
          continue
        }
        if (side === cur.side) {
          cur.pts.push(p)
        } else {
          // 计算与基准线的交点 x
          const prev = pts[i - 1]
          const t = (base - prev.v) / (p.v - prev.v)
          const ix = prev.x + (p.x - prev.x) * t
          const crossPt: Pt = { x: ix, y: baseY, v: base }
          cur.pts.push(crossPt)
          startSeg(side, crossPt)
          cur!.pts.push(p)
        }
      }

      ctx.save()
      for (const s of segs) {
        if (s.pts.length < 2) continue
        const grad = ctx.createLinearGradient(0, baseY - 80, 0, baseY + 80)
        if (s.side === 'up') {
          grad.addColorStop(0, 'rgba(239,35,42,0.32)')
          grad.addColorStop(1, 'rgba(239,35,42,0.02)')
        } else {
          grad.addColorStop(0, 'rgba(22,177,90,0.02)')
          grad.addColorStop(1, 'rgba(22,177,90,0.32)')
        }
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.moveTo(s.pts[0].x, baseY)
        for (const p of s.pts) ctx.lineTo(p.x, p.y)
        ctx.lineTo(s.pts[s.pts.length - 1].x, baseY)
        ctx.closePath()
        ctx.fill()
      }
      // 分时折线（红色）
      ctx.beginPath()
      ctx.strokeStyle = UP
      ctx.lineWidth = 1.6
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
      ctx.stroke()
      // 基准线（昨收）
      ctx.beginPath()
      ctx.setLineDash([4, 3])
      ctx.strokeStyle = 'rgba(180,180,180,0.7)'
      ctx.lineWidth = 1
      ctx.moveTo(pts[0].x, baseY)
      ctx.lineTo(pts[pts.length - 1].x, baseY)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
      return true // 阻止默认图元
    }
  })

  // 3. 分时量柱（按当前 close vs 上一根 close 决定颜色）
  registerIndicator({
    name: 'VOL_MINUTE',
    shortName: '分时量',
    series: 'volume',
    precision: 0,
    figures: [
      {
        key: 'volume',
        title: '量: ',
        type: 'bar',
        baseValue: 0,
        styles: (data: any, _indicator: any, defaultStyles: any) => {
          const cur = data?.current?.kLineData
          const idx = data?.current?.dataIndex
          const list = data?.kLineDataList ?? []
          const prev = idx > 0 ? list[idx - 1] : cur
          if (!cur || !prev) return { color: defaultStyles?.bars?.[0]?.noChangeColor }
          return { color: cur.close >= prev.close ? UP : DOWN }
        }
      }
    ],
    calc: (dataList: any[]) => dataList.map((d) => ({ volume: d.volume ?? 0 }))
  })
}

// ===== 数据适配：把组件 props 转成 klinecharts dataList =====
function toKlineList(): any[] {
  const t = props.type
  if (t === 'minute') {
    if (!props.minute) return []
    const { times, prices, avg, volumes } = props.minute
    return times.map((tm, i) => ({
      timestamp: i, // 用顺序索引；展示由 xAxis tickText formatter 决定
      open: prices[i],
      high: prices[i],
      low: prices[i],
      close: prices[i],
      volume: volumes?.[i] ?? 0,
      avg: avg?.[i] ?? null,
      _label: tm
    }))
  }
  if (t === 'candle' && props.candles?.length) {
    return props.candles.map((k, i) => ({
      timestamp: i,
      open: k[0],
      close: k[1],
      low: k[2],
      high: k[3],
      volume: props.volumes?.[i] ?? 0,
      _label: props.categories?.[i] ?? `D${i + 1}`,
      _channelUp: props.channel?.upper?.[i] ?? null,
      _channelLow: props.channel?.lower?.[i] ?? null
    }))
  }
  // line：用 points 模拟一条蜡烛序列（OHLC 全等于价格）
  if (t === 'line' && props.points?.length) {
    return props.points.map((p, i) => ({
      timestamp: i,
      open: p,
      close: p,
      low: p,
      high: p,
      volume: props.volumes?.[i] ?? 0,
      _label: props.categories?.[i] ?? `D${i + 1}`,
      _channelUp: props.channel?.upper?.[i] ?? null,
      _channelLow: props.channel?.lower?.[i] ?? null,
      avg: props.avg?.[i] ?? null
    }))
  }
  return []
}

// ===== 渲染 =====
async function render() {
  if (!root.value || chart.value) return
  const mod = await loadKLC()
  if (!root.value) return
  const inst = mod.init(root.value)
  if (!inst) return
  chart.value = inst

  applyAll(mod)

  ro = new ResizeObserver(() => {
    if (!chart.value) return
    chart.value.resize()
    // 容器尺寸变化时，按 visibleBars 重算 barSpace + 居中偏移
    if (props.visibleBars && props.visibleBars > 0 && props.type !== 'minute') {
      const yAxisW = 56
      const w = root.value?.clientWidth ?? 600
      const chartW = w - yAxisW
      const bar = Math.max(2, Math.min(50, chartW / props.visibleBars))
      try { chart.value.setBarSpace(bar) } catch {}
      const dataLen = toKlineList().length
      const usedW = dataLen * bar
      const rightOffset = Math.max(6, Math.round((chartW - usedW) / 2))
      try { chart.value.setOffsetRightDistance(rightOffset) } catch {}
    }
  })
  ro.observe(root.value)

  if (typeof MutationObserver !== 'undefined' && props.theme === 'auto') {
    mo = new MutationObserver(() => chart.value && chart.value.setStyles(buildStyles(getThemeMode())))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
}

function applyAll(mod: any) {
  const inst = chart.value
  if (!inst) return
  const mode = getThemeMode()
  inst.setStyles(buildStyles(mode))

  // ---- X 轴 label：分时显示 HH:mm，其他显示 _label ----
  inst.setCustomApi({
    formatDate: (_dateTimeFormat: any, timestamp: number) => {
      const list: any[] = toKlineList()
      const item = list[timestamp]
      return item?._label ?? ''
    }
  })

  // ---- 装载数据 ----
  inst.applyNewData(toKlineList())

  // ---- 主图：均线 ----
  if (props.type === 'candle' && props.ma) {
    if (Array.isArray(props.ma)) {
      // [5,10,20] —— 用 KLineChart 内置 MA（自动计算）
      inst.createIndicator(
        { name: 'MA', calcParams: props.ma },
        false,
        { id: 'candle_pane' }
      )
    } else {
      // { MA5: [...], MA10: [...] } —— 用自定义指标直接画给定数据（数据过短时更稳定）
      const maObj = props.ma as Record<string, (number | null)[]>
      const keys = Object.keys(maObj)
      inst.createIndicator(
        {
          name: 'MA_PRESET',
          shortName: 'MA',
          calcParams: keys.map((k) => parseInt(k.replace(/\D/g, ''), 10) || 0),
          figures: keys.map((k, i) => ({
            key: k,
            title: `${k}: `,
            type: 'line',
            styles: () => ({ color: MA_COLORS[i % MA_COLORS.length], size: 1.4 })
          })),
          calc: (list: any[]) =>
            list.map((_, i) => {
              const obj: Record<string, number | null> = {}
              for (const k of keys) obj[k] = maObj[k]?.[i] ?? null
              return obj
            })
        },
        false,
        { id: 'candle_pane' }
      )
    }
  }

  // ---- 分时图三件套 ----
  if (props.type === 'minute' && props.minute) {
    inst.createIndicator(
      { name: 'MINUTE_AREA', extendData: { base: props.minute.base } },
      false,
      { id: 'candle_pane' }
    )
    if (props.minute.avg) {
      inst.createIndicator('AVG', false, { id: 'candle_pane' })
    }
    if (props.minute.volumes?.length) {
      inst.createIndicator('VOL_MINUTE')
    }
  }

  // ---- 副图指标 ----
  if (props.type === 'candle') {
    const subs = props.subIndicators ?? (props.volumes?.length ? ['VOL'] : [])
    for (const name of subs) {
      inst.createIndicator(name)
    }
  }

  // ---- line：通道与均价线作为 overlays / 自定义指标 ----
  // 通道（candle / line 都支持）：把上下轨作为自定义指标画在主图
  if ((props.type === 'line' || props.type === 'candle') && props.channel) {
    inst.createIndicator(
      {
        name: 'CHANNEL',
        shortName: '通道',
        calcParams: [],
        figures: [
          { key: 'up', title: '上轨: ', type: 'line', styles: () => ({ color: '#3e9eff', size: 1.2, style: 'dashed' }) },
          { key: 'low', title: '下轨: ', type: 'line', styles: () => ({ color: '#3e9eff', size: 1.2, style: 'dashed' }) }
        ],
        calc: (list: any[]) => list.map((d: any) => ({ up: d._channelUp, low: d._channelLow }))
      },
      false,
      { id: 'candle_pane' }
    )
  }
  if (props.type === 'line' && props.avg?.length) {
    inst.createIndicator('AVG', false, { id: 'candle_pane' })
  }

  // ---- markLines（颈线 / 支撑 / 压力）----
  const marks: MarkLineItem[] = props.markLines ?? []
  for (const m of marks) {
    inst.createOverlay({
      name: 'priceLine',
      lock: true,
      points: [{ value: m.y }],
      extendData: m.text ?? '',
      styles: {
        line: { color: m.color ?? '#ffb300', style: 'dashed' },
        text: { color: '#fff', backgroundColor: m.color ?? '#ffb300' }
      }
    })
  }

  // ---- 通用 overlays prop ----
  if (props.overlays?.length) {
    for (const o of props.overlays) {
      if (o.type === 'priceLine') {
        inst.createOverlay({
          name: 'priceLine',
          lock: true,
          points: [{ value: o.value }],
          extendData: o.text ?? '',
          styles: { line: { color: o.color ?? '#ffb300', style: 'dashed' } }
        })
      } else if (o.type === 'segment') {
        inst.createOverlay({
          name: 'segment',
          lock: true,
          points: [
            { dataIndex: o.from[0], value: o.from[1] },
            { dataIndex: o.to[0], value: o.to[1] }
          ]
        })
      } else if (o.type === 'rect') {
        inst.createOverlay({
          name: 'rect',
          lock: true,
          points: [
            { dataIndex: o.from[0], value: o.from[1] },
            { dataIndex: o.to[0], value: o.to[1] }
          ]
        })
      }
    }
  }

  // ---- 缩放开关 ----
  inst.setOffsetRightDistance(props.zoom ? 30 : 6)
  inst.setMaxOffsetLeftDistance(props.zoom ? 100 : 0)

  // ---- 可见 K 线根数：等效于"滚轮放大到 N 根 K 线"----
  // 关键点：klinecharts 内部 BarSpaceLimitConstants.MAX = 50px，超过会被拒绝，
  // 所以理想 barSpace 必须 clamp 到 [1, 50]。
  // 当数据条数 < visibleBars 时，K 线会靠右贴 Y 轴，再通过 setOffsetRightDistance
  // 把右侧推开，使真实 K 线在画布中**水平居中**。
  if (props.visibleBars && props.visibleBars > 0 && props.type !== 'minute') {
    const yAxisW = 56
    const containerW = root.value?.clientWidth ?? 600
    const chartW = containerW - yAxisW
    // 理想宽度
    const ideal = chartW / props.visibleBars
    // 受 klinecharts 限制：bar 最大 50
    const bar = Math.max(2, Math.min(50, ideal))
    try {
      inst.setBarSpace(bar)
    } catch {}
    // 数据条数（真实 + 空 K）
    const dataLen = toKlineList().length
    // 实际数据占据的宽度
    const usedW = dataLen * bar
    // 居中：右侧偏移 = (绘图区宽 - 数据宽) / 2
    const rightOffset = Math.max(6, Math.round((chartW - usedW) / 2))
    inst.setOffsetRightDistance(rightOffset)
  }

  // ---- 底部强制标签：在指定 K 线下方画文字，绕开 X 轴 tick 稀疏算法 ----
  if (props.bottomLabels?.length) {
    for (const lb of props.bottomLabels) {
      // value 取一个绝对低位（用 1e-9 避免被裁掉），让 overlay 点落在底部
      inst.createOverlay({
        name: 'bottomLabel',
        lock: true,
        points: [{ dataIndex: lb.dataIndex, value: 0 }],
        extendData: lb.text
      })
    }
  }
}

function normalizeMAPeriods(ma: any): number[] {
  if (!ma) return []
  if (Array.isArray(ma)) return ma
  // 老对象形式 { MA5: [...], MA10: [...] } —— 用 key 取数字
  const ks = Object.keys(ma).map((k) => parseInt(k.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n))
  return ks.length ? ks : []
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    render()
    return
  }
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        render()
        io && io.disconnect()
        io = null
      }
    },
    { rootMargin: '120px' }
  )
  if (root.value) io.observe(root.value)
})

onBeforeUnmount(async () => {
  io && io.disconnect()
  ro && ro.disconnect()
  mo && mo.disconnect()
  if (chart.value) {
    try {
      const mod = await klcPromise
      mod?.dispose(root.value!)
    } catch {}
    chart.value = null
  }
})

// 当数据 prop 变化时重新刷新
watch(
  () => [props.candles, props.points, props.minute, props.volumes, props.ma, props.markLines, props.overlays],
  async () => {
    if (!chart.value) return
    const mod = await loadKLC()
    // 清掉所有 pane 的指标 / 覆盖物再重建
    chart.value.removeIndicator('candle_pane')
    chart.value.removeOverlay()
    applyAll(mod)
  },
  { deep: true }
)
</script>

<template>
  <figure class="stock-chart" :data-theme="theme">
    <div v-if="title" class="stock-chart__title">{{ title }}</div>
    <div ref="root" class="stock-chart__canvas" :style="{ height: height + 'px' }" />
  </figure>
</template>

<style scoped>
.stock-chart {
  margin: 18px 0 24px;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: #0e1217;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.15) inset;
}
.stock-chart[data-theme='light'] {
  background: #ffffff;
}
.stock-chart__title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  padding: 8px 14px 6px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
  letter-spacing: 0.2px;
}
.stock-chart[data-theme='light'] .stock-chart__title {
  color: var(--vp-c-text-1);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0));
}
.stock-chart__canvas {
  width: 100%;
}
</style>
