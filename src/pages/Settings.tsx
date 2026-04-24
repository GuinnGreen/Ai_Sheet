import { useEffect, useState } from 'react'
import {
  getApiKey,
  setApiKey,
  clearApiKey,
  getSelectedModel,
  setSelectedModel,
  type GeminiModel,
} from '@/core/repos/settings'
import { downloadBackup } from '@/core/backup/export'
import { importFromZip } from '@/core/backup/import'

export function Settings() {
  const [key, setKey] = useState('')
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    void (async () => {
      setSavedKey(await getApiKey())
      setModel(await getSelectedModel())
    })()
  }, [])

  async function saveKey() {
    if (!key) return
    await setApiKey(key)
    setSavedKey(key)
    setKey('')
    setStatus('API key 已儲存')
  }
  async function removeKey() {
    await clearApiKey()
    setSavedKey(null)
    setStatus('已清除 API key')
  }
  async function saveModel(m: GeminiModel) {
    setModel(m)
    await setSelectedModel(m)
    setStatus('模型設定已儲存')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      await importFromZip(f)
      setStatus('已還原備份')
    } catch (err) {
      setStatus('還原失敗：' + String(err))
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      <section>
        <h2 className="text-lg font-semibold mb-2">Google AI API Key</h2>
        <p className="text-sm text-slate-600 mb-3">
          儲存於您的瀏覽器內，不會上傳到任何伺服器。申請：
          <a
            className="underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            aistudio.google.com/apikey
          </a>
        </p>
        <p className="mb-2 text-sm">
          目前：{savedKey ? `已設定（${savedKey.slice(0, 6)}...）` : '未設定'}
        </p>
        <input
          type="password"
          className="border rounded px-2 py-1 w-full"
          placeholder="AIza..."
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button
            className="px-3 py-1 rounded bg-sky-600 text-white"
            onClick={() => void saveKey()}
          >
            儲存
          </button>
          {savedKey && (
            <button
              className="px-3 py-1 rounded border"
              onClick={() => void removeKey()}
            >
              清除
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">AI 模型</h2>
        <div className="flex gap-4">
          {(['gemini-2.5-flash', 'gemini-2.5-pro'] as GeminiModel[]).map(m => (
            <label key={m} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="model"
                value={m}
                checked={model === m}
                onChange={() => void saveModel(m)}
              />
              {m}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">備份 / 還原</h2>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 rounded bg-slate-900 text-white"
            onClick={() => void downloadBackup()}
          >
            匯出備份 (.zip)
          </button>
          <label className="px-3 py-1 rounded border cursor-pointer">
            匯入備份
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleImport}
            />
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
