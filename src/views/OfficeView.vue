<script setup lang="ts">
import { computed, ref } from 'vue'
import { ACTIVE_YEAR, flash, partInsts, state, openSpecial, deleteSpecial } from '@/store'
import { full } from '@/lib/dates'
import { exportPlacement } from '@/lib/exportExcel'
import Icon from '@/components/Icon.vue'
import StudentsTab from '@/tabs/StudentsTab.vue'
import DatesTab from '@/tabs/DatesTab.vue'
import InstsTab from '@/tabs/InstsTab.vue'
import PlacementTab from '@/tabs/PlacementTab.vue'
import RunPanel from '@/components/RunPanel.vue'
import PlacementEntry from '@/components/PlacementEntry.vue'
import type { OfficeTab } from '@/store'

const yearOpen = ref(false)
const years = ['2027', '2026', '2025']
const lq = ref('')
const fOpen = ref(false)
const filters = ref({ inst: '', cls: '', st: '' })
const fCount = computed(() => (filters.value.inst ? 1 : 0) + (filters.value.cls ? 1 : 0) + (filters.value.st ? 1 : 0))

const go = (t: OfficeTab) => { state.tab = t; lq.value = '' }
// placement is its own area: remember which tab to return to
const backTab = ref<OfficeTab>('students')
const openPlacement = () => { if (state.tab !== 'placement') backTab.value = state.tab; go('placement') }

// pie
const C = 2 * Math.PI * 44
const pie = computed(() => {
  const p = partInsts.value
  const tot = p.length || 1
  const rows = [
    { label: 'Finished', n: p.filter(i => i.status === 'done').length, color: '#69C600' },
    { label: 'In progress', n: p.filter(i => i.status === 'progress').length, color: '#5D87FF' },
    { label: 'Not started', n: p.filter(i => i.status === 'none').length, color: '#FF1D47' },
  ]
  let acc = 0
  const segs = rows.filter(r => r.n > 0).map(r => {
    const len = (C * r.n) / tot
    const seg = { color: r.color, dash: (len - 1.5).toFixed(2) + ' ' + (C - len + 1.5).toFixed(2), off: (-acc).toFixed(2) }
    acc += len
    return seg
  })
  return { rows: rows.map(r => ({ ...r, pct: Math.round((r.n * 100) / tot) + '%' })), segs, total: p.length }
})

const specialsSorted = computed(() => state.specials.slice().sort((a, b) => (a.d < b.d ? -1 : 1)))
const editSpecial = (d: string) => openSpecial(d)
const delSpecial = deleteSpecial

const hasConflicts = computed(() => partInsts.value.some(i => [...i.dates.bog, ...i.dates.tz].some(x => state.specials.some(s => s.d === x.d && s.quota === 0))))
const searchPh = computed(() => state.tab === 'students' ? 'Search by name, student no., phone or school…' : state.tab === 'placement' ? 'Search by school, student name or student no.…' : 'Search by school name or code…')

const doExport = () => {
  if (state.tab !== 'placement') return flash('Excel export is available in the placement area')
  if (!state.placement) return flash('Run the placement before exporting')
  exportPlacement(state.placement, state.insts)
  flash('Excel file downloaded')
}
</script>

<template>
  <div class="l-page">
    <div class="l-head">
    <div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0">
      <h1 style="margin: 0; font-size: 30px; font-weight: 700">Hello, Future Students team</h1>
      <div style="position: relative; display: flex; align-items: center; gap: 8px; font-size: 15px; color: #6D6E8D">
        <span>Campus Days overview, showing data for the active year:</span>
        <span style="position: relative">
          <button class="year-btn" :aria-expanded="yearOpen" aria-label="Choose year" @click="yearOpen = !yearOpen">{{ state.year }}<Icon name="down" :size="14" :sw="2.2" /></button>
          <div v-if="yearOpen" class="pop" role="menu">
            <button v-for="(y, k) in years" :key="y" class="pop-item" role="menuitemradio" :aria-pressed="state.year === y" @click="state.year = y; yearOpen = false">
              <span>{{ y }}</span><span style="font-size: 12px; color: #6D6E8D">{{ k === 0 ? 'Active year' : '' }}</span>
            </button>
          </div>
        </span>
      </div>
    </div>
    <RunPanel v-if="state.tab === 'placement'" @export="doExport" />
    <PlacementEntry v-else @open="openPlacement" />
    </div>

    <div v-if="state.year !== ACTIVE_YEAR" class="banner banner-info" role="status">
      <Icon name="info" :size="20" :sw="2" style="color: #5D87FF; flex-shrink: 0; margin-top: 1px" />
      <span style="flex: 1">Showing data for {{ state.year }}, a past year. It's view-only.</span>
      <button class="link-btn" @click="state.year = ACTIVE_YEAR">Back to the active year</button>
    </div>

    <div class="l-body">
      <!-- side column -->
      <aside class="scroll l-aside">
        <section class="card" aria-labelledby="pie-t">
          <div class="card-h"><h2 id="pie-t" class="card-t">Partner school status</h2></div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 24px">
            <div style="display: flex; flex-direction: column; gap: 12px; flex: 1">
              <div v-for="p in pie.rows" :key="p.label" style="display: flex; align-items: center; gap: 10px">
                <span class="legend-dot" :style="{ background: p.color }"></span>
                <span style="flex: 1; font-size: 15px">{{ p.label }}</span>
                <span class="num" style="font-size: 18px; font-weight: 700">{{ p.n }}</span>
                <span class="num" style="width: 44px; font-size: 12.5px; color: #6D6E8D">({{ p.pct }})</span>
              </div>
            </div>
            <div style="position: relative; width: 112px; height: 112px; flex-shrink: 0">
              <svg width="112" height="112" viewBox="0 0 112 112" role="img" :aria-label="pie.rows.map(r => r.label + ' ' + r.n).join(', ')">
                <circle cx="56" cy="56" r="44" fill="none" stroke="#EAEDEF" stroke-width="18" />
                <circle v-for="(g, k) in pie.segs" :key="k" cx="56" cy="56" r="44" fill="none" :stroke="g.color" stroke-width="18" :stroke-dasharray="g.dash" :stroke-dashoffset="g.off" transform="rotate(-90 56 56)" />
              </svg>
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center">
                <span style="font-size: 12px; color: #6D6E8D">Total</span>
                <span class="num" style="font-size: 18px; font-weight: 700">{{ pie.total }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="par-t">
          <div class="card-h"><h2 id="par-t" class="card-t">Settings</h2></div>
          <div style="padding: 18px 24px 22px; display: flex; flex-direction: column; gap: 6px">
            <label class="lbl" for="quota-in">Default daily quota (students)</label>
            <input id="quota-in" class="input num" type="number" min="1" :value="state.quota" @change="state.quota = parseInt(($event.target as HTMLInputElement).value, 10) || 0" />
            <span style="font-size: 12.5px; color: #6D6E8D">Applies to every day that isn't a special date</span>
          </div>
        </section>

        <section class="card fill-card sp-card" aria-labelledby="sp-t">
          <div class="card-h">
            <h2 id="sp-t" class="card-t">Special dates</h2>
            <span style="display: flex; gap: 2px">
              <button class="icon-btn" aria-label="Open all special dates" title="Expand" @click="state.modal = { type: 'specials' }"><Icon name="expand" :size="18" :sw="2" /></button>
              <button class="icon-btn" aria-label="Add special date" @click="openSpecial(null)"><Icon name="plus" :size="20" :sw="2" /></button>
            </span>
          </div>
          <div class="fill-body scroll">
          <div class="tbl-head cols-sp" style="padding: 0 20px"><span>Date</span><span>Description</span><span>Quota</span><span class="sr-only">Actions</span></div>
          <div v-for="sp in specialsSorted" :key="sp.d" class="tbl-row cols-sp" style="padding: 6px 20px; min-height: 52px">
            <span class="num">{{ full(sp.d) }}</span>
            <span class="ell" :title="sp.desc">{{ sp.desc }}</span>
            <span><span :class="sp.quota === 0 ? 'chip chip-none' : 'chip chip-yellow'">{{ sp.quota === 0 ? 'Blocked' : sp.quota }}</span></span>
            <span style="display: flex; justify-content: flex-end">
              <button class="icon-btn" aria-label="Edit special date" @click="editSpecial(sp.d)"><Icon name="edit" :size="17" /></button>
              <button class="icon-btn is-danger" aria-label="Delete special date" @click="delSpecial(sp.d)"><Icon name="trash" :size="17" /></button>
            </span>
          </div>
          <div v-if="!specialsSorted.length" style="padding: 24px; text-align: center; font-size: 14px; color: #6D6E8D; border-top: 1px solid #EAEDEF">No special dates yet</div>
          </div>
        </section>
      </aside>

      <!-- main column -->
      <section class="l-main">
        <div class="toolbar">
          <button v-if="state.tab === 'placement'" class="tool-btn" @click="go(backTab)"><Icon name="left" :size="18" :sw="2.2" />Back to registrations</button>
          <div class="search">
            <Icon name="search" :size="18" :sw="2" />
            <input v-model="lq" type="search" aria-label="Search" :placeholder="searchPh" />
          </div>
          <button v-if="state.tab === 'students'" :class="'tool-btn' + (fOpen || fCount ? ' is-on' : '')" :aria-expanded="fOpen" @click="fOpen = !fOpen">
            <Icon name="filter" />Filter<span v-if="fCount" class="f-badge">{{ fCount }}</span>
          </button>
          <button class="tool-btn" aria-label="Export to Excel" title="Export to Excel" @click="doExport"><Icon name="download" :size="20" /></button>
          <div v-if="state.tab !== 'placement'" class="seg-tabs" role="tablist" aria-label="View" style="margin-left: 12px">
            <button class="seg-tab" role="tab" :aria-pressed="state.tab === 'students'" :aria-selected="state.tab === 'students'" @click="go('students')">Students</button>
            <button class="seg-tab" role="tab" :aria-pressed="state.tab === 'dates'" :aria-selected="state.tab === 'dates'" @click="go('dates')">Dates<span v-if="hasConflicts" class="legend-dot" style="width: 8px; height: 8px; background: #FF1D47" aria-label="Some dates are blocked"></span></button>
            <button class="seg-tab" role="tab" :aria-pressed="state.tab === 'insts'" :aria-selected="state.tab === 'insts'" @click="go('insts')">Schools</button>
          </div>
        </div>

        <StudentsTab v-if="state.tab === 'students'" :q="lq" :f-open="fOpen" :filters="filters" @clear="filters = { inst: '', cls: '', st: '' }" />
        <DatesTab v-else-if="state.tab === 'dates'" :q="lq" />
        <InstsTab v-else-if="state.tab === 'insts'" :q="lq" />
        <PlacementTab v-else :q="lq" />
      </section>
    </div>
  </div>
</template>
