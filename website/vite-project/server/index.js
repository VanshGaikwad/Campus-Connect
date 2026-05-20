import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import ImageKit from 'imagekit'
import process from 'node:process'

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
const port = process.env.PORT || 4000

const pickEnv = (...keys) => {
  for (const key of keys) {
    if (process.env[key]) {
      return process.env[key]
    }
  }
  return ''
}

const imageKitConfig = {
  publicKey: pickEnv('IMAGEKIT_PUBLIC_KEY', 'VITE_IMAGEKIT_PUBLIC_KEY'),
  privateKey: pickEnv('IMAGEKIT_PRIVATE_KEY'),
  urlEndpoint:
    pickEnv('IMAGEKIT_URL_ENDPOINT', 'VITE_IMAGEKIT_URL_ENDPOINT') || 'https://ik.imagekit.io/bo87hf1qt',
}

const imageKitMissingVars = Object.entries(imageKitConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

const imagekit = imageKitMissingVars.length
  ? null
  : new ImageKit({
      publicKey: imageKitConfig.publicKey,
      privateKey: imageKitConfig.privateKey,
      urlEndpoint: imageKitConfig.urlEndpoint,
    })

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, imagekitConfigured: Boolean(imagekit) })
})

app.post('/api/imagekit/upload', upload.single('file'), async (req, res) => {
  try {
    if (!imagekit) {
      return res.status(500).json({
        message: `ImageKit server is not configured. Missing env vars: ${imageKitMissingVars.join(', ')}`,
      })
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required.' })
    }

    const folder = req.body.folder || '/uploads'
    const fileName = req.body.fileName || req.file.originalname

    const uploaded = await imagekit.upload({
      file: req.file.buffer.toString('base64'),
      fileName,
      folder,
      useUniqueFileName: true,
    })

    return res.json({
      url: uploaded.url,
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
      name: uploaded.name,
      thumbnailUrl: uploaded.thumbnailUrl,
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message || 'ImageKit upload failed.',
    })
  }
})

app.listen(port, () => {
  if (imageKitMissingVars.length) {
    console.error(`ImageKit config missing: ${imageKitMissingVars.join(', ')}`)
    console.error('Create .env.server.local with IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT')
  }

  console.log(`ImageKit server running on http://localhost:${port}`)
})
