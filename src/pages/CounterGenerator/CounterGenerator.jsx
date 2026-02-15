import { useState, useRef, useCallback } from 'react'
import { useDocumentHead } from '../../hooks/useDocumentHead'
import styles from './CounterGenerator.module.css'

export default function CounterGenerator() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Counter Generator', url: '/counter-generator' }
  ];

  useDocumentHead({
    title: 'PokeMMO Counter Theme Generator - Custom Encounter Counters',
    description: 'PokeMMO encounter counter theme generator tool. Upload custom GIFs, resize for counter display, download ready-to-use counter theme packages for shiny hunting sessions.',
    canonicalPath: '/counter-generator',
    breadcrumbs: breadcrumbs
  })

  const [status, setStatus] = useState('')
  const [generateEnabled, setGenerateEnabled] = useState(false)
  const loadedFileRef = useRef(null)

  const handleFileChange = useCallback((e) => {
    loadedFileRef.current = e.target.files[0]
    setStatus('File loaded. Press Generate to process.')
    setGenerateEnabled(true)
  }, [])

  const resizeToBlob = useCallback((fileOrBlob, width, height) => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(fileOrBlob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, width, height)
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        }, 'image/png')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
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

    setStatus('Processing frames...')

    try {
      const { GifReader } = await import('omggif')
      const JSZip = (await import('jszip')).default

      let frames = []

      if (file.type === 'image/gif') {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const reader = new GifReader(bytes)

        const width = reader.width
        const height = reader.height
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        const fullFrameBuffer = new Uint8ClampedArray(width * height * 4)

        for (let i = 0; i < reader.numFrames(); i++) {
          const dims = reader.frameInfo(i)
          reader.decodeAndBlitFrameRGBA(i, fullFrameBuffer)
          const imageData = new ImageData(new Uint8ClampedArray(fullFrameBuffer), width, height)
          ctx.putImageData(imageData, 0, 0)

          const resizedCanvas = document.createElement('canvas')
          resizedCanvas.width = w
          resizedCanvas.height = h
          const rctx = resizedCanvas.getContext('2d')
          rctx.imageSmoothingEnabled = true
          rctx.imageSmoothingQuality = 'high'
          rctx.drawImage(canvas, 0, 0, width, height, 0, 0, w, h)

          const blob = await new Promise(res => resizedCanvas.toBlob(res, 'image/png'))
          const duration = (dims.delay || 10) * 10

          frames.push({
            name: `frame-${String(i + 1).padStart(5, '0')}.png`,
            blob,
            duration,
          })
        }
      } else if (file.type.startsWith('image/')) {
        const blob = await resizeToBlob(file, w, h)
        frames = [{ name: 'frame-00001.png', blob, duration: 100 }]
      } else {
        throw new Error('Unsupported file type. Please upload a GIF or PNG.')
      }

      setStatus(`Extracted ${frames.length} frames. Loading XML templates...`)

      const [counterThemeBottom, themeXMLContent, infoXML] = await Promise.all([
        fetch('/xml/counterThemeBottom.xml').then(r => r.text()),
        fetch('/xml/themeContent.xml').then(r => r.text()),
        fetch('/xml/info.xml').then(r => r.text()),
      ])

      const zip = new JSZip()
      const base = 'data/themes/default'
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

      // Generate counter XML
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
      zip.file(`${base}/theme.xml`, themeXMLContent)

      const zipNameValue = document.getElementById('zipName').value.trim() || 'custom-counter'
      const themeName = zipNameValue.replace(/\.zip$/i, '')
      const infoXMLReplaced = infoXML.replace('${themeName}', themeName)
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
