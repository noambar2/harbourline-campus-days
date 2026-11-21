<script setup lang="ts">
import { SCHOOL_ACTIVE, SCHOOL_NEW, state } from '@/store'
import Icon from '@/components/Icon.vue'
import OfficeView from '@/views/OfficeView.vue'
import SchoolView from '@/views/SchoolView.vue'
import StudentModal from '@/modals/StudentModal.vue'
import DqModal from '@/modals/DqModal.vue'
import DatesModal from '@/modals/DatesModal.vue'
import SpecialModal from '@/modals/SpecialModal.vue'
import NoteModal from '@/modals/NoteModal.vue'
import SpecialsModal from '@/modals/SpecialsModal.vue'

const setRole = (r: 'office' | 'school', schoolId?: string) => {
  state.role = r
  if (schoolId) state.schoolId = schoolId
  state.modal = null
}
const isSchool = (id: string) => state.role === 'school' && state.schoolId === id
</script>

<template>
  <div class="app" dir="ltr">
    <nav aria-label="Main menu" style="width: 52px; flex-shrink: 0; background: linear-gradient(to bottom, #5C6BF3 0%, #4389F7 100%); display: flex; flex-direction: column; align-items: center">
      <div style="height: 56px; width: 100%; display: flex; align-items: center; justify-content: center">
        <div title="Harbourline University" style="width: 28px; height: 28px; border-radius: 7px; background: #fff; color: #5C6BF3; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700">H</div>
      </div>
      <button class="rail-btn" aria-label="Home"><Icon name="home" :size="22" :sw="1.7" /></button>
      <button class="rail-btn" aria-label="Applicants"><Icon name="usersearch" :size="22" :sw="1.7" /></button>
      <button class="rail-btn" aria-label="Messages"><Icon name="msg" :size="22" :sw="1.7" /></button>
      <button class="rail-btn is-active" aria-label="Campus Days" aria-current="page"><Icon name="people" :size="22" /></button>
      <button class="rail-btn" aria-label="Events"><Icon name="cal" :size="22" :sw="1.7" /></button>
      <button class="rail-btn" aria-label="Tasks"><Icon name="tasks" :size="22" :sw="1.7" /></button>
    </nav>

    <main style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column">
      <header style="position: relative; z-index: 3; height: 56px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px 0 40px; background: linear-gradient(to right, #5C6BF3 0%, #4389F7 38%, #1FB5FB 78%, #00D9FF 100%); box-shadow: 0 4px 14px -6px rgba(0,0,0,.2)">
        <nav aria-label="Breadcrumb">
          <ol style="list-style: none; margin: 0; padding: 0; display: flex; align-items: center; gap: 10px; font-size: 15px; color: #fff">
            <li><button class="crumb-link">Schools Outreach</button></li>
            <li aria-hidden="true" style="display: flex"><Icon name="right" :size="14" :sw="2.2" /></li>
            <li><span style="font-weight: 600">Campus Days</span></li>
          </ol>
        </nav>
        <div class="role-seg" role="group" aria-label="View as">
          <span class="role-lbl">View as:</span>
          <button class="role-btn" :aria-pressed="isSchool(SCHOOL_NEW)" title="A school that hasn't started registering" @click="setRole('school', SCHOOL_NEW)">New school</button>
          <button class="role-btn" :aria-pressed="isSchool(SCHOOL_ACTIVE)" title="A school partway through registering, or finished" @click="setRole('school', SCHOOL_ACTIVE)">School</button>
          <button class="role-btn" :aria-pressed="state.role === 'office'" @click="setRole('office')">Future Students team</button>
        </div>
      </header>

      <div class="scroll page-scroll">
        <OfficeView v-if="state.role === 'office'" />
        <SchoolView v-else :key="state.schoolId" />
      </div>
    </main>

    <StudentModal v-if="state.modal?.type === 'student'" />
    <DqModal v-if="state.modal?.type === 'dq'" />
    <DatesModal v-if="state.modal?.type === 'dates'" />
    <SpecialModal v-if="state.modal?.type === 'special'" />
    <NoteModal v-if="state.modal?.type === 'note'" />
    <SpecialsModal v-if="state.modal?.type === 'specials'" />

    <div v-if="state.toast" class="toast" role="status"><Icon name="check" :size="18" :sw="2.6" style="color: #69C600" />{{ state.toast }}</div>
  </div>
</template>
