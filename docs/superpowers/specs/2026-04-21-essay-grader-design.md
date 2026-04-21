# AI 作文評分系統 — 設計文件

- **日期**：2026-04-21
- **作者**：使用者 + Claude（協作設計）
- **狀態**：Draft，待使用者審閱

---

## 1. 背景與目標

國小老師手上有整班掃描好的雙面手寫作文 PDF（繁體中文），希望用 AI 自動評分、產生個別評語，並提供班級層級的分析，長期使用於每學期段考。

### 1.1 使用者

- 主要：國小高年級國語老師（六年級）
- 次要：其他科任或同校老師（透過分享 GitHub 連結即可使用）

### 1.2 核心目標

1. **自動評分**：AI 讀取掃描圖、依 rubric 給分、產生 100 字左右評語
2. **班級分析**：分數分布、常見錯別字、弱點歸納、佳句選錄、個人 vs 班平均
3. **長期使用**：累積歷次批次，可查詢學生歷次成績與進步趨勢
4. **零安裝分享**：其他老師點一個 GitHub Pages 連結就能使用
5. **學生資料隱私**：所有資料只存老師自己的瀏覽器，不經過任何伺服器

### 1.3 非目標（YAGNI）

- 不做帳號登入 / 多人協作（每位老師獨立使用）
- 不做雲端同步（改用本機備份 / 還原 zip）
- 不整合學校既有系統
- 不支援非繁體中文、非手寫、非國小的情境
- 不做同批次內多位老師的評分比對
- 歷次趨勢圖暫不做（等真的累積幾次批次再說）

---

## 2. 核心概念與資料流

### 2.1 三個核心資料單位

| 單位 | 說明 | 生命週期 |
|---|---|---|
| **班級 (Class)** | 一個班級的基本資料（六年十班） | 長期存在，跨學年 |
| **學生 (Student)** | 屬於某班級的一位學生 | 長期存在，會累積歷次成績 |
| **批次 (Batch)** | 一次段考作文，一份 PDF 對應一個批次 | 長期保留做歷次比較 |
| **作文 (Essay)** | 一位學生在一次批次中的作業 | 批次下的記錄 |

### 2.2 端到端流程

```
1. 老師建立班級 + 輸入學生名單（首次）
2. 建立新批次：填入作文題目、日期、rubric（預設值）
3. 上傳 PDF
4. 系統：pdfjs-dist 拆頁為 Blob 圖片（300 DPI）
5. 系統：Gemini 一次辨識全部頁面的姓名與頁面分組
6. 系統：姓名與班級名單做模糊比對，自動配對或標記不確定
7. 老師在 UI 確認配對（下拉選單指定、頁數切分調整）
8. 按「開始評分」→ 每份作文的 2 張圖送 Gemini 評分 → 存結果
9. UI 逐份檢視：圖片 + 分數 + 評語，老師可編輯修改
10. 匯出班級報告（Excel / PDF）+ 瀏覽班級分析儀表板
```

---

## 3. 架構

### 3.1 技術棧

- **前端框架**：Vite + React + TypeScript
- **路由**：react-router-dom
- **UI**：Tailwind CSS + shadcn/ui + lucide-react 圖示
- **狀態管理**：Zustand（輕量 UI state）+ dexie-react-hooks（響應式 DB 查詢）
- **資料儲存**：Dexie.js over IndexedDB
- **PDF 處理**：pdfjs-dist
- **AI SDK**：@google/genai（Google 官方 JS SDK）
- **資料驗證**：zod（驗證 AI 回傳 JSON）
- **圖表**：recharts（班級分數分布）
- **備份**：jszip + file-saver
- **測試**：vitest（單元）、Playwright（可選 E2E）

### 3.2 部署架構

```
GitHub Repo
    ↓ (push to main)
GitHub Actions Workflow
    ↓ (npm run build → static assets)
GitHub Pages (gh-pages branch)
    ↓
公開 URL：https://guinngreen.github.io/Ai_Sheet/（目標 repo: GuinnGreen/Ai_Sheet）
    ↓
每位老師的瀏覽器（資料隔離）
    ├─ IndexedDB：班級、學生、批次、作文、圖片、評分、API key
    └─ 直接呼叫 Gemini API（老師自己的 key）
```

**沒有後端伺服器**。所有運算（PDF 拆頁、AI 呼叫、統計）都在老師的瀏覽器端完成。

### 3.3 元件切分（每個模組單一職責）

```
src/
├── main.tsx / App.tsx
├── pages/
│   ├── Home.tsx
│   ├── Settings.tsx                 # API key, 備份/還原
│   ├── ClassList.tsx / ClassDetail.tsx
│   ├── BatchList.tsx
│   ├── BatchWorkbench.tsx           # 主工作台
│   ├── BatchReport.tsx              # 班級分析儀表板
│   └── StudentDetail.tsx            # 學生歷次成績
├── components/                      # 共用 UI 元件
├── core/
│   ├── db.ts                        # Dexie 設定與 schema
│   ├── pdf/splitter.ts              # PDF → Blob 圖片陣列
│   ├── ai/
│   │   ├── gemini.ts                # API client 封裝
│   │   ├── prompts.ts               # 版本化 prompt 模板
│   │   └── grader.ts                # 評分流程 orchestration
│   ├── matcher/name.ts              # 姓名模糊比對（Levenshtein）
│   ├── stats/classwide.ts           # 班級統計、錯字排行、佳句彙整
│   └── backup/{export,import}.ts    # zip 備份/還原
├── types/                           # TypeScript 型別定義
└── hooks/                           # 共用 React hooks（useCurrentBatch 等）
```

### 3.4 模組邊界原則

每個 `core/*` 模組應該能回答：
- **做什麼**（單一職責）
- **怎麼用**（純函式 / 明確介面）
- **依賴什麼**（只依賴 Dexie、Gemini SDK，不依賴 React）

Pages 層只負責 UI 與呼叫 core 模組，不直接碰 Gemini SDK 或 Dexie schema 細節。

---

## 4. 資料模型（Dexie / IndexedDB）

### 4.1 Tables

```typescript
// 設定
interface Setting {
  key: string           // "apiKey" | "model" | "lastExportDate" | ...
  value: any
}

// 班級
interface Class {
  id: string            // uuid
  name: string          // "六年十班"
  grade: number         // 6
  schoolYear: string    // "114-2" (學年度+學期)
  createdAt: number
}

// 學生
interface Student {
  id: string
  classId: string
  seatNo: number        // 座號
  name: string
}

// 批次（一次段考）
interface Batch {
  id: string
  classId: string
  title: string         // "114 學年度第二學期第一次段考"
  topic: string         // "那些未曾褪色的風景"
  minWords: number      // 500
  rubric: Rubric        // 向度與配分定義（JSON）
  examDate: string      // ISO date
  createdAt: number
  status: 'draft' | 'splitting' | 'ready_to_grade' | 'grading' | 'completed'
}

// 作文（某學生在某批次的作業）
interface Essay {
  id: string
  batchId: string
  studentId: string | null         // null 表示尚未指定學生
  pageIds: string[]                // 通常 2 張圖
  ocrName: string | null           // AI 辨識到的姓名
  matchConfidence: number          // 0-1
  aiScores: RubricScores | null    // AI 原始分數
  aiComment: string | null
  aiTypos: Typo[]
  aiHighlights: string[]
  teacherScores: RubricScores | null    // 老師調整後分數（若有）
  teacherComment: string | null         // 老師調整後評語（若有）
  status: 'pending' | 'graded' | 'reviewed'
  updatedAt: number
}

// 頁面（掃描圖）
interface Page {
  id: string
  essayId: string | null           // 尚未指定作文時為 null
  pageIndex: number                // 在原 PDF 中的頁碼
  imageBlob: Blob                  // 實際圖片資料
  rotation: number                 // 度數（0/90/180/270）
  thumbnailBlob: Blob              // 小圖用於列表顯示
}

// 評分稽核記錄
interface GradingRun {
  id: string
  essayId: string
  model: string                    // "gemini-2.5-flash"
  promptVersion: string            // "v1.0.0"
  rawResponse: string              // AI 原始回傳（供除錯）
  parsedResult: any                // 解析後結果
  costEstimateUsd: number          // 估算成本
  durationMs: number
  createdAt: number
}
```

### 4.2 衍生型別

```typescript
interface Rubric {
  dimensions: Array<{ name: string; maxScore: number }>
  // 預設：[{立意取材, 2}, {結構組織, 2}, {遣詞造句, 2}]
  deductions: {
    typoPerThree: number           // 預設 0.5
    typoMax: number                // 預設 1
    lengthUnder: number            // 字數不足扣分 0.5-1
  }
}

interface RubricScores {
  dimensionScores: Record<string, number>   // { 立意取材: 1.5, ... }
  typoDeduction: number
  lengthDeduction: number
  total: number
}

interface Typo {
  wrong: string
  correct: string
  context: string        // 錯字出現的前後文
}
```

### 4.3 儲存量估算

每批次（25 位學生）：
- 50 張圖（300 DPI，JPEG 壓縮）× 約 400 KB ≈ **20 MB**
- 50 張縮圖 × 約 30 KB ≈ **1.5 MB**
- 結構化資料（分數、評語、typos）≈ **< 1 MB**

長期（每學期 4-6 次段考 × 多班）：
- 單一老師一學年可能累積 200-500 MB
- IndexedDB 配額由瀏覽器依磁碟剩餘空間動態決定，Chromium 系通常可用到磁碟的 60%，Safari 較保守（iOS Safari 約 1 GB）；本場景容量需求遠低於配額上限
- 若擔心過大，可在設定頁提供「僅保留最近 N 批」選項（暫不實作）

---

## 5. AI 評分流程

### 5.1 兩階段設計

- **階段 A：姓名與頁面分組**（一次 API 呼叫，成本極低）
- **階段 B：逐份評分**（每份作文一次 API 呼叫）

### 5.2 階段 A — 姓名與頁面分組

**輸入**：PDF 所有頁的縮圖（每張 800 px 長邊，JPEG）
**輸出**：JSON 陣列，每個元素包含「屬於同一份作文的頁碼」與「該份作文的學生姓名」

Prompt 結構：
```
你會看到 N 張國小作文試卷掃描頁的縮圖。每份作文通常是連續 2 頁（正反面）。
請做兩件事：
1. 切分：哪些頁碼屬於同一份作文
2. 姓名辨識：每份作文第一頁右上角的學生姓名（手寫）

已知班級名單（含姓名與座號）：
<CSV 名單>

請嚴格輸出 JSON 陣列 (使用 response_schema 限制)：
[
  { "pages": [1,2], "ocrName": "陳大華", "confidence": 0.9, "suggestedStudentId": "..." },
  ...
]

規則：
- confidence 0-1
- 姓名辨識失敗或不在名單中：confidence < 0.5, suggestedStudentId = null
- 若某頁看起來是完全空白或不是作文紙（例如封面），自成一組並標 confidence = 0
```

系統接著以 Levenshtein 距離做二次比對，選最可能的 studentId（距離閾值 ≤ 1 為自動配對）。

### 5.3 階段 B — 單份作文評分

**輸入**：該份作文的兩張圖（完整解析度）+ rubric + 題目
**輸出**：嚴格 JSON，含三向度分數、扣分、評語、錯字、佳句

Prompt 結構（版本 v1.0.0）：
```
你是一位資深國小國語老師，正在評改六年級作文。

【題目】{topic}
【字數要求】{minWords} 字以上
【評分標準】(總分 {maxTotal} 分)
  立意取材 (0-2 分)：主題明確、取材切題、內容豐富
  結構組織 (0-2 分)：段落分明、起承轉合、前後連貫
  遣詞造句 (0-2 分)：用詞恰當、句子通順、修辭運用
【扣分規則】
  錯別字每 3 個扣 0.5（上限 1 分）
  字數不足扣 0.5-1 分

【任務】
1. 逐字閱讀作文（含手寫校正過的字跡）
2. 給三向度分數（允許 0.5 的半分）
3. 找出錯別字清單（列出錯字、正確字、出現的前後文）
4. 估算字數
5. 寫一段約 100 字的評語：
   - 先肯定 1-2 個亮點
   - 再具體指出 1-2 個可改進處
   - 語氣溫和、鼓勵成長
6. 挑 1-2 句佳句摘錄（可用於班級公告鼓勵）

嚴格輸出 JSON（response_schema 強制）：
{
  "scores": { "立意取材": 1.5, "結構組織": 1.0, "遣詞造句": 1.5 },
  "deductions": { "typo": 0, "length": 0 },
  "total": 4.0,
  "wordCountEstimate": 520,
  "typos": [{"wrong":"因該", "correct":"應該", "context":"因該要去"}],
  "highlights": ["走到那座圖書館，陽光灑在桌上..."],
  "comment": "（約 100 字評語）",
  "readabilityNotes": "字跡清晰 / 部分潦草 / 有多處塗改"
}
```

**實作細節**：
- 使用 Gemini 的 `responseSchema` 配合 `responseMimeType: 'application/json'` 強制 JSON 輸出
- 用 zod schema 二次驗證 AI 回傳
- 解析失敗時自動重試 1 次（帶著失敗訊息給 AI），仍失敗則在 UI 標記「評分失敗，可手動重試」

### 5.4 Prompt 版本化

`ai/prompts.ts` 中每個 prompt 帶 `version` 字串（semver）。每次評分寫 `gradingRuns.promptVersion`，未來調整 prompt 後能追溯「那次評分是用哪個版本」，也能針對特定批次重跑比較。

### 5.5 成本估算（Gemini 2.5 Flash）

- 階段 A：50 張縮圖 + 回應，約 NT$2
- 階段 B：25 份 × 2 張圖 + 回應，約 NT$10-15
- **單次段考總成本：NT$15-20 以內**

---

## 6. UI 設計

### 6.1 批次工作台（主介面，花最多時間）

```
┌──────────────────────────────────────────────────────────┐
│ 批次：六年10班 - 那些未曾褪色的風景    [匯出] [重評全部]  │
├──────────────────┬───────────────────────────────────────┤
│ 學生列表 (25)     │  [◀] 03/25 陳大華              [▶]    │
│ ────────────    │  ┌──────────────┬──────────────────┐│
│ ✅ 01 王小明 5.0  │  │              │ 立意取材 1.5 / 2  ││
│ ✅ 02 林美玲 4.5  │  │   正面圖片    │ 結構組織 1.0 / 2  ││
│ 🟡 03 陳大華 3.5  │  │              │ 遣詞造句 1.0 / 2  ││
│ ⚠️ 04 ???    --  │  │              │ 扣分      -0.5    ││
│ ⬜ 05 ...    --  │  ├──────────────┤ 總分     3.0 / 6  ││
│ ...              │  │              │ [調分] [還原AI原始] ││
│                  │  │   反面圖片    │                    ││
│                  │  │              │ 【評語】            ││
│                  │  │              │ (可編輯文字區)       ││
│                  │  │              │                    ││
│                  │  │              │ 【錯別字】          ││
│                  │  │              │ 因該 → 應該 [移除]   ││
│                  │  │              │                    ││
│                  │  │              │ [重新評分][標已完成] ││
│                  │  └──────────────┴──────────────────┘│
└──────────────────┴───────────────────────────────────────┘
```

**狀態圖示**：
- ✅ 已評分且老師確認
- 🟡 已評分，未確認
- ⚠️ 姓名辨識失敗，需手動指定
- ⬜ 尚未評分

**互動設計**：
- 鍵盤快捷鍵：`←` `→` 切換作文；`Enter` 標記已完成；`R` 重評
- 圖片點擊放大（lightbox）、支援滑鼠滾輪縮放
- 所有編輯（分數、評語、錯字增刪）**即時寫回 IndexedDB**，無須按儲存

### 6.2 班級分析儀表板 `/batches/:id/report`

包含：
- 三向度 + 總分的分布長條圖（recharts）
- 全班錯別字 Top 20，點擊可展開是哪幾位學生寫錯
- AI 產生的「本次作文整班弱點」200 字分析（由一次額外 API 呼叫產生）
- 全班佳句選錄（5-10 句，標註學生姓名與座號）
- 匯出：
  - **Excel**：每生一列，含各項分數、扣分、總分、評語、字數
  - **PDF**：班級完整報告（sheet 封面 + 分布圖 + 錯字排行 + 個別評語列表）

### 6.3 其他頁面

- **Home**：選擇班級、最近批次快速存取、備份提醒
- **Settings**：API key 輸入/清除、選擇模型（Flash / Pro）、備份匯出 / 還原、資料清除
- **ClassDetail**：學生名單管理（CRUD、CSV 匯入）
- **StudentDetail**：該生歷次批次成績列表（長期累積後才有意義）

---

## 7. 錯誤處理與韌性

| 狀況 | 處理策略 |
|---|---|
| PDF 掃描方向錯（旋轉 90/270 度） | 拆頁時檢查 `page.rotate`，自動轉正；UI 提供旋轉按鈕手動修正 |
| 姓名辨識失敗或不在名單中 | UI 標 ⚠️，老師從下拉選單手動指定學生 |
| AI 回傳 JSON 解析失敗 | 記錄原始 response；自動重試 1 次；仍失敗則 UI 顯示「可重試」 |
| Gemini API 超時 / rate limit | 指數退避重試 3 次；仍失敗在 UI 標示 |
| 某份作文頁數 ≠ 2（學生只寫 1 頁、寫到 3 頁） | UI 允許手動調整該份作文的起訖頁 |
| 老師手動改過分數 | 存 `teacherScores` / `teacherComment`；統計一律以老師最終分數為準 |
| 瀏覽器儲存空間快滿 | Dexie quota 監控；接近 80% 時提示老師備份並清除舊批次 |
| API key 未設定或失效 | 清楚的錯誤訊息 + 導向 Settings 頁 |
| 使用者清除瀏覽器資料 | 無可避免；UI 在明顯處持續提示備份必要性 |

---

## 8. 測試策略

### 8.1 單元測試（vitest）

- `pdf/splitter`：用測試 PDF 驗證頁數、旋轉、Blob 輸出
- `matcher/name`：各種姓名比對 case（完全相符、一字差、同音異字、名單無此人）
- `stats/classwide`：給定假 essays，驗證分布計算、錯字排行、佳句彙整
- `backup/{export,import}`：匯出後匯入能完整還原
- Dexie schema migration（未來有新版時）

### 8.2 AI 整合測試（Golden Set）

- 挑 5-10 份已知分數（老師手寫紅字）的作文做為 golden set
- Prompt 改版時手動跑 golden set，確認 AI 分數與老師分數誤差 ≤ ±1 分
- 不做 CI 自動化（每跑一次要付錢）

### 8.3 E2E 測試（Playwright，選配）

- 最小覆蓋：上傳 PDF → 拆頁 → 評分 → 匯出報告的 happy path
- 姓名辨識失敗的手動指定流程
- 備份匯出 / 還原流程

---

## 9. 專案骨架與部署

### 9.1 目錄結構

```
Ai_Sheet/                             # GitHub repo: GuinnGreen/Ai_Sheet
├── .github/workflows/deploy.yml     # GitHub Actions: push to main → deploy to gh-pages
├── src/
│   ├── main.tsx / App.tsx
│   ├── pages/
│   ├── components/
│   ├── core/{db,pdf,ai,matcher,stats,backup}/
│   ├── types/
│   └── hooks/
├── public/
├── index.html
├── vite.config.ts                   # base: '/Ai_Sheet/'（對應 GitHub repo 名稱）
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── README.md                        # 給老師看的使用說明（繁中）
└── docs/superpowers/specs/          # 本文件所在
```

### 9.2 GitHub Actions Workflow

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 9.3 README 對其他老師的說明（大綱）

1. 快速開始：點[連結]開啟 App
2. 申請 Google AI API key 教學（aistudio.google.com）
3. 首次設定：輸入 key、建立班級、輸入學生名單（附 CSV 範例）
4. 日常流程：建批次、上傳 PDF、評分、檢視報告、匯出
5. 備份：為什麼要備份、怎麼備份、怎麼還原
6. 隱私說明：資料存哪裡、誰看得到（沒有別人）、API key 怎麼保管
7. 常見問題

---

## 10. 已定案的關鍵決策

| 項目 | 決策 | 理由 |
|---|---|---|
| 目的 | 自動評分 + 班級分析 + 評語 | 使用者需求 |
| 年級 | 國小六年級（可擴充其他年級） | 使用者需求 |
| 語系 | 繁體中文手寫 | 使用者需求 |
| 介面 | 瀏覽器網頁 | 使用者選擇 |
| Rubric | 3 向度 × 2 分 + 錯字/字數扣分 | AI 提案，使用者批准 |
| 評語長度 | 約 100 字 | 使用者指定 |
| 學生辨識 | 班級名單 + AI 模糊比對 + 手動修正 | 最穩健 |
| AI 引擎 | Gemini 2.5 Flash | 使用者選擇，成本低 |
| 儲存 | IndexedDB（Dexie.js） | 純前端必須 |
| 技術棧 | Vite + React + TS | 無伺服器包袱 |
| 部署 | GitHub Pages + Actions | 使用者要求「連結分享」 |
| 隱私 | 資料全本機，API key 本機 | 學生個資保護 |
| 備份 | zip 手動匯出 / 還原 | 無伺服器版必備 |

---

## 11. 待實作項目（寫實作計畫時展開）

1. 專案初始化：Vite + React + TS + Tailwind + shadcn/ui 骨架
2. Dexie DB schema 與型別
3. PDF 拆頁模組
4. Gemini client 封裝與 prompt 模板
5. 姓名模糊比對模組
6. 評分 orchestration（兩階段流程）
7. UI 頁面：Settings、ClassList/Detail、BatchList
8. UI 頁面：BatchWorkbench（主工作台）
9. UI 頁面：BatchReport（班級儀表板）
10. 班級統計模組（分布、錯字排行、佳句、弱點分析）
11. 匯出功能（Excel、PDF）
12. 備份匯出 / 還原
13. GitHub Actions 部署設定
14. README 使用說明（繁中）
15. 測試：core 模組單元測試、golden set 驗證

（實作順序與依賴關係將在 writing-plans 階段詳細規劃。）
