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
  artikel: { name: string; menge: number }[]
  datum: string
}

function generateLabelHtml(data: LabelData): string {
  const artikelRows = data.artikel.map(a =>
    `<tr><td style="padding:2px 0;font-size:11px;">${a.name}</td><td style="padding:2px 0;font-size:11px;text-align:right;white-space:nowrap;">x${a.menge}</td></tr>`
  ).join('')

  const titleLine = data.kistenName
    ? `${data.kistenNummer} - ${data.kistenName}`
    : data.kistenNummer

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: 102mm auto; margin: 0; }
    body { margin: 0; padding: 5mm 6mm; font-family: Arial, Helvetica, sans-serif; width: 90mm; color: #000; }
    .line1 { font-size: 36px; font-weight: 900; letter-spacing: 1px; line-height: 1.1; border-bottom: 3px solid #000; padding-bottom: 3mm; }
    .line2 { font-size: 16px; color: #333; margin-top: 2mm; font-weight: 600; }
    .inhalt { margin-top: 3mm; padding-top: 2mm; border-top: 1px solid #ccc; }
    .inhalt-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 1mm; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; font-size: 10px; }
    .footer { margin-top: 2mm; font-size: 8px; color: #bbb; text-align: right; }
  </style>
</head>
<body>
  <div class="line1">${titleLine}</div>
  ${data.lagerort ? `<div class="line2">${data.lagerort}</div>` : ''}
  ${data.artikel.length > 0 ? `
    <div class="inhalt">
      <div class="inhalt-title">Inhalt (${data.artikel.length})</div>
      <table>${artikelRows}</table>
    </div>
  ` : ''}
  <div class="footer">${data.datum}</div>
</body>
</html>`
}

// --- Print Label ---

export async function printKistenLabel(data: LabelData): Promise<void> {
  const printer = await getPrinterForContext('kisten-etikett')

  if (printer) {
    // Direct IPP printing: generate PDF from HTML, then send via IPP
    const { uri } = await Print.printToFileAsync({ html: generateLabelHtml(data) })
    // Read file as base64
    const FileSystem = require('expo-file-system')
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
    const result = await printPdf(printer, base64)
    if (!result.success) throw new Error(result.error)
  } else {
    // Fallback: system print dialog
    await Print.printAsync({ html: generateLabelHtml(data) })
  }
}

export async function printTestLabel(): Promise<void> {
  await printKistenLabel({
    kistenNummer: 'TEST-001',
    kistenName: 'Testdruck',
    lagerort: 'Keller',
    artikel: [
      { name: 'Testartikel 1', menge: 3 },
      { name: 'Testartikel 2', menge: 1 },
    ],
    datum: new Date().toLocaleDateString('de-DE'),
  })
}
