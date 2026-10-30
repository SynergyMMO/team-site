import { useState, useRef, useCallback } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import styles from './CounterGenerator.module.css'

export default function CounterGenerator() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Counter Generator', url: '/counter-generator' }
  ];

  useDocumentHead({
    title: 'Encounter Counter Generator',
    description: 'Create a custom PokeMMO encounter counter theme. Pick Pokemon, colours and layouts, then export a ready-to-use counter for your shiny hunts.',
    canonicalPath: '/counter-generator/',
    breadcrumbs
  })

  const [status, setStatus] = useState('')
  const [generateEnabled, setGenerateEnabled] = useState(false)
  const loadedFileRef = useRef(null)

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return

    loadedFileRef.current = file
    setStatus('File loaded. Press Generate to process.')
    setGenerateEnabled(true)
  }, []) 
 
  const resizeToBlob = useCallback((fileOrBlob, width, height) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(fileOrBlob)

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        ctx.clearRect(0, 0, width, height)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        }, 'image/png')
      }

      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Image load failed'))
      }

      img.src = url
    })
  }, [])

  const handleGenerate = useCallback(async () => {
    const file = loadedFileRef.current
    if (!file) {
      setStatus('Please upload a GIF or PNG first.')
      return
    }

    const w = Number(document.getElementById('gifWidth').value) || 300
    const h = Number(document.getElementById('gifHeight').value) || 250
    const userDuration = Number(document.getElementById('frameDuration').value) || 100

    setStatus('Processing frames...')

    try {
      const { parseGIF, decompressFrames } = await import('gifuct-js')
      const JSZip = (await import('jszip')).default

      let frames = []

      if (file.type === 'image/gif') {
        const gif = parseGIF(await file.arrayBuffer())
        const gifFrames = decompressFrames(gif, true)
        const width = gif.lsd.width
        const height = gif.lsd.height

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        let fullFrame = new Uint8ClampedArray(width * height * 4)
        let restoreFrame = null
        let previousDisposal = 0
        let previousFrameInfo = null

        for (let i = 0; i < gifFrames.length; i++) {
          const frame = gifFrames[i]
          const info = frame.dims

          if (previousDisposal === 2) {
            const { left, top, width: frameWidth, height: frameHeight } = previousFrameInfo
            for (let row = top; row < top + frameHeight; row++) {
              const start = (row * width + left) * 4
              fullFrame.fill(0, start, start + frameWidth * 4)
            }
            ctx.clearRect(left, top, frameWidth, frameHeight)
          } else if (previousDisposal === 3 && restoreFrame) {
            fullFrame.set(restoreFrame)
            ctx.putImageData(new ImageData(fullFrame, width, height), 0, 0)
          }

          if (frame.disposalType === 3) {
            restoreFrame = new Uint8ClampedArray(fullFrame)
          }

          // Composite the patch (putImageData would overwrite with transparent pixels)
          const patchCanvas = document.createElement('canvas')
          patchCanvas.width = info.width
          patchCanvas.height = info.height
          patchCanvas.getContext('2d').putImageData(new ImageData(frame.patch, info.width, info.height), 0, 0)
          ctx.drawImage(patchCanvas, info.left, info.top)
          fullFrame = new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data)

          const resizedCanvas = document.createElement('canvas')
          resizedCanvas.width = w
          resizedCanvas.height = h
          const rctx = resizedCanvas.getContext('2d')

          rctx.clearRect(0, 0, w, h)
          rctx.imageSmoothingEnabled = true
          rctx.imageSmoothingQuality = 'high'
          rctx.drawImage(canvas, 0, 0, width, height, 0, 0, w, h)

          const blob = await new Promise(res => resizedCanvas.toBlob(res, 'image/png'))

          frames.push({
            name: `frame-${String(i + 1).padStart(5, '0')}.png`,
            blob,
            duration: userDuration
          })

          previousDisposal = frame.disposalType
          previousFrameInfo = info
        }
      } else if (file.type.startsWith('image/')) {
        const blob = await resizeToBlob(file, w, h)
        frames = [{ name: 'frame-00001.png', blob, duration: userDuration }]
      } else {
        throw new Error('Unsupported file type. Please upload a GIF or PNG.')
      }

      setStatus(`Extracted ${frames.length} frames. Loading XML templates...`)

      const fetchXml = (path) => fetch(path).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`)
        return r.text()
      })

      const [counterThemeBottom, infoXML] = await Promise.all([
        fetchXml('/xml/counterThemeBottom.xml'),
        fetchXml('/xml/info.xml'),
      ])

      const zip = new JSZip()
      const base = 'data'
      const animFolder = zip.folder(`${base}/anim`)

      frames.forEach(frame => animFolder.file(frame.name, frame.blob))

      if (frames.length > 0) {
        zip.file('icon.png', frames[0].blob)
      }

      const minimisedFile = document.getElementById('minimisedFile').files[0]
      const miniW = Number(document.getElementById('miniWidth').value) || 100
      const miniH = Number(document.getElementById('miniHeight').value) || 100

      let minimisedBlob = null
      if (minimisedFile) {
        minimisedBlob = await resizeToBlob(minimisedFile, miniW, miniH)
      } else if (frames.length > 0) {
        minimisedBlob = await resizeToBlob(frames[0].blob, miniW, miniH)
      }

      if (minimisedBlob) {
        const unexpandedFolder = zip.folder(`${base}/unexpanded`)
        unexpandedFolder.file('minimised.png', minimisedBlob)
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<themes>\n\n`

      frames.forEach((frame, index) => {
        const frameNumber = String(index + 1).padStart(5, '0')
        xml += `<images file="anim/${frame.name}" filter="nearest">\n`
        xml += `    <area name="bg-${frameNumber}" xywh="*"/>\n`
        xml += `</images>\n\n`
      })

      xml += `    <images>\n        <animation name="encounter_counter_anim" timeSource="enabled">\n\n`

      frames.forEach((frame, index) => {
        const frameNumber = String(index + 1).padStart(5, '0')
        xml += `<frame ref="bg-${frameNumber}" duration="${frame.duration}"/>\n`
      })

      xml += `        </animation>\n    </images>\n\n`
      xml += counterThemeBottom

      zip.file(`${base}/custom-counter.xml`, xml)

      const zipNameValue = document.getElementById('zipName').value.trim() || 'custom-counter'
      const themeName = zipNameValue.replace(/\.zip$/i, '')
      const infoXMLReplaced = infoXML.replace(/\$\{themeName\}/g, themeName)
      zip.file('info.xml', infoXMLReplaced)

      const outputZipName = zipNameValue.endsWith('.zip') ? zipNameValue : zipNameValue + '.zip'
      const content = await zip.generateAsync({ type: 'blob' })

      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = outputZipName
      a.click()

      setStatus('ZIP created successfully!')
    } catch (err) {
      console.error(err)
      setStatus('Error processing file: ' + err.message)
    }
  }, [resizeToBlob])

  return (
    <div className={styles.page}>
      <p className={styles.updateNotice}>
        Currently working, The update limits counters to 13 frames total. This may or may not be a bug, and I hope existing themes from this website will auto-update/fix if they happen to fix this issue. If not, I will update this later and you will need to remake your theme once I do.
      </p>
      <h2>PokeMMO Encounter Counter Generator</h2>

      <div className={styles.formGroup}>
        <label htmlFor="zipFileInput">Upload a gif or image</label>
        <input
          id="zipFileInput"
          type="file"
          accept="image/gif,image/png,image/webp,image/jpeg,image/jpg"
          onChange={handleFileChange}
        />
      </div>

      <div className={`${styles.formGroup} ${styles.sizeGroup}`}>
        <label>Gif/Image Size</label>
        <div className={styles.sizeInputs}>
          <div>
            <span>Width</span>
            <input type="number" id="gifWidth" defaultValue={300} min={1} />
          </div>
          <div>
            <span>Height</span>
            <input type="number" id="gifHeight" defaultValue={250} min={1} />
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="zipName">Theme Name:</label>
        <input type="text" id="zipName" placeholder="Custom Theme.zip" defaultValue="Custom Theme" />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="minimisedFile">Minimised Image (optional):</label>
        <input type="file" id="minimisedFile" accept="image/*" />
      </div>

      <div className={`${styles.formGroup} ${styles.sizeGroup}`}>
        <label>Minimised Image Size</label>
        <div className={styles.sizeInputs}>
          <div>
            <span>Width</span>
            <input type="number" id="miniWidth" defaultValue={200} min={1} />
          </div>
          <div>
            <span>Height</span>
            <input type="number" id="miniHeight" defaultValue={50} min={1} />
          </div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="frameDuration">Frame Duration (ms)</label>
        <input type="number" id="frameDuration" defaultValue={100} min={1} step={1} />
      </div>

      <div className={styles.status}>{status}</div>

      <button
        className={styles.generateBtn}
        disabled={!generateEnabled}
        onClick={handleGenerate}
      >
        Generate XML & Zip
      </button>
    </div>
  )
}