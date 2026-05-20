import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { createDocument, deleteDocument, subscribeCollection, updateDocument } from '../services/firestoreService'
import { removeFile, uploadFile } from '../services/storageService'

const initialFieldValue = (field) => {
  if (field.type === 'number') return ''
  return ''
}

function CrudCollectionPage({ title, collectionName, fields }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [editingItem, setEditingItem] = useState(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [formData, setFormData] = useState(() =>
    fields.reduce((acc, field) => ({ ...acc, [field.name]: initialFieldValue(field) }), {}),
  )
  const [selectedFiles, setSelectedFiles] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setIsLoaded(false)
    const unsubscribe = subscribeCollection(collectionName, (nextItems) => {
      setItems(nextItems)
      setIsLoaded(true)
    })
    return () => unsubscribe()
  }, [collectionName])

  const tableColumns = useMemo(
    () => fields.filter((field) => field.type !== 'file').map((field) => field.name),
    [fields],
  )

  const resetForm = () => {
    setEditingItem(null)
    setSelectedFiles({})
    setFormData(fields.reduce((acc, field) => ({ ...acc, [field.name]: initialFieldValue(field) }), {}))
  }

  const onChange = (event) => {
    const { name, value, files } = event.target

    if (files?.length) {
      setSelectedFiles((prev) => ({ ...prev, [name]: files[0] }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const startEdit = (item) => {
    setEditingItem(item)
    const nextState = fields.reduce((acc, field) => {
      acc[field.name] = item[field.name] ?? initialFieldValue(field)
      return acc
    }, {})

    setFormData(nextState)
    setSelectedFiles({})
  }

  const buildPayload = async () => {
    const payload = { ...formData }

    for (const field of fields) {
      if (field.type === 'number') {
        const rawValue = payload[field.name]
        payload[field.name] = rawValue === '' || rawValue === null ? null : Number(rawValue)
      }

      if (field.type === 'file' && selectedFiles[field.name]) {
        const uploaded = await uploadFile({
          collectionName,
          uid: user.uid,
          file: selectedFiles[field.name],
        })

        payload[field.urlField] = uploaded.fileUrl
        payload[field.pathField] = uploaded.filePath
        payload[field.fileNameField] = uploaded.fileName
      }
    }

    payload.updatedBy = user.uid

    if (!editingItem) {
      payload.createdBy = user.uid
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined) {
        delete payload[key]
      }
    })

    return payload
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const payload = await buildPayload()

      if (editingItem) {
        await updateDocument(collectionName, editingItem.id, payload)
      } else {
        await createDocument(collectionName, payload)
      }

      resetForm()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const onDelete = async (item) => {
    const confirmDelete = window.confirm('Delete this record?')
    if (!confirmDelete) {
      return
    }

    try {
      for (const field of fields) {
        if (field.type === 'file' && item[field.pathField]) {
          await removeFile(item[field.pathField])
        }
      }
      await deleteDocument(collectionName, item.id)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">College Admin Panel</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {editingItem ? `Edit ${title}` : `Add ${title}`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Simple, clean management view for college admins.</p>
          </div>
          <img src="/image/LOGO.png" alt="College logo" className="h-12 w-12 shrink-0 object-contain" />
        </div>

        {!isLoaded ? (
          <div className="mb-5 animate-pulse rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="h-4 w-44 rounded bg-slate-200" />
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
              <div className="h-10 rounded-lg bg-slate-200" />
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className="text-sm font-medium text-slate-700">
              <span className="mb-1 block capitalize">{field.label ?? field.name}</span>
              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  value={formData[field.name]}
                  onChange={onChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  value={formData[field.name]}
                  onChange={onChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
                >
                  <option value="">Select</option>
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === 'file' ? (
                <input
                  type="file"
                  name={field.name}
                  accept={field.accept}
                  onChange={onChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
                />
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={onChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-slate-400 focus:outline-none"
                />
              )}
            </label>
          ))}

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </button>
            {editingItem ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {error ? <p className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">All {title}</h3>
        </div>
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {tableColumns.map((column) => (
                <th key={column} className="px-3 py-2 font-medium capitalize text-slate-700">
                  {column}
                </th>
              ))}
              <th className="px-3 py-2 font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                {tableColumns.map((column) => (
                  <td key={column} className="px-3 py-2 text-slate-700">
                    {String(item[column] ?? '-')}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(item)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={tableColumns.length + 1} className="px-3 py-6 text-center text-slate-500">
                  No records found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        SCTR&apos;s Pune Institute of Computer Technology • Admin Portal
      </div>
    </div>
  )
}

export default CrudCollectionPage
