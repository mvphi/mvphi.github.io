"use client"

import { useEffect, useRef } from "react"

// This is a utility component that can help generate the pattern from the image
export default function ImageToPattern() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-rLHJ1xioYyZl6UxHRwDQOHcX9y9tMX.png"

    img.onload = () => {
      canvas.width = 101
      canvas.height = 64
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const pattern: [number, number][] = []
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4
          // Check if pixel is light (part of the pattern)
          if (imageData.data[i] > 128) {
            // If red channel is bright
            pattern.push([x, y])
          }
        }
      }

      console.log(JSON.stringify(pattern)) // This will output the pattern array
    }
  }, [])

  return <canvas ref={canvasRef} style={{ display: "none" }} />
}

