# AI 作文評分系統 — 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依照 `docs/superpowers/specs/2026-04-21-essay-grader-design.md`，實作一個純前端、部署於 GitHub Pages 的 AI 作文評分網頁應用，處理國小手寫作文 PDF、用 Gemini 2.5 Flash 評分並提供班級分析。

**Architecture:** Vite + React + TypeScript 單頁應用；所有資料存於瀏覽器 IndexedDB（Dexie.js）；PDF 拆頁與 AI 呼叫都在前端完成，無任何伺服器。推到 `GuinnGreen/Ai_Sheet`，GitHub Actions 自動部署到 `https://guinngreen.github.io/Ai_Sheet/`。

**Tech Stack:** Vite、React 18、TypeScript、Tailwind CSS、shadcn/ui、Dexie.js、pdfjs-dist、@google/genai、zod、Zustand、recharts、jszip、vitest、Playwright（選配）。

**Dispatch note:** 每個 Phase 設計為可交給一個 Codex agent 獨立完成。標註 `[並行可]` 的 Phase 之間沒有依賴，可同時派工。Claude 的工作是在每個 Phase 結束時 review。

---

## Phases 總覽與依賴

```
Phase 0: 專案骨架                ─┐
Phase 1: 型別定義                 ├─ sequential
Phase 2: 資料庫層 (Dexie)          ─┘
        ↓
Phase 3: 姓名比對        [並行可]
Phase 4: PDF 拆頁         [並行可]
Phase 5: Gemini Client    [並行可]
Phase 7: 備份/還原        [並行可]
Phase 8: 班級統計         [並行可]
        ↓
Phase 6: 評分 Orchestration  (依賴 3, 4, 5)
        ↓
Phase 9: UI 基礎 + Settings       [並行可 with 10]
Phase 10: 班級/批次 CRUD UI        [並行可 with 9]
        ↓
Phase 11: 批次工作台
Phase 12: 班級報告 + 匯出
        ↓
Phase 13: 部署與文件
```

---

## Phase 0：專案骨架與開發環境

**範疇**：初始化 Vite 專案、安裝依賴、設定 Tailwind、Vitest、路徑別名、GitHub remote 與 Actions。

### Task 0.1: 建立 Vite + React + TS 骨架

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: 在專案根目錄執行 Vite scaffolding**

```bash
cd /Users/guin/Code/AI作文評分
# 先清掉可能存在的空 src
rm -rf src
# 用 npm create 產生到當前目錄（不另外建子資料夾）
npm create vite@latest . -- --template react-ts
```

若遇到 "Target directory is not empty"，選擇 **Ignore files and continue**。

- [ ] **Step 2: 安裝依賴**

```bash
npm install
```

- [ ] **Step 3: 修改 `vite.config.ts`，設 base path**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: '/Ai_Sheet/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: 修改 `tsconfig.json` 加 path alias**

在 `compilerOptions` 中加入：

```json
"baseUrl": ".",
"paths": { "@/*": ["src/*"] }
```

- [ ] **Step 5: 驗證 dev server 能起**

```bash
npm run dev
```

預期：看到 `VITE vX.X.X ready`、瀏覽器打開 `http://localhost:5173/Ai_Sheet/` 顯示 Vite 預設畫面。按 Ctrl+C 結束。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: 初始化 Vite + React + TypeScript 骨架"
```

### Task 0.2: 安裝與設定 Tailwind CSS

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: 安裝 Tailwind v3（shadcn/ui 生態仍以 v3 為主）**

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: 設定 `tailwind.config.js`（產生的是 .js，改名為 .ts 並填內容）**

```bash
mv tailwind.config.js tailwind.config.ts
```

內容：

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans TC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: 覆寫 `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body { @apply bg-slate-50 text-slate-900 antialiased; }
```

- [ ] **Step 4: 驗證 Tailwind 生效**

改 `src/App.tsx` 讓整個內容變成：

```tsx
export default function App() {
  return <div className="p-8 text-2xl font-bold text-sky-600">Tailwind OK</div>
}
```

跑 `npm run dev`，看到藍色大字即可。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: 設定 Tailwind CSS"
```

### Task 0.3: 安裝核心執行期依賴

**Files:** 僅 `package.json`

- [ ] **Step 1: 安裝**

```bash
npm install dexie dexie-react-hooks @google/genai pdfjs-dist \
  zod zustand react-router-dom recharts jszip file-saver \
  clsx tailwind-merge lucide-react
npm install -D @types/file-saver vitest @vitest/ui happy-dom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 2: 在 `src/lib/utils.ts` 建立 shadcn 慣例的 `cn` 工具**

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: 安裝執行期與測試依賴"
```

### Task 0.4: 設定 Vitest

**Files:**
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 2: `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'

// happy-dom 沒有 structuredClone polyfill for Dexie
if (typeof structuredClone === 'undefined') {
  // @ts-expect-error polyfill
  globalThis.structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v))
}
```

- [ ] **Step 3: 在 `package.json` 加 scripts**

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 4: 寫 smoke test `src/test/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => { expect(1 + 1).toBe(2) })
})
```

- [ ] **Step 5: 跑測試**

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: 設定 Vitest 與 happy-dom 環境"
```

### Task 0.5: GitHub Actions 部署 workflow

**Files:** Create `.github/workflows/deploy.yml`

- [ ] **Step 1: 建檔**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "ci: GitHub Actions 自動部署至 GitHub Pages"
```

### Task 0.6: 連結遠端 repo

**Files:** 無

- [ ] **Step 1: 加 remote 並推送**

```bash
cd /Users/guin/Code/AI作文評分
git remote add origin https://github.com/GuinnGreen/Ai_Sheet.git
git push -u origin main
```

- [ ] **Step 2: 至 GitHub repo Settings → Pages，將 Source 設為「GitHub Actions」**

（此步驟為瀏覽器操作，由老師本人完成一次即可。Agent 無法自動做此步驟，應在 README 中提示。）

**Phase 0 驗收條件（review）：**
- `npm run dev` 能起，看到 Tailwind 樣式
- `npm test` 通過 smoke test
- 推到 GitHub 後 Actions 能綠燈跑完 build

---

## Phase 1：型別定義

**範疇**：把 spec §4.1、§4.2 的 TypeScript 型別寫出來，後續所有模組都依這些型別。

### Task 1.1: 建立 `src/types/index.ts`

**Files:** Create `src/types/index.ts`

- [ ] **Step 1: 寫型別**

```ts
// ---------- Rubric ----------
export interface RubricDimension {
  name: string       // "立意取材" | "結構組織" | "遣詞造句"
  maxScore: number   // 通常 2
}

export interface RubricDeductions {
  typoPerThree: number   // 每 3 錯字扣 N 分
  typoMax: number        // 錯字扣分上限
  lengthUnder: number    // 字數不足扣分
}

export interface Rubric {
  dimensions: RubricDimension[]
  deductions: RubricDeductions
}

export const DEFAULT_RUBRIC: Rubric = {
  dimensions: [
    { name: '立意取材', maxScore: 2 },
    { name: '結構組織', maxScore: 2 },
    { name: '遣詞造句', maxScore: 2 },
  ],
  deductions: { typoPerThree: 0.5, typoMax: 1, lengthUnder: 1 },
}

// ---------- Scores ----------
export interface RubricScores {
  dimensionScores: Record<string, number>
  typoDeduction: number
  lengthDeduction: number
  total: number
}

export interface Typo {
  wrong: string
  correct: string
  context: string
}

// ---------- Entities ----------
export interface Setting {
  key: string
  value: unknown
}

export interface Class {
  id: string
  name: string
  grade: number
  schoolYear: string
  createdAt: number
}

export interface Student {
  id: string
  classId: string
  seatNo: number
  name: string
}

export type BatchStatus =
  | 'draft'
  | 'splitting'
  | 'ready_to_grade'
  | 'grading'
  | 'completed'

export interface Batch {
  id: string
  classId: string
  title: string
  topic: string
  minWords: number
  rubric: Rubric
  examDate: string
  createdAt: number
  status: BatchStatus
}

export type EssayStatus = 'pending' | 'graded' | 'reviewed'

export interface Essay {
  id: string
  batchId: string
  studentId: string | null
  pageIds: string[]
  ocrName: string | null
  matchConfidence: number
  aiScores: RubricScores | null
  aiComment: string | null
  aiTypos: Typo[]
  aiHighlights: string[]
  aiReadabilityNotes: string | null
  teacherScores: RubricScores | null
  teacherComment: string | null
  status: EssayStatus
  updatedAt: number
}

export interface Page {
  id: string
  essayId: string | null
  batchId: string
  pageIndex: number
  imageBlob: Blob
  thumbnailBlob: Blob
  rotation: number
}

export interface GradingRun {
  id: string
  essayId: string
  model: string
  promptVersion: string
  rawResponse: string
  parsedResult: unknown
  costEstimateUsd: number
  durationMs: number
  createdAt: number
}
```

- [ ] **Step 2: 跑 `npm run build` 確認無型別錯誤**

Expected: build 成功（此時還沒有 UI 使用這些型別，不會 warning）

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(types): 定義核心領域型別"
```

**Phase 1 驗收條件：** `tsc` 無錯誤；所有 spec §4 的型別都在 `src/types/index.ts`。

---

## Phase 2：資料庫層（Dexie / IndexedDB）

**範疇**：封裝 Dexie Database、各表 CRUD 函式、並用 fake-indexeddb 在 Node/happy-dom 中做測試。

### Task 2.1: 安裝 fake-indexeddb 並建 Dexie 初始化

**Files:**
- Create: `src/core/db.ts`
- Modify: `src/test/setup.ts`

- [ ] **Step 1: 安裝**

```bash
npm install -D fake-indexeddb
```

- [ ] **Step 2: 在 `src/test/setup.ts` 頂部加入**

```ts
import 'fake-indexeddb/auto'
```

（必須在 import '@testing-library/jest-dom/vitest' 之前）

- [ ] **Step 3: 寫 `src/core/db.ts`**

```ts
import Dexie, { type EntityTable } from 'dexie'
import type {
  Setting, Class, Student, Batch, Essay, Page, GradingRun,
} from '@/types'

export class EssayGraderDB extends Dexie {
  settings!: EntityTable<Setting, 'key'>
  classes!: EntityTable<Class, 'id'>
  students!: EntityTable<Student, 'id'>
  batches!: EntityTable<Batch, 'id'>
  essays!: EntityTable<Essay, 'id'>
  pages!: EntityTable<Page, 'id'>
  gradingRuns!: EntityTable<GradingRun, 'id'>

  constructor() {
    super('essay-grader')
    this.version(1).stores({
      settings: 'key',
      classes: 'id, name',
      students: 'id, classId, seatNo, name, [classId+seatNo]',
      batches: 'id, classId, createdAt, status',
      essays: 'id, batchId, studentId, status, [batchId+studentId]',
      pages: 'id, essayId, batchId, pageIndex',
      gradingRuns: 'id, essayId, createdAt',
    })
  }
}

export const db = new EssayGraderDB()
```

- [ ] **Step 4: Smoke test `src/core/db.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

describe('EssayGraderDB', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('stores and retrieves a class', async () => {
    await db.classes.add({
      id: 'c1', name: '六年十班', grade: 6,
      schoolYear: '114-2', createdAt: Date.now(),
    })
    const c = await db.classes.get('c1')
    expect(c?.name).toBe('六年十班')
  })
})
```

- [ ] **Step 5: 跑測試**

Run: `npm test`
Expected: 新測試通過

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): Dexie schema 與初始化"
```

### Task 2.2: CRUD helpers — classes / students

**Files:**
- Create: `src/core/repos/classes.ts`
- Create: `src/core/repos/students.ts`
- Create: `src/core/repos/classes.test.ts`
- Create: `src/core/repos/students.test.ts`

- [ ] **Step 1: 寫 `classes.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createClass, listClasses, deleteClass } from './classes'

describe('classes repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createClass 產生 uuid 並存入', async () => {
    const c = await createClass({ name: '六年十班', grade: 6, schoolYear: '114-2' })
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/)
    const all = await listClasses()
    expect(all).toHaveLength(1)
  })

  it('deleteClass 連帶刪除底下的學生', async () => {
    const c = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await db.students.add({ id: 's1', classId: c.id, seatNo: 1, name: '王' })
    await deleteClass(c.id)
    expect(await db.students.count()).toBe(0)
  })
})
```

- [ ] **Step 2: 實作 `classes.ts`**

```ts
import { db } from '../db'
import type { Class } from '@/types'

export async function createClass(
  input: Omit<Class, 'id' | 'createdAt'>
): Promise<Class> {
  const c: Class = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
  await db.classes.add(c)
  return c
}

export async function listClasses(): Promise<Class[]> {
  return db.classes.orderBy('name').toArray()
}

export async function getClass(id: string) {
  return db.classes.get(id)
}

export async function updateClass(id: string, patch: Partial<Class>) {
  await db.classes.update(id, patch)
}

export async function deleteClass(id: string) {
  await db.transaction('rw', db.classes, db.students, async () => {
    await db.students.where('classId').equals(id).delete()
    await db.classes.delete(id)
  })
}
```

- [ ] **Step 3: 寫 `students.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createStudent, listStudents, importStudentsFromCsv } from './students'

describe('students repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createStudent 與 listStudents 依座號排序', async () => {
    await createStudent({ classId: 'c1', seatNo: 3, name: '林' })
    await createStudent({ classId: 'c1', seatNo: 1, name: '王' })
    const list = await listStudents('c1')
    expect(list.map(s => s.seatNo)).toEqual([1, 3])
  })

  it('importStudentsFromCsv 解析兩欄（座號,姓名）', async () => {
    const csv = '座號,姓名\n1,王小明\n2,陳大華\n'
    const imported = await importStudentsFromCsv('c1', csv)
    expect(imported).toHaveLength(2)
    expect(imported[1].name).toBe('陳大華')
  })
})
```

- [ ] **Step 4: 實作 `students.ts`**

```ts
import { db } from '../db'
import type { Student } from '@/types'

export async function createStudent(
  input: Omit<Student, 'id'>
): Promise<Student> {
  const s: Student = { ...input, id: crypto.randomUUID() }
  await db.students.add(s)
  return s
}

export async function listStudents(classId: string): Promise<Student[]> {
  return db.students.where('classId').equals(classId).sortBy('seatNo')
}

export async function updateStudent(id: string, patch: Partial<Student>) {
  await db.students.update(id, patch)
}

export async function deleteStudent(id: string) {
  await db.students.delete(id)
}

export async function importStudentsFromCsv(
  classId: string,
  csvText: string
): Promise<Student[]> {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean)
  const header = lines[0].split(',')
  const seatIdx = header.findIndex(h => /座號|seat/i.test(h))
  const nameIdx = header.findIndex(h => /姓名|name/i.test(h))
  if (seatIdx < 0 || nameIdx < 0) throw new Error('CSV 需含「座號」與「姓名」欄')
  const out: Student[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(c => c.trim())
    const seatNo = Number(cells[seatIdx])
    const name = cells[nameIdx]
    if (!Number.isFinite(seatNo) || !name) continue
    out.push(await createStudent({ classId, seatNo, name }))
  }
  return out
}
```

- [ ] **Step 5: 跑測試**

Run: `npm test`
Expected: 全部通過

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(repos): classes 與 students CRUD、CSV 匯入"
```

### Task 2.3: CRUD helpers — batches / essays / pages / gradingRuns

**Files:**
- Create: `src/core/repos/batches.ts` + test
- Create: `src/core/repos/essays.ts` + test
- Create: `src/core/repos/pages.ts` + test
- Create: `src/core/repos/gradingRuns.ts`

- [ ] **Step 1: 寫 `batches.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createBatch, listBatches, updateBatch } from './batches'
import { DEFAULT_RUBRIC } from '@/types'

describe('batches repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createBatch 設預設狀態 draft', async () => {
    const b = await createBatch({
      classId: 'c1', title: '第一次段考', topic: '那些未曾褪色的風景',
      minWords: 500, rubric: DEFAULT_RUBRIC, examDate: '2026-04-21',
    })
    expect(b.status).toBe('draft')
  })

  it('listBatches 依 createdAt 由新到舊', async () => {
    const b1 = await createBatch({
      classId: 'c1', title: 'A', topic: 't', minWords: 500,
      rubric: DEFAULT_RUBRIC, examDate: '2026-01-01',
    })
    await new Promise(r => setTimeout(r, 5))
    const b2 = await createBatch({
      classId: 'c1', title: 'B', topic: 't', minWords: 500,
      rubric: DEFAULT_RUBRIC, examDate: '2026-02-01',
    })
    const list = await listBatches('c1')
    expect(list[0].id).toBe(b2.id)
    expect(list[1].id).toBe(b1.id)
  })
})
```

- [ ] **Step 2: 實作 `batches.ts`**

```ts
import { db } from '../db'
import type { Batch, BatchStatus } from '@/types'

export async function createBatch(
  input: Omit<Batch, 'id' | 'createdAt' | 'status'>
): Promise<Batch> {
  const b: Batch = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'draft',
  }
  await db.batches.add(b)
  return b
}

export async function listBatches(classId: string): Promise<Batch[]> {
  return db.batches
    .where('classId').equals(classId)
    .reverse().sortBy('createdAt')
}

export async function getBatch(id: string) { return db.batches.get(id) }

export async function updateBatch(id: string, patch: Partial<Batch>) {
  await db.batches.update(id, patch)
}

export async function setBatchStatus(id: string, status: BatchStatus) {
  await db.batches.update(id, { status })
}

export async function deleteBatch(id: string) {
  await db.transaction('rw', db.batches, db.essays, db.pages, db.gradingRuns, async () => {
    const essays = await db.essays.where('batchId').equals(id).toArray()
    const essayIds = essays.map(e => e.id)
    await db.gradingRuns.where('essayId').anyOf(essayIds).delete()
    await db.pages.where('batchId').equals(id).delete()
    await db.essays.where('batchId').equals(id).delete()
    await db.batches.delete(id)
  })
}
```

- [ ] **Step 3: 實作 `essays.ts`（含測試）**

Test `essays.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createEssay, listEssaysByBatch, updateEssay } from './essays'

describe('essays repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createEssay 預設 status=pending', async () => {
    const e = await createEssay({ batchId: 'b1', pageIds: ['p1', 'p2'] })
    expect(e.status).toBe('pending')
    expect(e.studentId).toBeNull()
  })

  it('updateEssay 可寫 teacherScores', async () => {
    const e = await createEssay({ batchId: 'b1', pageIds: [] })
    await updateEssay(e.id, {
      teacherScores: { dimensionScores: { 立意取材: 2 }, typoDeduction: 0, lengthDeduction: 0, total: 2 },
      status: 'reviewed',
    })
    const got = await db.essays.get(e.id)
    expect(got?.status).toBe('reviewed')
  })
})
```

Impl `essays.ts`:

```ts
import { db } from '../db'
import type { Essay } from '@/types'

export async function createEssay(
  input: Partial<Essay> & Pick<Essay, 'batchId' | 'pageIds'>
): Promise<Essay> {
  const e: Essay = {
    id: crypto.randomUUID(),
    batchId: input.batchId,
    studentId: input.studentId ?? null,
    pageIds: input.pageIds,
    ocrName: input.ocrName ?? null,
    matchConfidence: input.matchConfidence ?? 0,
    aiScores: input.aiScores ?? null,
    aiComment: input.aiComment ?? null,
    aiTypos: input.aiTypos ?? [],
    aiHighlights: input.aiHighlights ?? [],
    aiReadabilityNotes: input.aiReadabilityNotes ?? null,
    teacherScores: input.teacherScores ?? null,
    teacherComment: input.teacherComment ?? null,
    status: input.status ?? 'pending',
    updatedAt: Date.now(),
  }
  await db.essays.add(e)
  return e
}

export async function listEssaysByBatch(batchId: string) {
  return db.essays.where('batchId').equals(batchId).toArray()
}

export async function updateEssay(id: string, patch: Partial<Essay>) {
  await db.essays.update(id, { ...patch, updatedAt: Date.now() })
}

export async function getEssay(id: string) { return db.essays.get(id) }

export async function listEssaysByStudent(studentId: string) {
  return db.essays.where('studentId').equals(studentId).toArray()
}
```

- [ ] **Step 4: 實作 `pages.ts`**

```ts
import { db } from '../db'
import type { Page } from '@/types'

export async function addPage(
  input: Omit<Page, 'id'>
): Promise<Page> {
  const p: Page = { ...input, id: crypto.randomUUID() }
  await db.pages.add(p)
  return p
}

export async function getPage(id: string) { return db.pages.get(id) }

export async function listPagesByBatch(batchId: string) {
  return db.pages.where('batchId').equals(batchId).sortBy('pageIndex')
}

export async function updatePage(id: string, patch: Partial<Page>) {
  await db.pages.update(id, patch)
}
```

- [ ] **Step 5: 實作 `gradingRuns.ts`**

```ts
import { db } from '../db'
import type { GradingRun } from '@/types'

export async function recordGradingRun(
  input: Omit<GradingRun, 'id' | 'createdAt'>
): Promise<GradingRun> {
  const r: GradingRun = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
  await db.gradingRuns.add(r)
  return r
}

export async function listGradingRunsByEssay(essayId: string) {
  return db.gradingRuns
    .where('essayId').equals(essayId)
    .reverse().sortBy('createdAt')
}
```

- [ ] **Step 6: 跑測試**

Run: `npm test`
Expected: 全通過。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(repos): batches/essays/pages/gradingRuns CRUD"
```

### Task 2.4: Settings（API key）

**Files:** Create `src/core/repos/settings.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { getApiKey, setApiKey, getSelectedModel, setSelectedModel } from './settings'

describe('settings', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('API key 存取', async () => {
    expect(await getApiKey()).toBeNull()
    await setApiKey('AIza...')
    expect(await getApiKey()).toBe('AIza...')
  })

  it('model 預設 flash', async () => {
    expect(await getSelectedModel()).toBe('gemini-2.5-flash')
    await setSelectedModel('gemini-2.5-pro')
    expect(await getSelectedModel()).toBe('gemini-2.5-pro')
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { db } from '../db'

const K_API_KEY = 'apiKey'
const K_MODEL = 'model'

export async function getApiKey(): Promise<string | null> {
  const r = await db.settings.get(K_API_KEY)
  return (r?.value as string | undefined) ?? null
}
export async function setApiKey(v: string) {
  await db.settings.put({ key: K_API_KEY, value: v })
}
export async function clearApiKey() { await db.settings.delete(K_API_KEY) }

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro'
export async function getSelectedModel(): Promise<GeminiModel> {
  const r = await db.settings.get(K_MODEL)
  return (r?.value as GeminiModel | undefined) ?? 'gemini-2.5-flash'
}
export async function setSelectedModel(m: GeminiModel) {
  await db.settings.put({ key: K_MODEL, value: m })
}
```

- [ ] **Step 3: 跑測試並 commit**

```bash
npm test
git add -A
git commit -m "feat(settings): API key 與模型選擇儲存"
```

**Phase 2 驗收條件：** 所有 repo 測試通過；`db.ts` 的 schema 版本為 1；全部 CRUD 覆蓋。

---

## Phase 3：姓名模糊比對 [並行可]

**範疇**：對照 OCR 得到的姓名與班級名單，回傳最可能的 student 與信心值。

### Task 3.1: Levenshtein 距離

**Files:** Create `src/core/matcher/levenshtein.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { levenshtein } from './levenshtein'

describe('levenshtein', () => {
  it('相同字串為 0', () => { expect(levenshtein('王小明', '王小明')).toBe(0) })
  it('一字差為 1', () => { expect(levenshtein('王小明', '王小民')).toBe(1) })
  it('空字串', () => { expect(levenshtein('', '王')).toBe(1) })
  it('不同長度', () => { expect(levenshtein('陳', '陳大華')).toBe(2) })
})
```

- [ ] **Step 2: 實作**

```ts
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(matcher): Levenshtein 距離"
```

### Task 3.2: 名單比對

**Files:** Create `src/core/matcher/name.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { matchNameToRoster } from './name'
import type { Student } from '@/types'

const roster: Student[] = [
  { id: 's1', classId: 'c1', seatNo: 1, name: '王小明' },
  { id: 's2', classId: 'c1', seatNo: 2, name: '陳大華' },
  { id: 's3', classId: 'c1', seatNo: 3, name: '林美玲' },
]

describe('matchNameToRoster', () => {
  it('完全相符 → confidence 1', () => {
    const r = matchNameToRoster('陳大華', roster)
    expect(r.studentId).toBe('s2'); expect(r.confidence).toBe(1)
  })

  it('一字差 → 高信心但 < 1', () => {
    const r = matchNameToRoster('陳大花', roster)
    expect(r.studentId).toBe('s2'); expect(r.confidence).toBeGreaterThan(0.6)
    expect(r.confidence).toBeLessThan(1)
  })

  it('完全不像 → null', () => {
    const r = matchNameToRoster('外星人', roster)
    expect(r.studentId).toBeNull()
  })

  it('空輸入 → null', () => {
    expect(matchNameToRoster('', roster).studentId).toBeNull()
    expect(matchNameToRoster(null, roster).studentId).toBeNull()
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { levenshtein } from './levenshtein'
import type { Student } from '@/types'

export interface NameMatchResult {
  studentId: string | null
  confidence: number
  rawDistance: number
}

export function matchNameToRoster(
  ocrName: string | null | undefined,
  roster: Student[]
): NameMatchResult {
  const name = (ocrName ?? '').trim()
  if (!name || roster.length === 0) {
    return { studentId: null, confidence: 0, rawDistance: Infinity }
  }
  let bestId: string | null = null
  let bestDist = Infinity
  for (const s of roster) {
    const d = levenshtein(name, s.name)
    if (d < bestDist) { bestDist = d; bestId = s.id }
  }
  const maxLen = Math.max(name.length, 1)
  // 距離 0 → 1.0；距離 ≥ maxLen → 0
  const confidence = Math.max(0, 1 - bestDist / maxLen)
  // 超過 60% 字元差異一律視為 miss
  const accept = confidence >= 0.4
  return {
    studentId: accept ? bestId : null,
    confidence: accept ? confidence : 0,
    rawDistance: bestDist,
  }
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(matcher): 姓名對照班級名單"
```

**Phase 3 驗收條件：** 所有 edge case 測試通過；confidence 落在 [0,1]。

---

## Phase 4：PDF 拆頁 [並行可]

**範疇**：把上傳的 PDF File 物件拆成每頁的 JPEG Blob（全解析度）與 thumbnail Blob（長邊 800px）。

### Task 4.1: pdfjs-dist worker 設定

**Files:** Create `src/core/pdf/pdfjs-init.ts`

- [ ] **Step 1: 建檔**

```ts
import * as pdfjs from 'pdfjs-dist'
// Vite 會把 ?url 的 import 轉為實際 asset URL
// @ts-expect-error no types
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjs }
```

- [ ] **Step 2: Commit（尚無測試，暫不 build）**

```bash
git add -A
git commit -m "feat(pdf): 設定 pdfjs worker 入口"
```

### Task 4.2: PDF 拆頁主函式

**Files:**
- Create: `src/core/pdf/splitter.ts`
- Create: `src/core/pdf/splitter.test.ts`

> **測試策略說明**：pdfjs 在 happy-dom 環境難完整模擬。本 task 採**手動驗收 + 少量純函式單元測試**：`renderPageToBlob` 作為主函式不測，但把「旋轉校正計算」拆成純函式 `resolveRotation()` 來測。

- [ ] **Step 1: Test（僅測純函式）**

```ts
import { describe, it, expect } from 'vitest'
import { resolveRotation, jpegBlobTargetSize } from './splitter'

describe('resolveRotation', () => {
  it('回傳值在 0/90/180/270 之間', () => {
    expect(resolveRotation(0)).toBe(0)
    expect(resolveRotation(90)).toBe(90)
    expect(resolveRotation(270)).toBe(270)
    expect(resolveRotation(360)).toBe(0)
    expect(resolveRotation(-90)).toBe(270)
    expect(resolveRotation(450)).toBe(90)
  })
})

describe('jpegBlobTargetSize', () => {
  it('按長邊縮放保持比例', () => {
    expect(jpegBlobTargetSize(2000, 1000, 800)).toEqual({ w: 800, h: 400 })
    expect(jpegBlobTargetSize(600, 800, 800)).toEqual({ w: 600, h: 800 })
  })
})
```

- [ ] **Step 2: 實作 `splitter.ts`**

```ts
import { pdfjs } from './pdfjs-init'

export interface SplitResult {
  pageIndex: number        // 從 1 開始
  fullBlob: Blob           // JPEG 高解析
  thumbBlob: Blob          // JPEG 縮圖
  rotation: number
  width: number
  height: number
}

export function resolveRotation(deg: number): 0 | 90 | 180 | 270 {
  const r = ((deg % 360) + 360) % 360
  return (r as 0 | 90 | 180 | 270)
}

export function jpegBlobTargetSize(w: number, h: number, maxEdge: number) {
  if (Math.max(w, h) <= maxEdge) return { w, h }
  const scale = maxEdge / Math.max(w, h)
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

async function renderToBlob(
  page: pdfjs.PDFPageProxy,
  scale: number,
  rotation: number,
): Promise<{ blob: Blob; w: number; h: number }> {
  const viewport = page.getViewport({ scale, rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: false })!
  await page.render({ canvasContext: ctx, viewport }).promise
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob returned null'))), 'image/jpeg', 0.85)
  )
  return { blob, w: canvas.width, h: canvas.height }
}

export async function splitPdf(file: File): Promise<SplitResult[]> {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const out: SplitResult[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const rotation = resolveRotation(page.rotate)
    const full = await renderToBlob(page, 2.0, rotation)
    const thumb = await renderToBlob(page, 0.6, rotation)
    out.push({
      pageIndex: i,
      fullBlob: full.blob,
      thumbBlob: thumb.blob,
      rotation,
      width: full.w,
      height: full.h,
    })
  }
  await doc.cleanup()
  return out
}
```

- [ ] **Step 3: 跑單元測試**

Run: `npm test`
Expected: 新純函式測試通過。

- [ ] **Step 4: 手動驗證的 scratchpad（非必跑，Phase 11 整合時會實跑）**

在 `src/App.tsx` 暫時加一個 `<input type="file">` 呼叫 `splitPdf`，用專案根目錄的作文 PDF 測試，確認 `console.log` 顯示 50 頁、每頁有 blob。**驗證後還原 App.tsx。**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pdf): 以 pdfjs-dist 拆頁為 JPEG Blob 與縮圖"
```

**Phase 4 驗收條件：** 純函式測試通過；手動丟範例 PDF 能拆出 50 頁 Blob。

---

## Phase 5：Gemini Client 與 Prompts [並行可]

**範疇**：封裝 Google @google/genai SDK，提供「送圖 + prompt → 解析 JSON」的基本能力；寫版本化的 prompt 模板。

### Task 5.1: Client wrapper

**Files:**
- Create: `src/core/ai/gemini.ts`
- Create: `src/core/ai/gemini.test.ts`

- [ ] **Step 1: Test（mock SDK）**

```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: JSON.stringify({ ok: true }),
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
        }),
      },
    })),
  }
})

import { callGemini } from './gemini'

describe('callGemini', () => {
  it('回傳解析後的 JSON 與 usage', async () => {
    const r = await callGemini({
      apiKey: 'k', model: 'gemini-2.5-flash',
      parts: [{ text: 'hi' }], responseSchema: undefined,
    })
    expect(r.parsed).toEqual({ ok: true })
    expect(r.usage.promptTokens).toBe(100)
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { GoogleGenAI } from '@google/genai'
import type { Schema } from '@google/genai'

export interface GeminiCallInput {
  apiKey: string
  model: string
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
  responseSchema?: Schema
  systemInstruction?: string
  temperature?: number
}

export interface GeminiCallResult {
  parsed: unknown
  rawText: string
  usage: { promptTokens: number; outputTokens: number }
  durationMs: number
}

export async function callGemini(input: GeminiCallInput): Promise<GeminiCallResult> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey })
  const started = Date.now()
  const res = await ai.models.generateContent({
    model: input.model,
    contents: [{ role: 'user', parts: input.parts }],
    config: {
      systemInstruction: input.systemInstruction,
      temperature: input.temperature ?? 0.2,
      responseMimeType: input.responseSchema ? 'application/json' : undefined,
      responseSchema: input.responseSchema,
    },
  })
  const text = res.text ?? ''
  let parsed: unknown = null
  if (input.responseSchema) {
    try { parsed = JSON.parse(text) }
    catch { throw new GeminiJsonParseError(text) }
  }
  const usage = {
    promptTokens: res.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
  }
  return { parsed, rawText: text, usage, durationMs: Date.now() - started }
}

export class GeminiJsonParseError extends Error {
  constructor(public rawText: string) {
    super(`Gemini 回傳非合法 JSON: ${rawText.slice(0, 120)}...`)
    this.name = 'GeminiJsonParseError'
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export async function blobToImagePart(blob: Blob) {
  return {
    inlineData: {
      mimeType: blob.type || 'image/jpeg',
      data: await blobToBase64(blob),
    },
  }
}
```

- [ ] **Step 3: 跑測試與 commit**

```bash
npm test
git add -A
git commit -m "feat(ai): Gemini client 封裝"
```

### Task 5.2: Prompts 與 zod schemas

**Files:**
- Create: `src/core/ai/prompts.ts`
- Create: `src/core/ai/schemas.ts`
- Create: `src/core/ai/schemas.test.ts`

- [ ] **Step 1: `schemas.ts` — zod 定義**

```ts
import { z } from 'zod'

export const RubricScoresSchema = z.object({
  scores: z.record(z.string(), z.number().min(0).max(6)),
  deductions: z.object({ typo: z.number().min(0), length: z.number().min(0) }),
  total: z.number().min(0).max(10),
  wordCountEstimate: z.number().int().nonnegative(),
  typos: z.array(z.object({
    wrong: z.string(),
    correct: z.string(),
    context: z.string(),
  })),
  highlights: z.array(z.string()),
  comment: z.string(),
  readabilityNotes: z.string().optional().default(''),
})
export type GradingAiResult = z.infer<typeof RubricScoresSchema>

export const PageGroupingItemSchema = z.object({
  pages: z.array(z.number().int().positive()),
  ocrName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  suggestedStudentId: z.string().nullable(),
})
export const PageGroupingSchema = z.array(PageGroupingItemSchema)
export type PageGroupingAi = z.infer<typeof PageGroupingSchema>

// Gemini responseSchema 需要 JSON Schema 形式（Gemini 使用 Google protobuf 子集）
// 為簡化，在 prompt 內以自然語言嚴格規定 + 程式端以 zod 驗證
```

- [ ] **Step 2: `schemas.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { RubricScoresSchema, PageGroupingSchema } from './schemas'

describe('RubricScoresSchema', () => {
  it('接受合法物件', () => {
    const r = RubricScoresSchema.parse({
      scores: { 立意取材: 1.5, 結構組織: 1, 遣詞造句: 1.5 },
      deductions: { typo: 0, length: 0 }, total: 4,
      wordCountEstimate: 520, typos: [], highlights: [], comment: '不錯',
    })
    expect(r.total).toBe(4)
  })
  it('拒絕負分', () => {
    expect(() => RubricScoresSchema.parse({
      scores: { x: -1 }, deductions: { typo: 0, length: 0 },
      total: 0, wordCountEstimate: 0, typos: [], highlights: [], comment: '',
    })).toThrow()
  })
})

describe('PageGroupingSchema', () => {
  it('接受陣列', () => {
    expect(PageGroupingSchema.parse([
      { pages: [1, 2], ocrName: '陳', confidence: 0.9, suggestedStudentId: null },
    ])).toHaveLength(1)
  })
})
```

- [ ] **Step 3: `prompts.ts`**

```ts
import type { Rubric } from '@/types'

export const PROMPT_VERSION_GRADING = 'grading-v1.0.0'
export const PROMPT_VERSION_GROUPING = 'grouping-v1.0.0'

export function buildGradingPrompt(input: {
  topic: string
  minWords: number
  rubric: Rubric
}): string {
  const dims = input.rubric.dimensions
    .map(d => `  ${d.name} (0-${d.maxScore} 分)`).join('\n')
  const maxTotal = input.rubric.dimensions.reduce((a, b) => a + b.maxScore, 0)
  return `你是一位資深國小國語老師，正在評改六年級作文。

【題目】${input.topic}
【字數要求】${input.minWords} 字以上
【評分標準】(三向度加總滿分 ${maxTotal} 分)
${dims}
    立意取材：主題明確、取材切題、內容豐富
    結構組織：段落分明、起承轉合、前後連貫
    遣詞造句：用詞恰當、句子通順、修辭運用
【扣分規則】
  錯別字每 ${Math.round(1 / input.rubric.deductions.typoPerThree * input.rubric.deductions.typoPerThree * 3)} 個扣 ${input.rubric.deductions.typoPerThree} 分（上限 ${input.rubric.deductions.typoMax} 分）
  字數不足扣 ${input.rubric.deductions.lengthUnder} 分

【任務】
1. 逐字閱讀作文（含手寫校正過的字跡）
2. 給三向度分數（允許 0.5 的半分）
3. 找出錯別字清單（錯字、正確字、出現的前後文）
4. 估算字數
5. 寫約 100 字評語：先肯定 1-2 個亮點，再具體指出 1-2 個可改進處，語氣溫和鼓勵
6. 挑 1-2 句佳句摘錄（供班級公告鼓勵之用）

嚴格輸出 JSON（不要包在 \`\`\` 裡，也不要任何前後說明文字）：
{
  "scores": { "立意取材": 1.5, "結構組織": 1.0, "遣詞造句": 1.5 },
  "deductions": { "typo": 0, "length": 0 },
  "total": 4.0,
  "wordCountEstimate": 520,
  "typos": [{"wrong":"因該", "correct":"應該", "context":"因該要去"}],
  "highlights": ["..."],
  "comment": "（約 100 字）",
  "readabilityNotes": "字跡清晰 / 部分潦草"
}`
}

export function buildGroupingPrompt(input: {
  roster: Array<{ id: string; seatNo: number; name: string }>
  pageCount: number
}): string {
  const rosterCsv = input.roster
    .map(s => `${s.seatNo},${s.name},${s.id}`).join('\n')
  return `你會看到 ${input.pageCount} 張國小作文試卷掃描頁的縮圖（依頁碼順序）。每份作文通常是連續 2 頁（正反面）。

請完成兩件事：
1. 切分：哪些頁碼屬於同一份作文
2. 姓名辨識：每份作文第一頁右上角的學生姓名（手寫）

班級名單 (座號,姓名,studentId)：
${rosterCsv}

嚴格輸出 JSON 陣列（不要包在 \`\`\` 裡）：
[
  { "pages": [1,2], "ocrName": "陳大華", "confidence": 0.9, "suggestedStudentId": "..." }
]

規則：
- confidence 0-1
- 姓名辨識失敗或不在名單中：confidence < 0.5，suggestedStudentId = null
- 若某頁看似完全空白或非作文紙（例如封面分頁），自成一組並標 confidence = 0`
}
```

- [ ] **Step 4: 跑測試與 commit**

```bash
npm test
git add -A
git commit -m "feat(ai): prompts 模板 (v1.0.0) 與 zod schemas"
```

**Phase 5 驗收條件：** `callGemini` 的 mock 測試通過；zod schema 拒絕非法資料；prompt 模板能帶入 rubric 與題目。

---

## Phase 6：評分 Orchestration（依賴 2, 3, 5）

**範疇**：兩階段流程的協調：A) 整批分組 + 姓名比對；B) 逐份送評。含 retry、cost 估算、寫入 gradingRuns。

### Task 6.1: Phase A — 分組與姓名比對

**Files:** Create `src/core/ai/grouper.ts` + test

- [ ] **Step 1: Test（mock callGemini）**

```ts
import { describe, it, expect, vi } from 'vitest'
import type { Student } from '@/types'

vi.mock('./gemini', async (orig) => ({
  ...(await orig<typeof import('./gemini')>()),
  callGemini: vi.fn().mockResolvedValue({
    parsed: [
      { pages: [1, 2], ocrName: '陳大華', confidence: 0.9, suggestedStudentId: 's2' },
      { pages: [3, 4], ocrName: '林美鈴', confidence: 0.7, suggestedStudentId: null },
    ],
    rawText: '[]', usage: { promptTokens: 0, outputTokens: 0 }, durationMs: 10,
  }),
}))

import { groupPages } from './grouper'

const roster: Student[] = [
  { id: 's1', classId: 'c1', seatNo: 1, name: '王小明' },
  { id: 's2', classId: 'c1', seatNo: 2, name: '陳大華' },
  { id: 's3', classId: 'c1', seatNo: 3, name: '林美玲' },
]

describe('groupPages', () => {
  it('第二組 AI 給 null 時用 Levenshtein 補強', async () => {
    const r = await groupPages({
      apiKey: 'k', model: 'gemini-2.5-flash',
      thumbnails: [], roster,
    })
    expect(r[0].studentId).toBe('s2')
    // 「林美鈴」vs「林美玲」差 1 → Levenshtein 補強應給 s3
    expect(r[1].studentId).toBe('s3')
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { callGemini, blobToImagePart } from './gemini'
import { buildGroupingPrompt, PROMPT_VERSION_GROUPING } from './prompts'
import { PageGroupingSchema } from './schemas'
import { matchNameToRoster } from '@/core/matcher/name'
import type { Student } from '@/types'

export interface GroupingResultItem {
  pages: number[]
  ocrName: string | null
  studentId: string | null
  confidence: number
}

export async function groupPages(input: {
  apiKey: string
  model: string
  thumbnails: Blob[]   // 依頁碼順序
  roster: Student[]
}): Promise<GroupingResultItem[]> {
  const parts = [
    { text: buildGroupingPrompt({ roster: input.roster, pageCount: input.thumbnails.length }) },
    ...(await Promise.all(input.thumbnails.map(b => blobToImagePart(b)))),
  ]
  const res = await callGemini({
    apiKey: input.apiKey,
    model: input.model,
    parts,
    temperature: 0.1,
  })
  // 沒給 responseSchema 所以自己 parse
  let obj: unknown
  try { obj = JSON.parse(res.rawText) }
  catch { throw new Error('Gemini grouping 回傳非 JSON: ' + res.rawText.slice(0, 200)) }
  const parsed = PageGroupingSchema.parse(obj)

  return parsed.map(item => {
    if (item.suggestedStudentId) {
      return {
        pages: item.pages,
        ocrName: item.ocrName,
        studentId: item.suggestedStudentId,
        confidence: item.confidence,
      }
    }
    // AI 沒指派 → 用 Levenshtein 補一次
    const fallback = matchNameToRoster(item.ocrName, input.roster)
    return {
      pages: item.pages,
      ocrName: item.ocrName,
      studentId: fallback.studentId,
      confidence: fallback.studentId ? fallback.confidence : item.confidence,
    }
  })
}
export { PROMPT_VERSION_GROUPING }
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(ai): Phase A 頁面分組與姓名比對"
```

### Task 6.2: Phase B — 單份作文評分

**Files:** Create `src/core/ai/grader.ts` + test

- [ ] **Step 1: Test（mock）**

```ts
import { describe, it, expect, vi } from 'vitest'
import { DEFAULT_RUBRIC } from '@/types'

vi.mock('./gemini', async (orig) => ({
  ...(await orig<typeof import('./gemini')>()),
  callGemini: vi.fn().mockResolvedValue({
    parsed: null,
    rawText: JSON.stringify({
      scores: { 立意取材: 1.5, 結構組織: 1.0, 遣詞造句: 1.5 },
      deductions: { typo: 0, length: 0 },
      total: 4.0,
      wordCountEstimate: 520,
      typos: [{ wrong: '因該', correct: '應該', context: '因該要去' }],
      highlights: ['陽光灑在...'],
      comment: '（100字）',
      readabilityNotes: '清晰',
    }),
    usage: { promptTokens: 1000, outputTokens: 500 },
    durationMs: 100,
  }),
}))

import { gradeEssay } from './grader'

describe('gradeEssay', () => {
  it('parse 成功，回傳 RubricScores 與 usage', async () => {
    const r = await gradeEssay({
      apiKey: 'k', model: 'gemini-2.5-flash',
      imageBlobs: [new Blob([new Uint8Array([1])], { type: 'image/jpeg' })],
      topic: '那些未曾褪色的風景', minWords: 500, rubric: DEFAULT_RUBRIC,
    })
    expect(r.result.total).toBe(4)
    expect(r.result.typos).toHaveLength(1)
    expect(r.rawText).toContain('立意取材')
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { callGemini, blobToImagePart } from './gemini'
import { buildGradingPrompt, PROMPT_VERSION_GRADING } from './prompts'
import { RubricScoresSchema, type GradingAiResult } from './schemas'
import type { Rubric } from '@/types'

export interface GradeEssayInput {
  apiKey: string
  model: string
  imageBlobs: Blob[]
  topic: string
  minWords: number
  rubric: Rubric
}

export interface GradeEssayOutput {
  result: GradingAiResult
  rawText: string
  usage: { promptTokens: number; outputTokens: number }
  durationMs: number
  promptVersion: string
}

export async function gradeEssay(input: GradeEssayInput): Promise<GradeEssayOutput> {
  const parts = [
    { text: buildGradingPrompt({
      topic: input.topic, minWords: input.minWords, rubric: input.rubric,
    }) },
    ...(await Promise.all(input.imageBlobs.map(b => blobToImagePart(b)))),
  ]
  const attempt = async () => {
    const r = await callGemini({
      apiKey: input.apiKey, model: input.model, parts, temperature: 0.2,
    })
    let obj: unknown
    try { obj = JSON.parse(r.rawText) }
    catch { throw new Error('Grading 回傳非 JSON：' + r.rawText.slice(0, 200)) }
    return { result: RubricScoresSchema.parse(obj), raw: r.rawText, usage: r.usage, dur: r.durationMs }
  }
  let lastErr: unknown
  for (let i = 0; i < 2; i++) {
    try {
      const a = await attempt()
      return {
        result: a.result, rawText: a.raw, usage: a.usage,
        durationMs: a.dur, promptVersion: PROMPT_VERSION_GRADING,
      }
    } catch (e) { lastErr = e }
  }
  throw lastErr
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(ai): Phase B 逐份作文評分與一次重試"
```

### Task 6.3: 全批次 orchestrator

**Files:** Create `src/core/ai/orchestrator.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/core/db'
import { createBatch } from '@/core/repos/batches'
import { createClass } from '@/core/repos/classes'
import { createStudent } from '@/core/repos/students'
import { addPage } from '@/core/repos/pages'
import { DEFAULT_RUBRIC } from '@/types'

vi.mock('./grouper', () => ({
  groupPages: vi.fn().mockResolvedValue([
    { pages: [1, 2], ocrName: '王小明', studentId: 's-王小明', confidence: 1 },
  ]),
  PROMPT_VERSION_GROUPING: 'grouping-v1.0.0',
}))
vi.mock('./grader', () => ({
  gradeEssay: vi.fn().mockResolvedValue({
    result: {
      scores: { 立意取材: 2, 結構組織: 2, 遣詞造句: 2 },
      deductions: { typo: 0, length: 0 }, total: 6,
      wordCountEstimate: 600, typos: [], highlights: ['佳句'],
      comment: '讚', readabilityNotes: '清晰',
    },
    rawText: '{}', usage: { promptTokens: 1, outputTokens: 1 },
    durationMs: 10, promptVersion: 'grading-v1.0.0',
  }),
}))

import { runGroupingPhase, runGradingPhase } from './orchestrator'

describe('orchestrator', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('runGroupingPhase 建立 essays 並關聯 pages', async () => {
    const cls = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    const stu = await createStudent({ classId: cls.id, seatNo: 1, name: '王小明' })
    // 手動把 studentId 改成與 mock 相符
    await db.students.update(stu.id, {})
    // mock 回傳的 studentId 實際會是 s-王小明；改用：
    await createStudent({ classId: cls.id, seatNo: 2, name: 'X' })
    // 為了簡化，直接插 student s-王小明
    await db.students.add({ id: 's-王小明', classId: cls.id, seatNo: 99, name: '王小明' })
    const batch = await createBatch({
      classId: cls.id, title: 't', topic: 'x', minWords: 500,
      rubric: DEFAULT_RUBRIC, examDate: '2026-04-21',
    })
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
    await addPage({ batchId: batch.id, essayId: null, pageIndex: 1, imageBlob: blob, thumbnailBlob: blob, rotation: 0 })
    await addPage({ batchId: batch.id, essayId: null, pageIndex: 2, imageBlob: blob, thumbnailBlob: blob, rotation: 0 })

    await runGroupingPhase({ batchId: batch.id, apiKey: 'k', model: 'gemini-2.5-flash' })

    const essays = await db.essays.where('batchId').equals(batch.id).toArray()
    expect(essays).toHaveLength(1)
    expect(essays[0].studentId).toBe('s-王小明')
  })
})
```

- [ ] **Step 2: 實作**

```ts
import { db } from '@/core/db'
import { listPagesByBatch, updatePage } from '@/core/repos/pages'
import { createEssay, updateEssay, listEssaysByBatch } from '@/core/repos/essays'
import { getBatch, setBatchStatus } from '@/core/repos/batches'
import { listStudents } from '@/core/repos/students'
import { recordGradingRun } from '@/core/repos/gradingRuns'
import { groupPages, PROMPT_VERSION_GROUPING } from './grouper'
import { gradeEssay } from './grader'

export async function runGroupingPhase(input: {
  batchId: string
  apiKey: string
  model: string
}): Promise<void> {
  const batch = await getBatch(input.batchId)
  if (!batch) throw new Error('Batch 不存在')
  await setBatchStatus(input.batchId, 'splitting')
  const pages = await listPagesByBatch(input.batchId)
  const roster = await listStudents(batch.classId)
  const thumbs = pages.map(p => p.thumbnailBlob)
  const groups = await groupPages({
    apiKey: input.apiKey, model: input.model,
    thumbnails: thumbs, roster,
  })
  // 清掉既有 essays（視為重跑）
  const existing = await listEssaysByBatch(input.batchId)
  await db.essays.bulkDelete(existing.map(e => e.id))
  for (const g of groups) {
    const pageRows = g.pages
      .map(pi => pages.find(p => p.pageIndex === pi))
      .filter(Boolean) as typeof pages
    const essay = await createEssay({
      batchId: input.batchId,
      studentId: g.studentId,
      pageIds: pageRows.map(p => p.id),
      ocrName: g.ocrName,
      matchConfidence: g.confidence,
    })
    for (const p of pageRows) {
      await updatePage(p.id, { essayId: essay.id })
    }
  }
  await setBatchStatus(input.batchId, 'ready_to_grade')
}

export async function runGradingPhase(input: {
  batchId: string
  apiKey: string
  model: string
  onProgress?: (done: number, total: number) => void
}): Promise<void> {
  const batch = await getBatch(input.batchId)
  if (!batch) throw new Error('Batch 不存在')
  await setBatchStatus(input.batchId, 'grading')
  const essays = await listEssaysByBatch(input.batchId)
  for (let i = 0; i < essays.length; i++) {
    const e = essays[i]
    // 略過已評過且老師確認的
    if (e.status === 'reviewed') { input.onProgress?.(i + 1, essays.length); continue }
    const pages = await db.pages.where('id').anyOf(e.pageIds).sortBy('pageIndex')
    try {
      const res = await gradeEssay({
        apiKey: input.apiKey, model: input.model,
        imageBlobs: pages.map(p => p.imageBlob),
        topic: batch.topic, minWords: batch.minWords, rubric: batch.rubric,
      })
      await updateEssay(e.id, {
        aiScores: {
          dimensionScores: res.result.scores,
          typoDeduction: res.result.deductions.typo,
          lengthDeduction: res.result.deductions.length,
          total: res.result.total,
        },
        aiComment: res.result.comment,
        aiTypos: res.result.typos,
        aiHighlights: res.result.highlights,
        aiReadabilityNotes: res.result.readabilityNotes,
        status: 'graded',
      })
      await recordGradingRun({
        essayId: e.id, model: input.model, promptVersion: res.promptVersion,
        rawResponse: res.rawText, parsedResult: res.result,
        costEstimateUsd: estimateCost(input.model, res.usage),
        durationMs: res.durationMs,
      })
    } catch (err) {
      await updateEssay(e.id, { status: 'pending', aiReadabilityNotes: `評分失敗：${String(err).slice(0, 200)}` })
    }
    input.onProgress?.(i + 1, essays.length)
  }
  await setBatchStatus(input.batchId, 'completed')
}

// Gemini 2.5 Flash 近似單價（USD per 1M tokens）
function estimateCost(model: string, usage: { promptTokens: number; outputTokens: number }) {
  const rates = model.includes('flash')
    ? { input: 0.3 / 1e6, output: 2.5 / 1e6 }
    : { input: 1.25 / 1e6, output: 10 / 1e6 }
  return usage.promptTokens * rates.input + usage.outputTokens * rates.output
}
```

- [ ] **Step 3: 跑測試與 commit**

```bash
npm test
git add -A
git commit -m "feat(ai): 批次兩階段 orchestrator 與成本估算"
```

**Phase 6 驗收條件：** 兩個 phase 的 function 可串接；essays/pages 關聯正確寫入；失敗時有明確狀態。

---

## Phase 7：備份與還原 [並行可 with Phase 8]

**範疇**：把 IndexedDB 所有資料匯出為 zip（內含 `data.json` + `images/`），以及反向還原。

### Task 7.1: 匯出

**Files:** Create `src/core/backup/export.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { db } from '@/core/db'
import { createClass } from '@/core/repos/classes'
import { addPage } from '@/core/repos/pages'
import { exportAllAsZip } from './export'

describe('exportAllAsZip', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('匯出 classes 與 page blobs', async () => {
    const c = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await addPage({
      batchId: 'b', essayId: null, pageIndex: 1,
      imageBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      thumbnailBlob: new Blob([new Uint8Array([4])], { type: 'image/jpeg' }),
      rotation: 0,
    })
    const blob = await exportAllAsZip()
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const dataJson = await zip.file('data.json')!.async('string')
    const parsed = JSON.parse(dataJson)
    expect(parsed.classes[0].id).toBe(c.id)
    expect(Object.keys(zip.files).some(k => k.startsWith('images/'))).toBe(true)
  })
})
```

- [ ] **Step 2: 實作**

```ts
import JSZip from 'jszip'
import { db } from '@/core/db'

export async function exportAllAsZip(): Promise<Blob> {
  const zip = new JSZip()
  const [settings, classes, students, batches, essays, gradingRuns, pages] = await Promise.all([
    db.settings.toArray(), db.classes.toArray(), db.students.toArray(),
    db.batches.toArray(), db.essays.toArray(), db.gradingRuns.toArray(),
    db.pages.toArray(),
  ])
  const pagesMeta = pages.map(p => ({
    id: p.id, essayId: p.essayId, batchId: p.batchId,
    pageIndex: p.pageIndex, rotation: p.rotation,
    fullPath: `images/${p.id}.jpg`,
    thumbPath: `images/${p.id}.thumb.jpg`,
  }))
  zip.file('data.json', JSON.stringify({
    version: 1, exportedAt: new Date().toISOString(),
    settings: settings.filter(s => s.key !== 'apiKey'), // 不匯出 API key
    classes, students, batches, essays, gradingRuns, pages: pagesMeta,
  }, null, 2))
  for (const p of pages) {
    zip.file(`images/${p.id}.jpg`, p.imageBlob)
    zip.file(`images/${p.id}.thumb.jpg`, p.thumbnailBlob)
  }
  return zip.generateAsync({ type: 'blob' })
}

export async function downloadBackup() {
  const blob = await exportAllAsZip()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url; a.download = `essay-grader-backup-${stamp}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(backup): 匯出全庫為 zip"
```

### Task 7.2: 還原

**Files:** Create `src/core/backup/import.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/core/db'
import { createClass } from '@/core/repos/classes'
import { addPage } from '@/core/repos/pages'
import { exportAllAsZip } from './export'
import { importFromZip } from './import'

describe('importFromZip', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('匯出後清庫再匯入，資料一致', async () => {
    await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await addPage({
      batchId: 'b', essayId: null, pageIndex: 1,
      imageBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      thumbnailBlob: new Blob([new Uint8Array([4])], { type: 'image/jpeg' }),
      rotation: 0,
    })
    const blob = await exportAllAsZip()
    await db.delete(); await db.open()
    await importFromZip(blob)
    expect(await db.classes.count()).toBe(1)
    expect(await db.pages.count()).toBe(1)
    const p = (await db.pages.toArray())[0]
    expect(p.imageBlob.size).toBe(3)
  })
})
```

- [ ] **Step 2: 實作**

```ts
import JSZip from 'jszip'
import { db } from '@/core/db'

export async function importFromZip(file: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const dataFile = zip.file('data.json')
  if (!dataFile) throw new Error('備份檔缺少 data.json')
  const data = JSON.parse(await dataFile.async('string'))
  if (data.version !== 1) throw new Error(`不支援的備份版本: ${data.version}`)

  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.settings.bulkAdd(data.settings)
    await db.classes.bulkAdd(data.classes)
    await db.students.bulkAdd(data.students)
    await db.batches.bulkAdd(data.batches)
    await db.essays.bulkAdd(data.essays)
    await db.gradingRuns.bulkAdd(data.gradingRuns)
    for (const meta of data.pages as Array<any>) {
      const full = zip.file(meta.fullPath)
      const thumb = zip.file(meta.thumbPath)
      if (!full || !thumb) throw new Error(`缺少圖檔：${meta.fullPath}`)
      await db.pages.add({
        id: meta.id, essayId: meta.essayId, batchId: meta.batchId,
        pageIndex: meta.pageIndex, rotation: meta.rotation,
        imageBlob: await full.async('blob'),
        thumbnailBlob: await thumb.async('blob'),
      })
    }
  })
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(backup): 從 zip 還原全庫"
```

**Phase 7 驗收條件：** 匯出 → 清庫 → 匯入，資料 round-trip 完整（含 Blob）。

---

## Phase 8：班級統計 [並行可]

**範疇**：純函式接收一個批次的 essays，回傳統計結果供 UI 顯示。

### Task 8.1: 分布、錯字排行、佳句彙整

**Files:** Create `src/core/stats/classwide.ts` + test

- [ ] **Step 1: Test**

```ts
import { describe, it, expect } from 'vitest'
import { computeStats } from './classwide'
import type { Essay, RubricScores } from '@/types'

const s = (dim: Record<string, number>, total: number): RubricScores => ({
  dimensionScores: dim, typoDeduction: 0, lengthDeduction: 0, total,
})
const essay = (over: Partial<Essay>): Essay => ({
  id: over.id ?? crypto.randomUUID(),
  batchId: 'b', studentId: over.studentId ?? 'stu',
  pageIds: [], ocrName: null, matchConfidence: 1,
  aiScores: null, aiComment: null, aiTypos: [], aiHighlights: [],
  aiReadabilityNotes: null, teacherScores: null, teacherComment: null,
  status: 'graded', updatedAt: 0, ...over,
})

describe('computeStats', () => {
  it('以 teacherScores 優先於 aiScores', () => {
    const e1 = essay({ aiScores: s({ A: 1 }, 1), teacherScores: s({ A: 2 }, 2) })
    const r = computeStats([e1], ['A'])
    expect(r.totalDistribution.mean).toBe(2)
  })

  it('錯字排行依頻率遞減', () => {
    const e1 = essay({
      aiTypos: [
        { wrong: '因該', correct: '應該', context: '' },
        { wrong: '在一次', correct: '再一次', context: '' },
      ],
      teacherScores: s({ A: 1 }, 1),
    })
    const e2 = essay({
      aiTypos: [{ wrong: '因該', correct: '應該', context: '' }],
      teacherScores: s({ A: 1 }, 1),
    })
    const r = computeStats([e1, e2], ['A'])
    expect(r.typoRanking[0]).toEqual(expect.objectContaining({ wrong: '因該', count: 2 }))
  })

  it('highlights 蒐集', () => {
    const e1 = essay({ aiHighlights: ['佳句一', '佳句二'], teacherScores: s({ A: 1 }, 1) })
    const r = computeStats([e1], ['A'])
    expect(r.highlights).toHaveLength(2)
  })
})
```

- [ ] **Step 2: 實作**

```ts
import type { Essay, RubricScores } from '@/types'

export interface StatsResult {
  n: number
  dimensions: Record<string, { mean: number; min: number; max: number; histogram: number[] }>
  totalDistribution: { mean: number; min: number; max: number; histogram: number[] }
  typoRanking: Array<{ wrong: string; correct: string; count: number; studentIds: string[] }>
  highlights: Array<{ essayId: string; studentId: string | null; text: string }>
}

function finalScores(e: Essay): RubricScores | null {
  return e.teacherScores ?? e.aiScores
}

export function computeStats(essays: Essay[], dimensionNames: string[]): StatsResult {
  const graded = essays.filter(e => finalScores(e) !== null)
  const dimensions: StatsResult['dimensions'] = {}
  for (const d of dimensionNames) {
    const vals = graded.map(e => finalScores(e)!.dimensionScores[d] ?? 0)
    dimensions[d] = summarize(vals, 0, 2, 0.5)
  }
  const totals = graded.map(e => finalScores(e)!.total)
  const totalDistribution = summarize(totals, 0, 6, 1)

  const typoMap = new Map<string, { wrong: string; correct: string; count: number; students: Set<string> }>()
  for (const e of essays) {
    for (const t of e.aiTypos) {
      const key = `${t.wrong}→${t.correct}`
      const v = typoMap.get(key) ?? { wrong: t.wrong, correct: t.correct, count: 0, students: new Set<string>() }
      v.count += 1
      if (e.studentId) v.students.add(e.studentId)
      typoMap.set(key, v)
    }
  }
  const typoRanking = [...typoMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(v => ({ wrong: v.wrong, correct: v.correct, count: v.count, studentIds: [...v.students] }))

  const highlights: StatsResult['highlights'] = []
  for (const e of essays) for (const h of e.aiHighlights) {
    highlights.push({ essayId: e.id, studentId: e.studentId, text: h })
  }

  return { n: graded.length, dimensions, totalDistribution, typoRanking, highlights }
}

function summarize(values: number[], min: number, max: number, bucketSize: number) {
  const n = values.length || 1
  const mean = values.reduce((a, b) => a + b, 0) / n
  const minV = values.length ? Math.min(...values) : 0
  const maxV = values.length ? Math.max(...values) : 0
  const bucketCount = Math.round((max - min) / bucketSize) + 1
  const histogram = new Array(bucketCount).fill(0)
  for (const v of values) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.round((v - min) / bucketSize)))
    histogram[idx] += 1
  }
  return { mean, min: minV, max: maxV, histogram }
}
```

- [ ] **Step 3: Commit**

```bash
npm test
git add -A
git commit -m "feat(stats): 班級分布、錯字排行、佳句彙整"
```

### Task 8.2: AI 弱點分析（選配）

**Files:** Create `src/core/stats/weakness.ts`

- [ ] **Step 1: 實作（無自動測試，整合 E2E 驗證）**

```ts
import { callGemini } from '@/core/ai/gemini'
import type { Essay } from '@/types'

export async function summarizeWeaknesses(input: {
  apiKey: string
  model: string
  essays: Essay[]
  topic: string
}): Promise<string> {
  const lines = input.essays
    .filter(e => e.aiComment)
    .map(e => `- ${e.aiComment}`)
    .join('\n')
  const prompt = `以下是一位國小老師所在班級對同一個作文題目「${input.topic}」所寫的 ${input.essays.length} 份作文的個別評語摘要：

${lines}

請歸納出整班在這次作文中：
1. 最普遍的 2-3 個亮點
2. 最普遍的 2-3 個待加強處
3. 老師下一次教學可以強調什麼

以一段約 200 字的自然段落回覆，語氣是給教師的備課建議。`
  const r = await callGemini({
    apiKey: input.apiKey, model: input.model,
    parts: [{ text: prompt }], temperature: 0.4,
  })
  return r.rawText
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(stats): AI 歸納整班弱點"
```

**Phase 8 驗收條件：** `computeStats` 對 edge case（空陣列、只有 AI 分數、只有老師分數）有正確回傳。

---

## Phase 9：UI 基礎 + Settings [並行可 with Phase 10]

**範疇**：建立 shadcn 風格的基礎元件、路由骨架、Settings 頁（API key、備份）。

### Task 9.1: 路由骨架與 layout

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/components/Layout.tsx`

- [ ] **Step 1: `src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
```

- [ ] **Step 2: `src/components/Layout.tsx`**

```tsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: '首頁' },
  { to: '/classes', label: '班級' },
  { to: '/batches', label: '批次' },
  { to: '/settings', label: '設定' },
]

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 h-14">
          <span className="font-bold text-lg">AI 作文評分</span>
          <nav className="flex gap-3 text-sm">
            {nav.map(n => (
              <Link key={n.to} to={n.to}
                className={cn('px-2 py-1 rounded hover:bg-slate-100',
                  pathname === n.to && 'bg-slate-900 text-white hover:bg-slate-900')}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: `src/App.tsx`**

```tsx
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { ClassList } from './pages/ClassList'
import { ClassDetail } from './pages/ClassDetail'
import { BatchList } from './pages/BatchList'
import { BatchWorkbench } from './pages/BatchWorkbench'
import { BatchReport } from './pages/BatchReport'
import { StudentDetail } from './pages/StudentDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />
        <Route path="classes" element={<ClassList />} />
        <Route path="classes/:classId" element={<ClassDetail />} />
        <Route path="batches" element={<BatchList />} />
        <Route path="batches/:batchId" element={<BatchWorkbench />} />
        <Route path="batches/:batchId/report" element={<BatchReport />} />
        <Route path="students/:studentId" element={<StudentDetail />} />
      </Route>
    </Routes>
  )
}
```

- [ ] **Step 4: 暫時建立空骨架頁面讓編譯通過**

Create 8 個檔案於 `src/pages/`，每個內容：

```tsx
export function Home() { return <div>首頁（待做）</div> }
// 其他頁面分別替換名稱
```

即：`Home.tsx`、`Settings.tsx`、`ClassList.tsx`、`ClassDetail.tsx`、`BatchList.tsx`、`BatchWorkbench.tsx`、`BatchReport.tsx`、`StudentDetail.tsx`。

- [ ] **Step 5: 驗證 & Commit**

```bash
npm run build
git add -A
git commit -m "feat(ui): 路由骨架、Layout、空白頁面"
```

### Task 9.2: Settings 頁

**Files:** Modify `src/pages/Settings.tsx`

- [ ] **Step 1: 寫實作**

```tsx
import { useEffect, useState } from 'react'
import { getApiKey, setApiKey, clearApiKey,
  getSelectedModel, setSelectedModel, type GeminiModel } from '@/core/repos/settings'
import { downloadBackup } from '@/core/backup/export'
import { importFromZip } from '@/core/backup/import'

export function Settings() {
  const [key, setKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    (async () => {
      setSavedKey(await getApiKey())
      setModel(await getSelectedModel())
    })()
  }, [])

  async function saveKey() {
    if (!key) return
    await setApiKey(key)
    setSavedKey(key); setKey(''); setStatus('API key 已儲存')
  }
  async function removeKey() {
    await clearApiKey(); setSavedKey(null); setStatus('已清除 API key')
  }
  async function saveModel(m: GeminiModel) { setModel(m); await setSelectedModel(m); setStatus('模型設定已儲存') }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    try {
      await importFromZip(f); setStatus('已還原備份')
    } catch (err) { setStatus('還原失敗：' + String(err)) }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <section>
        <h2 className="text-lg font-semibold mb-2">Google AI API Key</h2>
        <p className="text-sm text-slate-600 mb-3">
          儲存於您的瀏覽器內，不會上傳到任何伺服器。申請：
          <a className="underline" href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a>
        </p>
        <p className="mb-2 text-sm">目前：{savedKey ? `已設定（${savedKey.slice(0, 6)}...）` : '未設定'}</p>
        <input type="password" className="border rounded px-2 py-1 w-full"
          placeholder="AIza..." value={key} onChange={e => setKey(e.target.value)} />
        <div className="mt-2 flex gap-2">
          <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={saveKey}>儲存</button>
          {savedKey && <button className="px-3 py-1 rounded border" onClick={removeKey}>清除</button>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">AI 模型</h2>
        <div className="flex gap-2">
          {(['gemini-2.5-flash', 'gemini-2.5-pro'] as GeminiModel[]).map(m => (
            <label key={m} className="flex items-center gap-1 text-sm">
              <input type="radio" name="model" value={m}
                checked={model === m} onChange={() => saveModel(m)} />
              {m}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">備份 / 還原</h2>
        <div className="flex gap-2 items-center">
          <button className="px-3 py-1 rounded bg-slate-900 text-white" onClick={downloadBackup}>
            匯出備份 (.zip)
          </button>
          <label className="px-3 py-1 rounded border cursor-pointer">
            匯入備份
            <input type="file" accept=".zip" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ⚠️ 資料儲存在您的瀏覽器內。清除瀏覽器資料或換電腦會遺失，請定期備份。
        </p>
      </section>

      {status && <p className="text-sm text-green-700">{status}</p>}
    </div>
  )
}
```

- [ ] **Step 2: 手動驗證**

`npm run dev`，瀏覽 `/Ai_Sheet/settings`：輸入 API key、切換模型、匯出備份。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): Settings 頁 — API key、模型、備份還原"
```

**Phase 9 驗收條件：** Settings 頁能存取 API key、切模型、匯出匯入備份。

---

## Phase 10：班級 / 批次 CRUD UI [並行可 with Phase 9]

**範疇**：Home、ClassList、ClassDetail、BatchList、批次建立表單。

### Task 10.1: Home 頁

**Files:** Modify `src/pages/Home.tsx`

- [ ] **Step 1: 實作**

```tsx
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses } from '@/core/repos/classes'
import { db } from '@/core/db'
import { getApiKey } from '@/core/repos/settings'

export function Home() {
  const classes = useLiveQuery(() => listClasses(), [])
  const recentBatches = useLiveQuery(async () => {
    return db.batches.orderBy('createdAt').reverse().limit(5).toArray()
  }, [])
  const apiKey = useLiveQuery(() => getApiKey(), [])

  return (
    <div className="space-y-6">
      {!apiKey && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded">
          尚未設定 Google AI API Key。<Link to="/settings" className="underline">前往設定</Link>
        </div>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-2">我的班級</h2>
        {classes?.length === 0 ? (
          <p className="text-sm text-slate-600">尚未建立班級。
            <Link to="/classes" className="underline ml-1">去建立</Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {classes?.map(c => (
              <li key={c.id}>
                <Link to={`/classes/${c.id}`} className="underline">
                  {c.name}（{c.schoolYear}）
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">最近批次</h2>
        <ul className="space-y-1">
          {recentBatches?.map(b => (
            <li key={b.id}>
              <Link to={`/batches/${b.id}`} className="underline">
                {b.title} — {b.topic}
              </Link>
              <span className="text-xs text-slate-500 ml-2">{b.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): Home 頁 — 班級與批次快速入口、API key 提示"
```

### Task 10.2: ClassList / ClassDetail

**Files:** Modify `src/pages/ClassList.tsx`、`src/pages/ClassDetail.tsx`

- [ ] **Step 1: `ClassList.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses, createClass, deleteClass } from '@/core/repos/classes'

export function ClassList() {
  const classes = useLiveQuery(() => listClasses(), [])
  const [name, setName] = useState('')
  const [grade, setGrade] = useState(6)
  const [schoolYear, setSchoolYear] = useState('114-2')

  async function add() {
    if (!name.trim()) return
    await createClass({ name, grade, schoolYear })
    setName('')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">班級</h1>
      <div className="flex gap-2 items-end">
        <label className="text-sm">名稱<input className="block border rounded px-2 py-1"
          value={name} onChange={e => setName(e.target.value)} placeholder="六年十班"/></label>
        <label className="text-sm">年級<input type="number" className="block border rounded px-2 py-1 w-20"
          value={grade} onChange={e => setGrade(+e.target.value)} /></label>
        <label className="text-sm">學年度<input className="block border rounded px-2 py-1 w-24"
          value={schoolYear} onChange={e => setSchoolYear(e.target.value)} /></label>
        <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={add}>新增</button>
      </div>
      <ul className="space-y-1">
        {classes?.map(c => (
          <li key={c.id} className="flex items-center justify-between border rounded px-3 py-2">
            <Link className="underline" to={`/classes/${c.id}`}>
              {c.name}（{c.schoolYear}）
            </Link>
            <button className="text-sm text-red-600"
              onClick={() => { if (confirm('確認刪除整個班級？')) deleteClass(c.id) }}>
              刪除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: `ClassDetail.tsx`**

```tsx
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getClass } from '@/core/repos/classes'
import {
  listStudents, createStudent, deleteStudent, importStudentsFromCsv,
} from '@/core/repos/students'
import { useState } from 'react'

export function ClassDetail() {
  const { classId = '' } = useParams()
  const cls = useLiveQuery(() => getClass(classId), [classId])
  const students = useLiveQuery(() => listStudents(classId), [classId])
  const [seatNo, setSeatNo] = useState(1)
  const [name, setName] = useState('')

  async function add() {
    if (!name) return
    await createStudent({ classId, seatNo, name }); setName('')
  }
  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const text = await f.text()
    await importStudentsFromCsv(classId, text)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{cls?.name}</h1>
      <div className="flex gap-2 items-end">
        <label className="text-sm">座號<input type="number" className="block border rounded px-2 py-1 w-20"
          value={seatNo} onChange={e => setSeatNo(+e.target.value)} /></label>
        <label className="text-sm">姓名<input className="block border rounded px-2 py-1"
          value={name} onChange={e => setName(e.target.value)} /></label>
        <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={add}>新增</button>
        <label className="px-3 py-1 rounded border cursor-pointer ml-auto">
          匯入 CSV（座號,姓名）
          <input type="file" accept=".csv" className="hidden" onChange={onCsv} />
        </label>
      </div>
      <ul className="space-y-1">
        {students?.map(s => (
          <li key={s.id} className="flex items-center justify-between border rounded px-3 py-1">
            <span>{s.seatNo.toString().padStart(2, '0')}　{s.name}</span>
            <button className="text-sm text-red-600"
              onClick={() => deleteStudent(s.id)}>刪除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): 班級與學生管理（CRUD + CSV 匯入）"
```

### Task 10.3: BatchList + 批次建立

**Files:** Modify `src/pages/BatchList.tsx`

- [ ] **Step 1: 實作**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses } from '@/core/repos/classes'
import { createBatch, listBatches, deleteBatch } from '@/core/repos/batches'
import { DEFAULT_RUBRIC } from '@/types'
import { db } from '@/core/db'

export function BatchList() {
  const classes = useLiveQuery(() => listClasses(), [])
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [minWords, setMinWords] = useState(500)
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10))

  const allBatches = useLiveQuery(() => db.batches.orderBy('createdAt').reverse().toArray(), [])

  async function create() {
    if (!classId || !title || !topic) return
    const b = await createBatch({
      classId, title, topic, minWords, examDate, rubric: DEFAULT_RUBRIC,
    })
    setTitle(''); setTopic('')
    window.location.hash = `#/batches/${b.id}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">批次</h1>
      <section className="p-4 border rounded bg-white space-y-2">
        <h2 className="font-semibold">建立新批次</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>班級
            <select className="block border rounded px-2 py-1 w-full"
              value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">—</option>
              {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>考試日期
            <input type="date" className="block border rounded px-2 py-1 w-full"
              value={examDate} onChange={e => setExamDate(e.target.value)} /></label>
          <label>批次標題
            <input className="block border rounded px-2 py-1 w-full"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="第二學期第一次段考"/></label>
          <label>作文題目
            <input className="block border rounded px-2 py-1 w-full"
              value={topic} onChange={e => setTopic(e.target.value)} placeholder="那些未曾褪色的風景"/></label>
          <label>最低字數
            <input type="number" className="block border rounded px-2 py-1 w-full"
              value={minWords} onChange={e => setMinWords(+e.target.value)} /></label>
        </div>
        <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={create}>建立</button>
      </section>
      <section>
        <h2 className="font-semibold mb-2">全部批次</h2>
        <ul className="space-y-1">
          {allBatches?.map(b => (
            <li key={b.id} className="flex items-center justify-between border rounded px-3 py-2">
              <Link className="underline" to={`/batches/${b.id}`}>
                {b.title} — {b.topic}
              </Link>
              <div className="flex gap-3 items-center text-xs text-slate-500">
                <span>{b.status}</span>
                <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                <button className="text-red-600"
                  onClick={() => { if (confirm('刪除整個批次？')) deleteBatch(b.id) }}>刪除</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): 批次列表與建立表單"
```

**Phase 10 驗收條件：** 能從 UI 建班、匯入學生 CSV、建批次。

---

## Phase 11：批次工作台（主介面）

**範疇**：批次頁面上傳 PDF、分組、逐份檢視與編輯、開始評分。

### Task 11.1: BatchWorkbench 骨架與 PDF 上傳

**Files:** Modify `src/pages/BatchWorkbench.tsx`

- [ ] **Step 1: 實作骨架**

```tsx
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { getBatch } from '@/core/repos/batches'
import { getApiKey, getSelectedModel } from '@/core/repos/settings'
import { splitPdf } from '@/core/pdf/splitter'
import { addPage } from '@/core/repos/pages'
import { runGroupingPhase, runGradingPhase } from '@/core/ai/orchestrator'
import { db } from '@/core/db'
import { EssayPanel } from '@/components/EssayPanel'
import { EssaySidebar } from '@/components/EssaySidebar'

export function BatchWorkbench() {
  const { batchId = '' } = useParams()
  const batch = useLiveQuery(() => getBatch(batchId), [batchId])
  const essays = useLiveQuery(
    () => db.essays.where('batchId').equals(batchId).toArray(), [batchId],
  )
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string>('')

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setBusy('拆頁中...')
    const pages = await splitPdf(f)
    for (const p of pages) {
      await addPage({
        batchId, essayId: null, pageIndex: p.pageIndex,
        imageBlob: p.fullBlob, thumbnailBlob: p.thumbBlob, rotation: p.rotation,
      })
    }
    setBusy('AI 分組與辨識姓名中...')
    const apiKey = await getApiKey(); const model = await getSelectedModel()
    if (!apiKey) { setBusy('請先於設定頁輸入 API key'); return }
    await runGroupingPhase({ batchId, apiKey, model })
    setBusy('')
  }

  async function onGradeAll() {
    const apiKey = await getApiKey(); const model = await getSelectedModel()
    if (!apiKey) { setBusy('請先於設定頁輸入 API key'); return }
    setBusy('AI 評分中...')
    await runGradingPhase({
      batchId, apiKey, model,
      onProgress: (d, t) => setBusy(`評分中 ${d}/${t}`),
    })
    setBusy('')
  }

  if (!batch) return <p>Loading...</p>
  const hasPages = (essays?.length ?? 0) > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{batch.title}</h1>
          <p className="text-sm text-slate-600">題目：{batch.topic}　狀態：{batch.status}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/batches/${batchId}/report`} className="px-3 py-1 rounded border">班級報告</Link>
          <button className="px-3 py-1 rounded bg-sky-600 text-white"
            onClick={onGradeAll} disabled={!hasPages || !!busy}>評分全部</button>
        </div>
      </div>
      {!hasPages ? (
        <div className="border rounded p-6 bg-white">
          <label className="cursor-pointer">
            <span className="px-4 py-2 rounded bg-slate-900 text-white">上傳作文 PDF</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
          </label>
          <p className="text-sm text-slate-600 mt-2">掃描雙面 PDF。系統會自動拆頁、辨識姓名與分組。</p>
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-3">
          <EssaySidebar batchId={batchId}
            selectedId={selectedEssayId} onSelect={setSelectedEssayId} />
          <EssayPanel essayId={selectedEssayId} batchId={batchId} />
        </div>
      )}
      {busy && <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-3 py-2 rounded">{busy}</div>}
    </div>
  )
}
```

- [ ] **Step 2: 建立 placeholder EssaySidebar 與 EssayPanel**

Create `src/components/EssaySidebar.tsx`:

```tsx
export function EssaySidebar(_: { batchId: string; selectedId: string | null; onSelect: (id: string) => void }) {
  return <div className="border rounded bg-white p-2 text-sm text-slate-500">側欄（待做）</div>
}
```

Create `src/components/EssayPanel.tsx`:

```tsx
export function EssayPanel(_: { essayId: string | null; batchId: string }) {
  return <div className="border rounded bg-white p-2 text-sm text-slate-500">作文檢視（待做）</div>
}
```

- [ ] **Step 3: `npm run build` 驗證**

Expected: build 過。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): BatchWorkbench 骨架 + PDF 上傳與分組觸發"
```

### Task 11.2: EssaySidebar — 學生列表 + 狀態

**Files:** Modify `src/components/EssaySidebar.tsx`

- [ ] **Step 1: 實作**

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { cn } from '@/lib/utils'

export function EssaySidebar(props: {
  batchId: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const essays = useLiveQuery(
    async () => {
      const list = await db.essays.where('batchId').equals(props.batchId).toArray()
      // 取 student 資料以便排序與顯示
      const stuMap = new Map<string, { seatNo: number; name: string }>()
      const students = await db.students.where('id').anyOf(list.map(e => e.studentId).filter((x): x is string => !!x)).toArray()
      students.forEach(s => stuMap.set(s.id, { seatNo: s.seatNo, name: s.name }))
      return list
        .map(e => ({ e, stu: e.studentId ? stuMap.get(e.studentId) : undefined }))
        .sort((a, b) => (a.stu?.seatNo ?? 999) - (b.stu?.seatNo ?? 999))
    },
    [props.batchId],
  )

  return (
    <aside className="border rounded bg-white max-h-[75vh] overflow-auto">
      <ul>
        {essays?.map(({ e, stu }) => {
          const icon = e.studentId == null
            ? '⚠️' : e.status === 'reviewed' ? '✅'
            : e.status === 'graded' ? '🟡' : '⬜'
          const scoreTotal = e.teacherScores?.total ?? e.aiScores?.total
          return (
            <li key={e.id}>
              <button
                className={cn('w-full text-left px-3 py-2 border-b text-sm flex justify-between',
                  props.selectedId === e.id && 'bg-sky-50')}
                onClick={() => props.onSelect(e.id)}>
                <span>
                  {icon}　
                  {stu ? `${String(stu.seatNo).padStart(2, '0')} ${stu.name}` : `未指派 (${e.ocrName ?? '?'})`}
                </span>
                <span className="tabular-nums">{scoreTotal?.toFixed(1) ?? '—'}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): 批次工作台側欄（狀態圖示 + 座號排序）"
```

### Task 11.3: EssayPanel — 圖片 + 分數 + 評語

**Files:** Modify `src/components/EssayPanel.tsx`

- [ ] **Step 1: 實作**

```tsx
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { getEssay, updateEssay } from '@/core/repos/essays'
import { getBatch } from '@/core/repos/batches'
import { listStudents } from '@/core/repos/students'
import type { RubricScores } from '@/types'

export function EssayPanel(props: { essayId: string | null; batchId: string }) {
  const essay = useLiveQuery(
    () => props.essayId ? getEssay(props.essayId) : undefined,
    [props.essayId],
  )
  const batch = useLiveQuery(() => getBatch(props.batchId), [props.batchId])
  const roster = useLiveQuery(
    () => batch ? listStudents(batch.classId) : [],
    [batch?.id],
  )
  const pages = useLiveQuery(
    () => essay ? db.pages.where('id').anyOf(essay.pageIds).sortBy('pageIndex') : [],
    [essay?.id],
  )

  const [imageUrls, setImageUrls] = useState<string[]>([])
  useEffect(() => {
    if (!pages) return
    const urls = pages.map(p => URL.createObjectURL(p.imageBlob))
    setImageUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [pages])

  if (!essay || !batch) return <div className="p-4 text-slate-500">請從左側選擇一份作文</div>

  const finalScores: RubricScores | null = essay.teacherScores ?? essay.aiScores
  const dims = batch.rubric.dimensions

  async function updateDim(name: string, value: number) {
    const base = finalScores ?? { dimensionScores: {}, typoDeduction: 0, lengthDeduction: 0, total: 0 }
    const next = { ...base, dimensionScores: { ...base.dimensionScores, [name]: value } }
    next.total = Object.values(next.dimensionScores).reduce((a, b) => a + b, 0) - next.typoDeduction - next.lengthDeduction
    await updateEssay(essay.id, { teacherScores: next })
  }
  async function setComment(c: string) { await updateEssay(essay.id, { teacherComment: c }) }
  async function setStudentId(id: string) { await updateEssay(essay.id, { studentId: id || null }) }
  async function markReviewed() { await updateEssay(essay.id, { status: 'reviewed' }) }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-3">
      <div className="space-y-2">
        {imageUrls.map((u, i) => (
          <img key={u} src={u} alt={`page ${i + 1}`}
            className="w-full border rounded bg-white" />
        ))}
      </div>
      <aside className="space-y-4">
        <div>
          <label className="text-xs text-slate-500">指派學生（AI: {essay.ocrName ?? '—'}, 信心 {essay.matchConfidence.toFixed(2)}）</label>
          <select value={essay.studentId ?? ''} className="border rounded px-2 py-1 w-full"
            onChange={e => setStudentId(e.target.value)}>
            <option value="">— 未指派 —</option>
            {roster?.map(s => <option key={s.id} value={s.id}>{s.seatNo} {s.name}</option>)}
          </select>
        </div>
        <div>
          <h3 className="font-semibold">分數</h3>
          {dims.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span className="w-20">{d.name}</span>
              <input type="number" step="0.5" min={0} max={d.maxScore}
                className="border rounded px-1 py-0.5 w-20"
                value={finalScores?.dimensionScores[d.name] ?? ''}
                onChange={e => updateDim(d.name, Number(e.target.value))}/>
              <span className="text-slate-500">/ {d.maxScore}</span>
            </div>
          ))}
          <div className="text-sm mt-1">扣分：錯字 {finalScores?.typoDeduction ?? 0}　字數 {finalScores?.lengthDeduction ?? 0}</div>
          <div className="text-lg font-semibold mt-1">總分 {finalScores?.total?.toFixed(1) ?? '—'} / 6</div>
        </div>
        <div>
          <h3 className="font-semibold">評語</h3>
          <textarea className="w-full border rounded p-2 text-sm" rows={5}
            value={essay.teacherComment ?? essay.aiComment ?? ''}
            onChange={e => setComment(e.target.value)} />
        </div>
        <div>
          <h3 className="font-semibold">錯別字</h3>
          <ul className="text-sm space-y-1">
            {essay.aiTypos.map((t, i) => (
              <li key={i}>{t.wrong} → {t.correct} <span className="text-slate-500">（{t.context}）</span></li>
            ))}
          </ul>
        </div>
        {essay.aiHighlights.length > 0 && (
          <div>
            <h3 className="font-semibold">佳句</h3>
            <ul className="text-sm list-disc pl-4">
              {essay.aiHighlights.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </div>
        )}
        <button className="px-3 py-1 rounded bg-slate-900 text-white" onClick={markReviewed}>
          標記已完成
        </button>
      </aside>
    </div>
  )
}
```

- [ ] **Step 2: 手動驗證 + Commit**

`npm run dev`，跑完整流程：建班、輸入學生、建批次、上傳 PDF、分組、評分、檢視。

```bash
git add -A
git commit -m "feat(ui): 作文檢視面板（圖片 + 分數編輯 + 評語 + 指派學生）"
```

### Task 11.4: 鍵盤快捷鍵（← → 切換、Enter 完成）

**Files:** Modify `src/pages/BatchWorkbench.tsx`

- [ ] **Step 1: 在 BatchWorkbench 加 useEffect 偵聽鍵盤**

```tsx
import { useEffect, useMemo, useState } from 'react'
// ... existing imports
import { updateEssay } from '@/core/repos/essays'

// 在 component 內：
const essayIds = useMemo(() => essays?.map(e => e.id) ?? [], [essays])
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).tagName === 'SELECT') return
    const idx = selectedEssayId ? essayIds.indexOf(selectedEssayId) : -1
    if (e.key === 'ArrowRight' && idx < essayIds.length - 1) {
      setSelectedEssayId(essayIds[idx + 1])
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      setSelectedEssayId(essayIds[idx - 1])
    } else if (e.key === 'Enter' && selectedEssayId) {
      updateEssay(selectedEssayId, { status: 'reviewed' })
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [essayIds, selectedEssayId])
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): 批次工作台鍵盤快捷鍵 (←→ Enter)"
```

**Phase 11 驗收條件：** 從上傳 PDF 到逐份檢視 / 編輯 / 標記完成全流程可跑。

---

## Phase 12：班級報告與匯出

### Task 12.1: BatchReport 頁

**Files:** Modify `src/pages/BatchReport.tsx`

- [ ] **Step 1: 實作**

```tsx
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getBatch } from '@/core/repos/batches'
import { listEssaysByBatch } from '@/core/repos/essays'
import { listStudents } from '@/core/repos/students'
import { computeStats } from '@/core/stats/classwide'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useState } from 'react'
import { exportToExcel } from '@/core/exports/excel'
import { exportToPdf } from '@/core/exports/pdf'

export function BatchReport() {
  const { batchId = '' } = useParams()
  const batch = useLiveQuery(() => getBatch(batchId), [batchId])
  const essays = useLiveQuery(() => listEssaysByBatch(batchId), [batchId])
  const roster = useLiveQuery(() => batch ? listStudents(batch.classId) : [], [batch?.id])
  const [exporting, setExporting] = useState(false)

  if (!batch || !essays || !roster) return <p>Loading...</p>
  const stats = computeStats(essays, batch.rubric.dimensions.map(d => d.name))
  const studentMap = new Map(roster.map(s => [s.id, s]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{batch.title} — 班級報告</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border"
            disabled={exporting}
            onClick={async () => { setExporting(true); await exportToExcel(batch, essays, roster); setExporting(false) }}>
            匯出 Excel
          </button>
          <button className="px-3 py-1 rounded border"
            disabled={exporting}
            onClick={async () => { setExporting(true); await exportToPdf(batch, essays, roster, stats); setExporting(false) }}>
            匯出 PDF
          </button>
        </div>
      </div>
      <section>
        <h2 className="font-semibold mb-2">總分分布</h2>
        <div className="h-48 bg-white border rounded p-2">
          <ResponsiveContainer>
            <BarChart data={stats.totalDistribution.histogram.map((v, i) => ({ score: i, count: v }))}>
              <XAxis dataKey="score" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600">
          平均 {stats.totalDistribution.mean.toFixed(2)}　最低 {stats.totalDistribution.min}　最高 {stats.totalDistribution.max}
        </p>
      </section>
      <section>
        <h2 className="font-semibold mb-2">錯字排行（Top 20）</h2>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {stats.typoRanking.map(t => (
            <li key={t.wrong + t.correct} className="border rounded px-2 py-1">
              <b>{t.wrong}</b> → {t.correct}　×{t.count}
              <span className="text-xs text-slate-500 ml-1">
                ({t.studentIds.map(id => studentMap.get(id)?.name).filter(Boolean).join('、')})
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-semibold mb-2">佳句選錄</h2>
        <ul className="space-y-1">
          {stats.highlights.slice(0, 10).map((h, i) => (
            <li key={i} className="text-sm">
              「{h.text}」
              <span className="text-xs text-slate-500 ml-2">
                — {h.studentId ? studentMap.get(h.studentId)?.name : '未指派'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): 班級報告頁（分布圖 + 錯字排行 + 佳句）"
```

### Task 12.2: Excel 匯出

**Files:** Create `src/core/exports/excel.ts`

- [ ] **Step 1: 安裝 exceljs**

```bash
npm install exceljs
```

- [ ] **Step 2: 實作**

```ts
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Batch, Essay, Student } from '@/types'

export async function exportToExcel(batch: Batch, essays: Essay[], roster: Student[]) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(batch.title.slice(0, 30))
  const dims = batch.rubric.dimensions.map(d => d.name)
  ws.columns = [
    { header: '座號', key: 'seatNo', width: 6 },
    { header: '姓名', key: 'name', width: 10 },
    ...dims.map(d => ({ header: d, key: d, width: 10 })),
    { header: '錯字扣分', key: 'typo', width: 8 },
    { header: '字數扣分', key: 'length', width: 8 },
    { header: '總分', key: 'total', width: 6 },
    { header: '評語', key: 'comment', width: 60 },
    { header: '字數(估)', key: 'wc', width: 8 },
  ]
  const map = new Map(roster.map(s => [s.id, s]))
  const sorted = [...essays].sort((a, b) => (map.get(a.studentId ?? '')?.seatNo ?? 999) - (map.get(b.studentId ?? '')?.seatNo ?? 999))
  for (const e of sorted) {
    const s = e.studentId ? map.get(e.studentId) : undefined
    const f = e.teacherScores ?? e.aiScores
    const row: Record<string, unknown> = {
      seatNo: s?.seatNo ?? '', name: s?.name ?? (e.ocrName ?? '未指派'),
      typo: f?.typoDeduction ?? 0, length: f?.lengthDeduction ?? 0,
      total: f?.total ?? '',
      comment: e.teacherComment ?? e.aiComment ?? '',
      wc: '', // word count not stored per-essay; leave blank
    }
    for (const d of dims) row[d] = f?.dimensionScores[d] ?? ''
    ws.addRow(row)
  }
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${batch.title}.xlsx`)
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(exports): Excel 匯出班級報告"
```

### Task 12.3: PDF 匯出（簡易版：用瀏覽器列印）

**Files:** Create `src/core/exports/pdf.ts`

- [ ] **Step 1: 實作**

為避免額外複雜的 PDF 套件，採「開啟可列印視窗，老師存為 PDF」做法：

```ts
import type { Batch, Essay, Student } from '@/types'
import type { StatsResult } from '@/core/stats/classwide'

export async function exportToPdf(
  batch: Batch, essays: Essay[], roster: Student[], stats: StatsResult,
) {
  const map = new Map(roster.map(s => [s.id, s]))
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) throw new Error('瀏覽器阻擋新視窗')
  const rows = essays.map(e => {
    const s = e.studentId ? map.get(e.studentId) : undefined
    const f = e.teacherScores ?? e.aiScores
    return `<tr>
      <td>${s?.seatNo ?? ''}</td>
      <td>${s?.name ?? e.ocrName ?? '未指派'}</td>
      <td>${f?.total?.toFixed(1) ?? ''}</td>
      <td>${(e.teacherComment ?? e.aiComment ?? '').replace(/</g, '&lt;')}</td>
    </tr>`
  }).join('')
  win.document.write(`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>${batch.title} 班級報告</title>
<style>
  body{font-family:system-ui,"Noto Sans TC",sans-serif;padding:24px;}
  h1{font-size:20px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top;}
  th{background:#f0f0f0;}
  .stats{margin:12px 0;font-size:13px;}
</style></head><body>
  <h1>${batch.title}</h1>
  <p>題目：${batch.topic}　人數：${stats.n}　平均總分：${stats.totalDistribution.mean.toFixed(2)}</p>
  <table><thead><tr><th>座號</th><th>姓名</th><th>總分</th><th>評語</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>window.print();</script>
</body></html>`)
  win.document.close()
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(exports): PDF 匯出（瀏覽器列印到 PDF）"
```

**Phase 12 驗收條件：** 班級報告頁有分布圖、錯字、佳句；Excel/PDF 匯出能產出檔案。

---

## Phase 13：部署與文件

### Task 13.1: 完整 E2E 手動測試清單

**Files:** Create `docs/superpowers/plans/e2e-checklist.md`

- [ ] **Step 1: 建立清單**

```markdown
# E2E 手動測試清單

1. 打開本機 `npm run dev`，瀏覽 `/Ai_Sheet/settings`，輸入 API key、選 Flash 模型
2. 建班「六年十班」，匯入 25 人 CSV
3. 建批次「114-2 第一次段考 / 那些未曾褪色的風景 / 500 字 / 2026-04-21」
4. 上傳專案根目錄的 `610作文.pdf`
5. 等待拆頁 + 分組完成（看到 25 份 essays）
6. 檢視側欄：⚠️ 的逐一手動指派學生
7. 按「評分全部」，等待 25 份完成
8. 逐份檢查：照片顯示正確、分數合理、評語 100 字內、錯別字清單可見
9. 將 AI 評分與老師原本寫在掃描上的紅字分數比對（誤差 ±1 內合格）
10. 進班級報告：分布圖、錯字排行、佳句
11. 匯出 Excel — 檢查欄位正確
12. 匯出 PDF — 檢查格式
13. 回設定頁 → 匯出備份 → 清除瀏覽器 IndexedDB → 匯入備份 → 驗證資料完整
14. 部署到 GitHub Pages，從無痕視窗打開 `https://guinngreen.github.io/Ai_Sheet/`，用另一個 API key 重跑 1-6
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: E2E 手動測試清單"
```

### Task 13.2: README（給其他老師看）

**Files:** Create `README.md`

- [ ] **Step 1: 建檔**

```markdown
# AI 作文評分（Ai_Sheet）

這是一個**純前端、瀏覽器本機**的 AI 作文評分網頁工具，專門用於批改國小手寫作文（繁體中文）。

## 🔗 使用連結
https://guinngreen.github.io/Ai_Sheet/

## ✨ 功能特色
- 上傳掃描的 PDF，自動辨識姓名、切分作文
- 以 Google Gemini 2.5 Flash 進行評分與評語
- 三向度（立意取材 / 結構組織 / 遣詞造句）6 分制
- 班級分數分布、錯字排行、佳句選錄
- 匯出 Excel / PDF 報告
- **學生資料全部存在您的瀏覽器，不上傳任何伺服器**

## 🚀 首次使用
1. 點開上方連結
2. 至「設定」頁，輸入您自己的 Google AI API key
   - 申請：https://aistudio.google.com/apikey （免費額度）
3. 建立班級 → 匯入學生名單（CSV：座號,姓名）
4. 建批次 → 上傳 PDF → 開始評分

## 🔒 隱私說明
- 所有資料（API key、學生姓名、作文圖片、分數）僅存於您的瀏覽器 IndexedDB
- 沒有任何資料會傳到除了 Google Gemini API 之外的伺服器
- 本工具為開源（MIT）

## 💾 備份
瀏覽器資料有清除風險，請定期至「設定 → 匯出備份」下載 zip 檔並妥善保存。

## 🛠 開發者指南
```bash
git clone https://github.com/GuinnGreen/Ai_Sheet.git
cd Ai_Sheet
npm install
npm run dev        # 開發伺服器
npm test           # 測試
npm run build      # 輸出至 dist/
```

Push 到 `main` 將自動透過 GitHub Actions 部署到 GitHub Pages。
```

- [ ] **Step 2: Commit & Push**

```bash
git add -A
git commit -m "docs: README（給老師的使用說明）"
git push
```

### Task 13.3: GitHub Pages 啟用驗證

- [ ] **Step 1: 到 repo Settings → Pages，確認 Source 為 "GitHub Actions"**（人工）
- [ ] **Step 2: 在 GitHub Actions 頁面看最新 workflow 是否綠燈**
- [ ] **Step 3: 開 `https://guinngreen.github.io/Ai_Sheet/` 驗證首頁能載入、能進設定頁**

**Phase 13 驗收條件：** 公開 URL 可用；README 清楚；E2E 測試全綠。

---

## Plan Self-Review Summary

**Spec 覆蓋檢查**：
- § 1-2（目標、資料流）→ 於 Phase 0、11 體現
- § 3（架構、元件切分）→ Phase 0-2、9
- § 4（資料模型）→ Phase 1-2
- § 5（AI prompt）→ Phase 5-6
- § 6（UI）→ Phase 9-12
- § 7（錯誤處理）→ 分散於 Phase 6（evalFail）、Phase 11（指派重試）
- § 8（測試策略）→ 單元測試逐 phase；golden set 在 Task 13.1 手動清單
- § 9（部署）→ Phase 0.5、13
- § 10-11（決策、待辦）→ 全計畫覆蓋

**覆蓋落差**：
- 未實作「AI 弱點分析」在 UI 的呈現（Phase 8.2 有函式、但沒在 BatchReport 頁呼叫）。補充於 Phase 12 選做。
- 未做自動化 E2E（Playwright）— 改為手動清單（Task 13.1），與 spec § 8.3 標記為「選配」一致。
- Per-essay 字數估計 Excel 欄位留白（資料未存 essay 本體）— 若需要可在 Phase 6.2 寫入 `aiScores` 以外欄位；目前估計欄位留空，欄位先保留不誤導老師。

**Placeholder 掃描**：無 TBD/TODO/「similar to」。每個 code step 都有完整程式碼。

**Type 一致性**：
- Essay 的 aiScores / teacherScores 使用 `RubricScores`（於 Phase 1 定義）
- `RubricScoresSchema` zod 輸出與 `RubricScores` 不同（zod 給 AI 原始格式 `scores/deductions/total`，repo 存 `dimensionScores/typoDeduction/lengthDeduction/total`）— 於 orchestrator (Task 6.3) 正確轉換
- `PROMPT_VERSION_*` 常數從 prompts.ts 來、grader.ts 再 re-export 給 orchestrator — 確認 import 路徑一致

**已知限制**：
- Gemini responseSchema 對複雜巢狀物件支援有限，目前走「自然語言 + JSON.parse + zod 驗證」路線
- iOS Safari 的 IndexedDB quota 較低，資料多時需提醒備份
- PDF 解析在極大檔（> 100 MB）可能卡頓；目前範例 35MB/50頁可正常處理

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-essay-grader-implementation.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — Claude 派發 Codex agent 逐 Task 執行，每 Task 後 review。

**2. Inline Execution** — Claude 在目前 session 中批次執行，用 checkpoint 間歇暫停讓使用者 review。

依前述已記錄的分工（Codex 寫程式、Claude review），**推薦選 1**。

