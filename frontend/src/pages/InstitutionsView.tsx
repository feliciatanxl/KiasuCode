import { useState } from 'react'
import type { Institution } from '@kiasucode/shared'

import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { apiRequest, formatApiError } from '../utils/api'

interface InstitutionsViewProps {
  institutions: Institution[]
  isLoading: boolean
  onOpenInstitution: (institution: Institution) => void
  onOpenInstitutionForm: () => void
  onInstitutionDeleted: (id: string) => void
}

export function InstitutionsView({
  institutions,
  isLoading,
  onOpenInstitution,
  onOpenInstitutionForm,
  onInstitutionDeleted,
}: InstitutionsViewProps) {
  const [institutionToDelete, setInstitutionToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { sessionToken } = useAuth()
  const { showToast } = useToast()

  const confirmDeleteInstitution = async () => {
    if (!sessionToken || !institutionToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const { status } = await apiRequest<{ success: boolean }>(
        `/api/institutions/${institutionToDelete.id}`,
        sessionToken,
        { method: 'DELETE' },
      )

      if (status !== 200) {
        throw new Error(`Unexpected delete status (${status}).`)
      }

      onInstitutionDeleted(institutionToDelete.id)
      showToast('Institution repository wiped.')
      setInstitutionToDelete(null)
    } catch (error) {
      setDeleteError(formatApiError(error))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <section
        className="workspace-panel mt-6 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
        aria-label="Institutions"
      >
        {isLoading ? (
          <div className="empty-state">
            <p>Loading institutions…</p>
          </div>
        ) : institutions.length > 0 ? (
          institutions.map((institution) => (
            <div
              className="flex w-full items-center justify-between border-b border-slate-200 bg-white px-6 py-5 transition-colors last:border-b-0 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/60"
              key={institution.id}
            >
              <button
                className="flex flex-1 cursor-pointer items-center justify-between gap-4 text-left"
                type="button"
                onClick={() => onOpenInstitution(institution)}
              >
                <span>
                  <strong className="block text-sm text-slate-900 dark:text-slate-100">
                    {institution.name}
                  </strong>
                  <small className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    Open semesters
                  </small>
                </span>
                <span className="text-xl text-blue-500" aria-hidden="true">
                  →
                </span>
              </button>
              <button
                className="ml-4 inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                type="button"
                aria-label={`Delete ${institution.name}`}
                title="Delete institution"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteError(null)
                  setInstitutionToDelete({
                    id: institution.id,
                    name: institution.name,
                  })
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <span>directory --empty</span>
            <p>No institutions have been added yet.</p>
            <button
              className="button button--primary mt-5"
              type="button"
              onClick={onOpenInstitutionForm}
            >
              <span aria-hidden="true">+</span> Add Institution
            </button>
          </div>
        )}
      </section>

      {institutionToDelete !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setInstitutionToDelete(null)
            }
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-institution-title"
          >
            <h2
              className="text-lg font-bold text-slate-900 dark:text-white mb-2"
              id="delete-institution-title"
            >
              Delete Institution
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
              Are you sure you want to delete {institutionToDelete.name}? This
              will permanently wipe all nested semesters, modules, and grades.
              This action cannot be undone.
            </p>

            {deleteError ? (
              <p
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                role="alert"
              >
                {deleteError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                type="button"
                onClick={() => setInstitutionToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                type="button"
                onClick={confirmDeleteInstitution}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete Repository'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
