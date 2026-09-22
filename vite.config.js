import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFile, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Helper: Query Windows physical and virtual printers
function getWindowsPrinters() {
  return new Promise((resolve) => {
    const psCmd = 'Get-Printer | Select-Object Name, DriverName, PortName, PrinterStatus | ConvertTo-Json -Compress';
    execFile('powershell', ['-NoProfile', '-Command', psCmd], { timeout: 4000 }, (err, stdout) => {
      if (err || !stdout) {
        return resolve([
          { name: 'BIXOLON SRP-Q302', driverName: 'BIXOLON SRP-Q302' },
          { name: 'ZDesigner iMZ220 (ZPL)', driverName: 'ZDesigner iMZ220 (ZPL)' }
        ]);
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const formatted = list.map(p => ({
          name: p.Name,
          driverName: p.DriverName,
          portName: p.PortName,
          status: p.PrinterStatus,
        }));
        resolve(formatted);
      } catch (_) {
        resolve([
          { name: 'BIXOLON SRP-Q302', driverName: 'BIXOLON SRP-Q302' },
          { name: 'ZDesigner iMZ220 (ZPL)', driverName: 'ZDesigner iMZ220 (ZPL)' }
        ]);
      }
    });
  });
}

// Helper: Check if hardware is Zebra EPL
let cachedIsEpl = null;
function detectEplHardware(deviceName) {
  if (deviceName && /epl|gk888|gc420|2844|2824/i.test(deviceName)) return true;
  if (cachedIsEpl !== null) return cachedIsEpl;
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBPRINT\\*\\*\' -ErrorAction SilentlyContinue).FriendlyName"',
      { encoding: 'utf8', timeout: 2000 }
    );
    cachedIsEpl = /gk888|epl|2844|gc420/i.test(out);
  } catch (_) {
    cachedIsEpl = false;
  }
  return cachedIsEpl;
}

// Helper: Send raw printer command text directly via Windows spooler
function rawPrint(printerName, content, docName = 'Thermal Barcode Label') {
  return new Promise((resolve) => {
    try {
      const tempContentFile = path.join(os.tmpdir(), `raw_data_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
      const tempPs1File = path.join(os.tmpdir(), `raw_spool_${Date.now()}_${Math.random().toString(36).slice(2)}.ps1`);
      
      fs.writeFileSync(tempContentFile, content, 'utf8');

      const psScript = `Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
    public static bool SendStringToPrinter(string szPrinterName, string szString) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        bool bSuccess = false;
        di.pDocName = "${docName}";
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pBytes = Marshal.StringToCoTaskMemAnsi(szString);
                    int dwCount = szString.Length;
                    int dwWritten = 0;
                    bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                    Marshal.FreeCoTaskMem(pBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return bSuccess;
    }
}
"@
$rawContent = [System.IO.File]::ReadAllText('${tempContentFile.replace(/\\/g, '\\\\')}')
$res = [RawPrinter]::SendStringToPrinter('${printerName.replace(/'/g, "''")}', $rawContent)
Write-Output "SUCCESS:$res"
`;

      fs.writeFileSync(tempPs1File, psScript, 'utf8');

      execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tempPs1File], (err, stdout) => {
        try { fs.unlinkSync(tempContentFile); } catch (_) {}
        try { fs.unlinkSync(tempPs1File); } catch (_) {}
        if (err) {
          console.warn('Vite rawPrint error:', err);
          return resolve({ success: false, error: err.message });
        }
        const ok = stdout && stdout.includes('SUCCESS:True');
        resolve({ success: ok });
      });
    } catch (e) {
      console.warn('Vite rawPrint exception:', e);
      resolve({ success: false, error: e.message });
    }
  });
}

// Helper: Resolve printer name from available system printers
async function resolvePrinterName(requestedName, type = 'any') {
  try {
    const sysPrinters = await getWindowsPrinters();
    if (!Array.isArray(sysPrinters) || sysPrinters.length === 0) {
      return type === 'label' ? 'ZDesigner iMZ220 (ZPL)' : 'BIXOLON SRP-Q302';
    }

    const labelRegex = /zdesigner|imz|zpl|epl|zebra|gk888|gc420|2844|2824|label|sticker|barcode|xp-?3|tsc|ttp|gprinter|gp-?3|4barcode|xprinter.*3|honeywell|godex|argox|citizen.*cl/i;
    const receiptRegex = /bixolon|srp|receipt|pos-?80|xp-?80|tm-?t|thermal.*80|rp80|xprinter.*8|epson|star.*tsp|citizen|sam4s|58|xp-?58|pos-?58|hprt|rongta|senor|black.*copper/i;
    const physicalPrinters = sysPrinters.filter(p => !/pdf|onenote|xps|fax/i.test(p.name));

    // STRICT TYPE ENFORCEMENT: Never allow label type to resolve to receipt printer, and vice versa
    if (type === 'label') {
      if (requestedName && labelRegex.test(requestedName)) {
        const match = sysPrinters.find(p => p.name.toLowerCase() === requestedName.toLowerCase());
        if (match) return match.name;
      }
      const labelMatch = physicalPrinters.find(p => labelRegex.test(p.name) && !receiptRegex.test(p.name)) || physicalPrinters.find(p => labelRegex.test(p.name));
      if (labelMatch) return labelMatch.name;
      return 'ZDesigner iMZ220 (ZPL)';
    }

    if (type === 'receipt') {
      if (requestedName && receiptRegex.test(requestedName)) {
        const match = sysPrinters.find(p => p.name.toLowerCase() === requestedName.toLowerCase());
        if (match) return match.name;
      }
      const receiptMatch = physicalPrinters.find(p => receiptRegex.test(p.name) && !labelRegex.test(p.name)) || physicalPrinters.find(p => receiptRegex.test(p.name));
      if (receiptMatch) return receiptMatch.name;
      return 'BIXOLON SRP-Q302';
    }

    // Exact match fallback
    const exact = sysPrinters.find(p => p.name === requestedName);
    if (exact) return exact.name;

    return requestedName || 'BIXOLON SRP-Q302';
  } catch (_) {
    return type === 'label' ? 'ZDesigner iMZ220 (ZPL)' : 'BIXOLON SRP-Q302';
  }
}

// Hardware Print Bridge Vite Plugin
function hardwarePrintBridge() {
  return {
    name: 'hardware-print-bridge',
    configureServer(server) {
      // 1. GET /api/printers
      server.middlewares.use('/api/printers', async (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'GET') {
          try {
            const printers = await getWindowsPrinters();
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(printers));
          } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: e.message }));
          }
        }
        next();
      });

      // 2. POST /api/print-direct
      server.middlewares.use('/api/print-direct', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const { zpl, epl, escpos, html, deviceName, type = 'any' } = data;
              const resolvedDevice = await resolvePrinterName(deviceName, type);

              // 1. Label Printing (Strictly ZDesigner / Zebra GK888t)
              if (type === 'label' || (type !== 'receipt' && (epl || zpl))) {
                const targetPrinter = resolvedDevice || 'ZDesigner iMZ220 (ZPL)';
                const isEpl = Boolean(epl && detectEplHardware(targetPrinter));
                const payload = isEpl ? epl : (zpl || epl);
                const docName = isEpl ? 'EPL Barcode Label' : 'ZPL Barcode Label';
                console.log(`[Vite Hardware Bridge] Printing raw ${isEpl ? 'EPL' : 'ZPL'} to label printer: ${targetPrinter}`);
                const result = await rawPrint(targetPrinter, payload, docName);
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: result.success, method: isEpl ? 'epl-raw' : 'zpl-raw', deviceName: targetPrinter }));
              }

              // 2. Thermal Receipt Printing (Strictly BIXOLON SRP-Q302)
              if (type === 'receipt' || escpos) {
                const targetPrinter = resolvedDevice || 'BIXOLON SRP-Q302';
                const payload = escpos || html || '';
                console.log(`[Vite Hardware Bridge] Printing raw ESC/POS to receipt printer: ${targetPrinter}`);
                const result = await rawPrint(targetPrinter, payload, 'Thermal POS Receipt');
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: result.success, method: 'escpos-raw', deviceName: targetPrinter }));
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, method: 'fallback-handled', deviceName: resolvedDevice }));
            } catch (err) {
              console.error('[Vite Hardware Bridge] Error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), hardwarePrintBridge()],
  base: './',
  server: {
    port: 3000,
  },
});
