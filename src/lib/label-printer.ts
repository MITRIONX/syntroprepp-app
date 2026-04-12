import * as Print from 'expo-print'
import AsyncStorage from '@react-native-async-storage/async-storage'

const PRINTER_URL_KEY = 'syntroprepp_printer_url'

export async function getPrinterUrl(): Promise<string | null> {
  return AsyncStorage.getItem(PRINTER_URL_KEY)
}

export async function setPrinterUrl(url: string) {
  await AsyncStorage.setItem(PRINTER_URL_KEY, url)
}

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

  // Zeile 1: Nummer gross, Zeile 2: Name/Begriff
  const titleLine = data.kistenName
    ? `${data.kistenNummer} - ${data.kistenName}`
    : data.kistenNummer

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: 102mm auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 5mm 6mm;
      font-family: Arial, Helvetica, sans-serif;
      width: 90mm;
      color: #000;
    }
    .line1 {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 1px;
      line-height: 1.1;
      border-bottom: 3px solid #000;
      padding-bottom: 3mm;
    }
    .line2 {
      font-size: 16px;
      color: #333;
      margin-top: 2mm;
      font-weight: 600;
    }
    .inhalt {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 1px solid #ccc;
    }
    .inhalt-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 1mm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 1px 0;
      font-size: 10px;
    }
    .footer {
      margin-top: 2mm;
      font-size: 8px;
      color: #bbb;
      text-align: right;
    }
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

export async function printKistenLabel(data: LabelData): Promise<void> {
  const html = generateLabelHtml(data)
  const printerUrl = await getPrinterUrl()

  if (printerUrl) {
    await Print.printAsync({
      html,
      printerUrl,
      width: 102 * 2.835, // 102mm in points (1mm = 2.835pt)
    })
  } else {
    // Fallback: system print dialog (user selects printer)
    await Print.printAsync({
      html,
      width: 102 * 2.835,
    })
  }
}

export async function selectPrinter(): Promise<Print.Printer | null> {
  try {
    const printer = await Print.selectPrinterAsync()
    if (printer?.url) {
      await setPrinterUrl(printer.url)
    }
    return printer
  } catch {
    return null
  }
}
