"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Eraser, Trash2, Undo, Redo } from "lucide-react"
import { Button } from "@/components/ui/button"
import JSZip from "jszip"

type Tool = "brush" | "eraser"
type PixelGrid = string[][]

const GRID_WIDTH = 96
const GRID_HEIGHT = 64
const DEFAULT_COLOR = "#3B3B3B"
const ACTIVE_COLOR = "#F4EADD"
const HOVER_COLOR = "#787878"

const createInitialGrid = (): PixelGrid =>
  Array(GRID_HEIGHT)
    .fill(null)
    .map(() => Array(GRID_WIDTH).fill(DEFAULT_COLOR))

export default function PixelCanvas() {
  const [pixels, setPixels] = useState<PixelGrid>(createInitialGrid)
  const [history, setHistory] = useState<PixelGrid[]>([createInitialGrid()])
  const [historyIndex, setHistoryIndex] = useState(0)

  const [hoveredPixel, setHoveredPixel] = useState<{ x: number; y: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState<Tool>("brush")
  const [brushPosition, setBrushPosition] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  const addToHistory = useCallback(
    (newPixels: PixelGrid) => {
      setHistory((prevHistory) => {
        const newHistory = prevHistory.slice(0, historyIndex + 1)
        newHistory.push(newPixels)
        return newHistory
      })
      setHistoryIndex((prevIndex) => prevIndex + 1)
    },
    [historyIndex],
  )

  const handlePixelPaint = useCallback(
    (x: number, y: number, prevX: number | null, prevY: number | null) => {
      if (!isDrawing) return

      setPixels((prevPixels) => {
        const newPixels = prevPixels.map((row) => [...row])
        const paintPixel = (px: number, py: number) => {
          if (px >= 0 && px < GRID_WIDTH && py >= 0 && py < GRID_HEIGHT) {
            newPixels[py][px] = currentTool === "brush" ? ACTIVE_COLOR : DEFAULT_COLOR
          }
        }

        paintPixel(x, y)

        if (prevX !== null && prevY !== null) {
          const dx = x - prevX
          const dy = y - prevY
          const steps = Math.max(Math.abs(dx), Math.abs(dy))
          for (let i = 1; i <= steps; i++) {
            const t = i / steps
            const ix = Math.round(prevX + dx * t)
            const iy = Math.round(prevY + dy * t)
            paintPixel(ix, iy)
          }
        }

        addToHistory(newPixels)
        return newPixels
      })
    },
    [isDrawing, currentTool, addToHistory],
  )

  const clearCanvas = useCallback(() => {
    const newPixels = createInitialGrid()
    setPixels(newPixels)
    addToHistory(newPixels)
  }, [addToHistory])

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prevIndex) => prevIndex - 1)
      setPixels(history[historyIndex - 1])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prevIndex) => prevIndex + 1)
      setPixels(history[historyIndex + 1])
    }
  }, [history, historyIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "z") {
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo])

  const saveImage = useCallback(async () => {
    if (!canvasRef.current) return

    try {
      // Create PNG
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const scale = 5
      canvas.width = GRID_WIDTH * 25 * scale
      canvas.height = GRID_HEIGHT * 25 * scale

      pixels.forEach((row, y) => {
        row.forEach((color, x) => {
          ctx.fillStyle = "#0D0D0D"
          ctx.fillRect(x * 25 * scale, y * 25 * scale, 25 * scale, 25 * scale)

          ctx.fillStyle = color
          const path = new Path2D(
            "M6.38787 1.60426C6.69684 1.2953 6.69684 0.794358 6.38787 0.485389C6.07891 0.17642 5.57797 0.17642 5.269 0.485389L3.45493 2.29946L1.64089 0.485416C1.33192 0.176447 0.83098 0.176447 0.522011 0.485416C0.213042 0.794385 0.213042 1.29532 0.522011 1.60429L2.33605 3.41833L0.52201 5.23238C0.213041 5.54135 0.213041 6.04228 0.52201 6.35125C0.830979 6.66022 1.33192 6.66022 1.64089 6.35125L3.45493 4.53721L5.269 6.35128C5.57797 6.66025 6.07891 6.66025 6.38787 6.35128C6.69684 6.04231 6.69684 5.54137 6.38787 5.23241L4.5738 3.41833L6.38787 1.60426Z",
          )
          ctx.save()
          ctx.translate(x * 25 * scale, y * 25 * scale)
          ctx.scale((25 * scale) / 7, (25 * scale) / 7)
          ctx.fill(path)
          ctx.restore()
        })
      })

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve))

      // Create SVG
      const svgNS = "http://www.w3.org/2000/svg"
      const svg = document.createElementNS(svgNS, "svg")
      svg.setAttribute("width", `${GRID_WIDTH * 25}`)
      svg.setAttribute("height", `${GRID_HEIGHT * 25}`)
      svg.setAttribute("viewBox", `0 0 ${GRID_WIDTH * 25} ${GRID_HEIGHT * 25}`)

      pixels.forEach((row, y) => {
        row.forEach((color, x) => {
          const path = document.createElementNS(svgNS, "path")
          path.setAttribute(
            "d",
            "M6.38787 1.60426C6.69684 1.2953 6.69684 0.794358 6.38787 0.485389C6.07891 0.17642 5.57797 0.17642 5.269 0.485389L3.45493 2.29946L1.64089 0.485416C1.33192 0.176447 0.83098 0.176447 0.522011 0.485416C0.213042 0.794385 0.213042 1.29532 0.522011 1.60429L2.33605 3.41833L0.52201 5.23238C0.213041 5.54135 0.213041 6.04228 0.52201 6.35125C0.830979 6.66022 1.33192 6.66022 1.64089 6.35125L3.45493 4.53721L5.269 6.35128C5.57797 6.66025 6.07891 6.66025 6.38787 6.35128C6.69684 6.04231 6.69684 5.54137 6.38787 5.23241L4.5738 3.41833L6.38787 1.60426Z",
          )
          path.setAttribute("fill", color === DEFAULT_COLOR ? "#2A2A2A" : color)
          path.setAttribute("transform", `translate(${x * 25}, ${y * 25}) scale(3.57)`)
          svg.appendChild(path)
        })
      })

      const svgString = new XMLSerializer().serializeToString(svg)
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" })

      // Create zip file
      const zip = new JSZip()
      zip.file("pixel-art.png", pngBlob)
      zip.file("pixel-art.svg", svgBlob)

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = "pixel-art.zip"
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error saving image:", error)
    }
  }, [pixels])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1E1E1E] p-4">
      <div className="border border-[#787878] rounded-lg p-4" style={{ borderWidth: "1.2px" }}>
        <div className="flex flex-col gap-2">
          <div
            ref={canvasRef}
            className="w-[900px] h-[600px] relative border border-[#787878] rounded-sm overflow-hidden"
            style={{ borderWidth: "1.2px" }}
            onMouseDown={(e) => {
              setIsDrawing(true)
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.floor((e.clientX - rect.left) / (900 / GRID_WIDTH))
              const y = Math.floor((e.clientY - rect.top) / (600 / GRID_HEIGHT))
              handlePixelPaint(x, y, null, null)
            }}
            onMouseUp={() => setIsDrawing(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const x = Math.floor((e.clientX - rect.left) / (900 / GRID_WIDTH))
              const y = Math.floor((e.clientY - rect.top) / (600 / GRID_HEIGHT))
              setBrushPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
              if (isDrawing) {
                handlePixelPaint(x, y, hoveredPixel?.x ?? null, hoveredPixel?.y ?? null)
              }
              setHoveredPixel({ x, y })
            }}
            onMouseLeave={() => {
              setIsDrawing(false)
              setBrushPosition(null)
              setHoveredPixel(null)
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${GRID_WIDTH}, 1fr)`,
                width: "100%",
                height: "100%",
              }}
            >
              {pixels.map((row, y) =>
                row.map((color, x) => (
                  <div
                    key={`${x}-${y}`}
                    className="relative"
                    style={{
                      width: "100%",
                      paddingBottom: "100%",
                    }}
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 7 7"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        cursor: "pointer",
                      }}
                    >
                      <path
                        d="M6.38787 1.60426C6.69684 1.2953 6.69684 0.794358 6.38787 0.485389C6.07891 0.17642 5.57797 0.17642 5.269 0.485389L3.45493 2.29946L1.64089 0.485416C1.33192 0.176447 0.83098 0.176447 0.522011 0.485416C0.213042 0.794385 0.213042 1.29532 0.522011 1.60429L2.33605 3.41833L0.52201 5.23238C0.213041 5.54135 0.213041 6.04228 0.52201 6.35125C0.830979 6.66022 1.33192 6.66022 1.64089 6.35125L3.45493 4.53721L5.269 6.35128C5.57797 6.66025 6.07891 6.66025 6.38787 6.35128C6.69684 6.04231 6.69684 5.54137 6.38787 5.23241L4.5738 3.41833L6.38787 1.60426Z"
                        fill={
                          (hoveredPixel?.x === x && hoveredPixel?.y === y) ||
                          (brushPosition &&
                            Math.abs(x - Math.floor(brushPosition.x / (900 / GRID_WIDTH))) <= 0 &&
                            Math.abs(y - Math.floor(brushPosition.y / (600 / GRID_HEIGHT))) <= 0)
                            ? HOVER_COLOR
                            : color === DEFAULT_COLOR
                              ? "#2A2A2A"
                              : color
                        }
                      />
                    </svg>
                  </div>
                )),
              )}
            </div>
            {brushPosition && (
              <svg
                style={{
                  position: "absolute",
                  left: brushPosition.x - 7.5,
                  top: brushPosition.y - 7.5,
                  pointerEvents: "none",
                }}
                width="15"
                height="15"
                viewBox="0 0 15 15"
              >
                <circle cx="7.5" cy="7.5" r="6.5" fill="transparent" stroke="#F4EADD" strokeWidth="1" />
              </svg>
            )}
          </div>

          <div className="flex justify-between w-full gap-48 mt-2">
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                className="w-10 h-10 bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] p-0 group"
                style={{ borderWidth: "1.2px" }}
                onClick={undo}
              >
                <Undo className="w-5 h-5 text-[#787878] group-hover:text-[#F4EADD]" />
              </Button>
              <Button
                variant="outline"
                className="w-10 h-10 bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] p-0 group"
                style={{ borderWidth: "1.2px" }}
                onClick={redo}
              >
                <Redo className="w-5 h-5 text-[#787878] group-hover:text-[#F4EADD]" />
              </Button>
              <div className="w-[1.2px] h-6 bg-[#787878] mx-2" />
              <Button
                variant="outline"
                className={`w-10 h-10 bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] p-0 group ${
                  currentTool === "brush" ? "bg-[#313131]" : ""
                }`}
                style={{ borderWidth: "1.2px" }}
                onClick={() => setCurrentTool("brush")}
              >
                <svg
                  width="20"
                  height="17"
                  viewBox="0 0 20 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={`${currentTool === "brush" ? "text-[#E1D7CB]" : "text-[#787878]"} group-hover:text-[#F4EADD]`}
                >
                  <path
                    d="M20 0.68C20 0.499653 19.9247 0.326692 19.7908 0.199167C19.6568 0.0716426 19.4751 0 19.2857 0C15.3499 0 11.3113 4.22535 9.06841 7.02355C8.26738 6.79001 7.41997 6.73856 6.59426 6.87334C5.76855 7.00811 4.98755 7.32536 4.314 7.79959C3.64044 8.27382 3.0931 8.89182 2.71593 9.60394C2.33877 10.3161 2.1423 11.1025 2.1423 11.9C2.1423 14.5248 0.397606 15.702 0.314568 15.7564C0.187858 15.8379 0.0919443 15.9559 0.0409316 16.0931C-0.010081 16.2303 -0.0135009 16.3795 0.0311748 16.5187C0.0758505 16.6579 0.166264 16.7798 0.289121 16.8664C0.411978 16.953 0.560794 16.9999 0.713688 17H7.49961C8.33737 17 9.16345 16.813 9.91151 16.4539C10.6596 16.0949 11.3087 15.5738 11.8069 14.9326C12.3051 14.2914 12.6383 13.5479 12.7799 12.7619C12.9215 11.9758 12.8674 11.1691 12.6221 10.4065C15.5624 8.27135 20 4.4268 20 0.68ZM7.49961 15.64H2.37713C2.97983 14.8249 3.57092 13.5932 3.57092 11.9C3.57092 11.1603 3.80133 10.4372 4.23302 9.82217C4.66471 9.20713 5.27829 8.72776 5.99617 8.44469C6.71404 8.16162 7.50397 8.08755 8.26606 8.23186C9.02815 8.37617 9.72818 8.73237 10.2776 9.25542C10.8271 9.77847 11.2012 10.4449 11.3528 11.1704C11.5044 11.8959 11.4266 12.6478 11.1293 13.3312C10.8319 14.0146 10.3283 14.5987 9.68228 15.0097C9.03621 15.4207 8.27663 15.64 7.49961 15.64ZM10.3943 7.61175C10.7003 7.23435 11.0006 6.87877 11.2953 6.545C12.0165 7.00885 12.6375 7.60008 13.1248 8.28665C12.7736 8.56658 12.4001 8.85247 12.0042 9.1443C11.588 8.53044 11.0392 8.00801 10.3943 7.61175ZM14.207 7.38395C13.6677 6.65958 13.0035 6.02732 12.2426 5.51395C15.0802 2.5789 17.2204 1.68895 18.4839 1.4416C18.2294 2.6452 17.2901 4.68265 14.207 7.38395Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
              <Button
                variant="outline"
                className={`w-10 h-10 bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] p-0 group ${
                  currentTool === "eraser" ? "bg-[#313131]" : ""
                }`}
                style={{ borderWidth: "1.2px" }}
                onClick={() => setCurrentTool("eraser")}
              >
                <Eraser
                  className={`w-5 h-5 ${currentTool === "eraser" ? "text-[#E1D7CB]" : "text-[#787878]"} group-hover:text-[#F4EADD]`}
                />
              </Button>
              <div className="w-[1.2px] h-6 bg-[#787878] mx-2" />
              <Button
                variant="outline"
                className="w-10 h-10 bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] p-0 group"
                style={{ borderWidth: "1.2px" }}
                onClick={clearCanvas}
              >
                <Trash2 className="w-5 h-5 text-[#787878] group-hover:text-[#F4EADD]" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="bg-[#1E1E1E] border border-[#787878] rounded-sm hover:bg-[#313131] px-8 h-10 text-[#787878] hover:text-[#E1D7CB] text-sm"
              style={{ borderWidth: "1.2px" }}
              onClick={saveImage}
            >
              Save Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

