import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { ModuleFile } from '@kiasucode/shared'

import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError, getApiBaseUrl, isAbortError } from '../utils/api'

interface ModuleFilesListProps {
  moduleId: string
  moduleCode?: string
  disabled?: boolean
  onDisabledAttempt?: () => void
}

interface FilesResponse {
  files: ModuleFile[]
}

interface SingleFileResponse {
  file: ModuleFile
}

function formatFileSize(kb: number): string {
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)} MB`
  }
  return `${kb} KB`
}

export function ModuleFilesList({
  moduleId,
  moduleCode = 'Module',
  disabled = false,
  onDisabledAttempt,
}: ModuleFilesListProps) {
  const [files, setFiles] = useState<ModuleFile[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(moduleId && !disabled))
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    if (!moduleId || disabled) {
      setFiles([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    void apiRequest<FilesResponse>(`/api/modules/${moduleId}/files`, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        setFiles(data.files)
        setError(null)
      })
      .catch((loadError: unknown) => {
        if (!isAbortError(loadError)) {
          setError(formatApiError(loadError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [disabled, moduleId])


  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${getApiBaseUrl()}/api/modules/${moduleId}/files`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const body = (await response.json().catch(() => null)) as
        | SingleFileResponse
        | { message?: string; error?: string }
        | null

      if (!response.ok) {
        throw new Error(
          (body && 'message' in body && body.message)
          || (body && 'error' in body && body.error)
          || `File upload failed (${response.status}).`,
        )
      }

      if (!body || !('file' in body)) {
        throw new Error('Server returned an invalid file upload response.')
      }

      setFiles((current) => [body.file, ...current])
      showToast(`Attached ${file.name} to ${moduleCode}.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (uploadError) {
      setError(formatApiError(uploadError))
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    setDeletingId(fileId)
    setError(null)

    try {
      await apiRequest<{ success: boolean }>(`/api/files/${fileId}`, {
        method: 'DELETE',
      })

      setFiles((current) => current.filter((item) => item.id !== fileId))
      showToast(`Removed ${fileName}.`)
    } catch (deleteError) {
      setError(formatApiError(deleteError))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      aria-labelledby="module-files-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">attachments/fs.store</span>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100" id="module-files-title">
            Module Documents & Assets
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Syllabus, cheat sheets, lecture slides, and project specs for <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{moduleCode}</span>.
          </p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => void handleFileChange(e)}
            className="hidden"
            id={`file-upload-${moduleId || 'none'}`}
            disabled={disabled || isUploading}
          />
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={(e) => {
              if (disabled) {
                e.preventDefault()
                showToast('Please select a module before uploading files.')
                onDisabledAttempt?.()
                return
              }
              fileInputRef.current?.click()
            }}
            className={`button button--primary inline-flex items-center gap-1.5 ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : isUploading
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer'
            }`}
          >
            <span aria-hidden="true">{isUploading ? '⏳' : '↑'}</span>
            <span>{isUploading ? 'Uploading…' : 'Attach File'}</span>
          </button>
        </div>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-14 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700/50"
              />
            ))}
          </div>
        ) : files.length > 0 ? (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60" role="list">
            {files.map((file) => {
              const fullDownloadUrl = `${getApiBaseUrl()}${file.fileUrl}`
              return (
                <li
                  key={file.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/30 px-2 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                      aria-hidden="true"
                    >
                      📄
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={fullDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.fileName}
                        className="truncate font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400 block"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </a>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-mono">{formatFileSize(file.fileSizeKb)}</span>
                        <span>•</span>
                        <time dateTime={file.createdAt}>
                          {new Date(file.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </time>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={fullDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.fileName}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <span aria-hidden="true">↓</span> Download
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFile(file.id, file.fileName)}
                      disabled={deletingId === file.id}
                      className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                      title="Delete attachment"
                      aria-label={`Delete ${file.fileName}`}
                    >
                      {deletingId === file.id ? '…' : '×'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {disabled
                ? 'Please select a module from the dropdown above to view and attach files.'
                : `No files attached to ${moduleCode} yet.`}
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Upload PDF slides, notes, or code archives up to 15 MB.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
