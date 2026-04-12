import * as Print from 'expo-print'
import Zeroconf from 'react-native-zeroconf'
import AsyncStorage from '@react-native-async-storage/async-storage'

// --- Types ---

export interface NetworkPrinter {
  name: string
  host: string
  port: number
}

export interface PrinterAssignment {
  context: string
  printer: NetworkPrinter
}

// --- Discovery ---

export function discoverPrinters(timeoutMs = 5000): Promise<NetworkPrinter[]> {
  return new Promise((resolve) => {
    const zeroconf = new Zeroconf()
    const found: NetworkPrinter[] = []

    zeroconf.on('resolved', (service: any) => {
      if (service.host && service.port) {
        const existing = found.find(p => p.host === service.host && p.port === service.port)
        if (!existing) {
          found.push({
            name: service.name || service.host,
            host: service.host,
            port: service.port,
          })
        }
      }
    })

    zeroconf.scan('ipp', 'tcp', 'local.')

    setTimeout(() => {
      zeroconf.stop()
      zeroconf.removeAllListeners()
      resolve(found)
    }, timeoutMs)
  })
}

// --- Assignments ---

const PRINTER_STORAGE_KEY = '@syntroprepp_printers'

export async function loadAssignments(): Promise<PrinterAssignment[]> {
  const json = await AsyncStorage.getItem(PRINTER_STORAGE_KEY)
  return json ? JSON.parse(json) : []
}

export async function saveAssignment(context: string, printer: NetworkPrinter): Promise<void> {
  const assignments = await loadAssignments()
  const idx = assignments.findIndex(a => a.context === context)
  if (idx >= 0) {
    assignments[idx].printer = printer
  } else {
    assignments.push({ context, printer })
  }
  await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(assignments))
}

export async function removeAssignment(context: string): Promise<void> {
  const assignments = await loadAssignments()
  const filtered = assignments.filter(a => a.context !== context)
  await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(filtered))
}

export async function getPrinterForContext(context: string): Promise<NetworkPrinter | null> {
  const assignments = await loadAssignments()
  const match = assignments.find(a => a.context === context)
  return match?.printer || null
}

// --- IPP Print ---

class IppEncoder {
  private parts: number[] = []

  writeInt8(v: number) { this.parts.push(v & 0xff) }
  writeInt16(v: number) { this.parts.push((v >> 8) & 0xff, v & 0xff) }
  writeInt32(v: number) { this.parts.push((v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff) }

  writeAttribute(tag: number, name: string, value: string) {
    this.writeInt8(tag)
    this.writeInt16(name.length)
    for (let i = 0; i < name.length; i++) this.parts.push(name.charCodeAt(i))
    const valueBytes = new TextEncoder().encode(value)
    this.writeInt16(valueBytes.length)
    for (const b of valueBytes) this.parts.push(b)
  }

  toBuffer(): Uint8Array {
    return new Uint8Array(this.parts)
  }
}

export async function printPdf(printer: NetworkPrinter, pdfBase64: string): Promise<{ success: boolean; error?: string }> {
  try {
    const binaryString = atob(pdfBase64)
    const pdfBytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      pdfBytes[i] = binaryString.charCodeAt(i)
    }

    const ippUrl = `http://${printer.host}:${printer.port}/ipp/print`

    const encoder = new IppEncoder()
    encoder.writeInt8(1)
    encoder.writeInt8(1)
    encoder.writeInt16(0x0002) // Print-Job
    encoder.writeInt32(1)
    encoder.writeInt8(0x01)
    encoder.writeAttribute(0x47, 'attributes-charset', 'utf-8')
    encoder.writeAttribute(0x48, 'attributes-natural-language', 'de')
    encoder.writeAttribute(0x45, 'printer-uri', ippUrl)
    encoder.writeAttribute(0x49, 'document-format', 'application/pdf')
    encoder.writeInt8(0x02)
    encoder.writeAttribute(0x42, 'job-name', 'SyntroPrepp Etikett')
    encoder.writeInt8(0x03)

    const ippHeader = encoder.toBuffer()
    const fullBody = new Uint8Array(ippHeader.length + pdfBytes.length)
    fullBody.set(ippHeader)
    fullBody.set(pdfBytes, ippHeader.length)

    const response = await fetch(ippUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/ipp' },
      body: fullBody,
    })

    if (response.ok) {
      return { success: true }
    }
    return { success: false, error: `HTTP ${response.status}` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// --- Label HTML ---

interface LabelData {
  kistenNummer: string
  kistenName: string | null
  lagerort: string | null
}

function generateLabelHtml(data: LabelData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: 102mm auto; margin: 0; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; width: 102mm; color: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .nummer { font-size: 80px; font-weight: 900; letter-spacing: 3px; line-height: 1.0; padding-top: 4mm; }
    .name { font-size: 28px; font-weight: 600; color: #222; margin-top: 2mm; padding-bottom: 4mm; }
  </style>
</head>
<body>
  <div class="nummer">${data.kistenNummer}</div>
  ${data.kistenName ? `<div class="name">${data.kistenName}</div>` : ''}
</body>
</html>`
}

// --- Print Label ---

export async function printKistenLabel(data: LabelData): Promise<void> {
  const printer = await getPrinterForContext('kisten-etikett')

  // 102mm = 289 points (1mm = 2.835pt)
  // Height: nummer gross + name
  const heightMm = data.kistenName ? 45 : 32
  const widthPt = Math.round(102 * 2.835)  // 289pt
  const heightPt = Math.round(heightMm * 2.835)

  const html = generateLabelHtml(data)

  // Android system print dialog - user selects printer there, Android remembers it
  await Print.printAsync({ html, width: widthPt, height: heightPt })
}

export async function printTestLabel(): Promise<void> {
  await printKistenLabel({
    kistenNummer: 'TEST-001',
    kistenName: 'Suessigkeiten',
    lagerort: null,
  })
}
