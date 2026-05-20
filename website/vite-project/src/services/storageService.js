import { deleteObject, ref } from 'firebase/storage'
import { storage } from './firebase'

const uploadViaImageKit = async ({ collectionName, uid, file }) => {
  const uploadEndpoint = import.meta.env.VITE_IMAGEKIT_UPLOAD_ENDPOINT || '/api/imagekit/upload'

  if (!uploadEndpoint) {
    throw new Error('ImageKit upload endpoint missing.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('fileName', file.name)
  formData.append('folder', `/${collectionName}/${uid}`)

  const uploadResponse = await fetch(uploadEndpoint, {
    method: 'POST',
    body: formData,
  })

  if (!uploadResponse.ok) {
    const errorMessage = await uploadResponse.text()
    throw new Error(`ImageKit upload failed: ${errorMessage}`)
  }

  const uploaded = await uploadResponse.json()

  return {
    fileUrl: uploaded.url,
    filePath: uploaded.fileId ? `imagekit:${uploaded.fileId}` : uploaded.filePath,
    fileName: uploaded.name ?? file.name,
  }
}

export const uploadFile = async ({ collectionName, uid, file }) => {
  return uploadViaImageKit({ collectionName, uid, file })
}

export const removeFile = async (filePath) => {
  if (!filePath) {
    return
  }

  if (String(filePath).startsWith('imagekit:')) {
    return
  }

  const fileRef = ref(storage, filePath)
  await deleteObject(fileRef)
}
