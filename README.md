# Harbourline University · School Campus Days

A live mockup (Vue 3 + Vite + TypeScript) of the School Campus Days tool for **Harbourline University** (a fictional Australian university). Partner high schools register their Year 11 and Year 12 students and choose preferred dates; the Future Students team manages students, dates and schools, then **places** each school on campus days within a daily quota. All data is mock data in memory (`src/data/mock.ts`), so a refresh resets it.

```bash
npm install
npm run dev
```

## Placement

`src/lib/placement.ts` runs a greedy algorithm. It repeatedly opens the date that can take the most unplaced students within that day's quota. A school and year group with no other date left is filled first. A school may be split across dates. Students left with no date go on the **waitlist**: their school didn't finish, picked no dates, picked only blocked days, or there was no room.

The Excel export (`src/lib/exportExcel.ts`) has two sheets: **Chosen dates** and **Student lists**.
