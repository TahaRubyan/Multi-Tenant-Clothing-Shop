const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

// Helper: Send raw printer command text directly via Windows spooler
function rawPrint(printerName, content, docName = 'Barcode Label') {
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
          console.warn('Raw print error:', err);
          return resolve({ success: false, error: err.message });
        }
        const ok = stdout && stdout.includes('SUCCESS:True');
        resolve({ success: ok });
      });
    } catch (e) {
      console.warn('Raw print exception:', e);
      resolve({ success: false, error: e.message });
    }
  });
}

// Keep rawPrintZpl alias for backward compatibility
const rawPrintZpl = rawPrint;

let cachedIsEpl = null;
function detectEplHardware(deviceName) {
  if (deviceName && /epl|gk888|gc420|2844|2824|xp-?3|tsc|ttp|gprinter|gp-?3|4barcode/i.test(deviceName)) {
    return true;
  }
  if (cachedIsEpl !== null) return cachedIsEpl;
  try {
    const { execSync } = require('child_process');
    const out = execSync('powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBPRINT\\*\\*\' -ErrorAction SilentlyContinue).FriendlyName"', { encoding: 'utf8', timeout: 2000 });
    cachedIsEpl = /gk888|epl|2844|gc420|2824/i.test(out);
  } catch (_) {
    cachedIsEpl = false;
  }
  return cachedIsEpl;
}

// Helper: Auto-detect and resolve Windows physical printer name
async function resolvePrinterName(requestedName, type = 'any') {
  if (!mainWindow) return requestedName;
  try {
    const sysPrinters = await mainWindow.webContents.getPrintersAsync();
    if (!Array.isArray(sysPrinters) || sysPrinters.length === 0) return requestedName;

    // 1. Exact match
    const exact = sysPrinters.find(p => p.name === requestedName || p.displayName === requestedName);
    if (exact) return exact.name;

    // 2. Partial match if custom name given
    if (requestedName && requestedName !== 'Default System Printer' && !requestedName.startsWith('Default ')) {
      const partial = sysPrinters.find(p =>
        p.name.toLowerCase().includes(requestedName.toLowerCase()) ||
        requestedName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (partial) return partial.name;
    }

    const labelRegex = /zdesigner|imz|zpl|epl|zebra|gk888|gc420|2844|2824|label|sticker|barcode|xp-?3|tsc|ttp|gprinter|gp-?3|4barcode|xprinter.*3|honeywell|godex|argox|citizen.*cl/i;
    const receiptRegex = /bixolon|srp|receipt|pos-?80|xp-?80|tm-?t|thermal.*80|rp80|xprinter.*8|epson|star.*tsp|citizen|sam4s|58|xp-?58|pos-?58|hprt|rongta|senor|black.*copper/i;
    const physicalPrinters = sysPrinters.filter(p => !/pdf|onenote|xps|fax/i.test(p.name));

    // STRICT TYPE ENFORCEMENT: Never allow label type to resolve to receipt printer, and vice versa
    if (type === 'label') {
      if (requestedName && labelRegex.test(requestedName)) {
        const match = sysPrinters.find(p => (p.name || '').toLowerCase() === requestedName.toLowerCase());
        if (match) return match.name;
      }
      const labelMatch = physicalPrinters.find(p => labelRegex.test(p.name) && !receiptRegex.test(p.name)) || physicalPrinters.find(p => labelRegex.test(p.name));
      if (labelMatch) return labelMatch.name;
      return 'ZDesigner iMZ220 (ZPL)';
    }

    if (type === 'receipt') {
      if (requestedName && receiptRegex.test(requestedName)) {
        const match = sysPrinters.find(p => (p.name || '').toLowerCase() === requestedName.toLowerCase());
        if (match) return match.name;
      }
      const receiptMatch = physicalPrinters.find(p => receiptRegex.test(p.name) && !labelRegex.test(p.name)) || physicalPrinters.find(p => receiptRegex.test(p.name));
      if (receiptMatch) return receiptMatch.name;
      return 'BIXOLON SRP-Q302';
    }

    // Exact match fallback
    const fallbackExact = sysPrinters.find(p => p.name === requestedName || p.displayName === requestedName);
    if (fallbackExact) return fallbackExact.name;

    const def = sysPrinters.find(p => p.isDefault) || physicalPrinters[0] || sysPrinters[0];
    return def ? def.name : (requestedName || 'BIXOLON SRP-Q302');
  } catch (err) {
    console.warn('Printer resolution warning:', err);
    return type === 'label' ? 'ZDesigner iMZ220 (ZPL)' : 'BIXOLON SRP-Q302';
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'NOVA MEN AND WOMEN - Smart POS Terminal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#f7f4ed',
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// IPC Handlers for Thermal Hardware & Label Printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers || [];
  } catch (err) {
    console.error('Failed to get printers:', err);
    return [];
  }
});

ipcMain.handle('print-direct', async (event, { html, zpl, epl, escpos, deviceName, type = 'any', silent = true, pageSize }) => {
  try {
    const resolvedDevice = await resolvePrinterName(deviceName, type);

    // 1. Label Printing (Strictly ZDesigner / Zebra GK888t)
    if (type === 'label' || (type !== 'receipt' && (epl || zpl))) {
      const targetPrinter = resolvedDevice || 'ZDesigner iMZ220 (ZPL)';
      const isEpl = Boolean(epl && detectEplHardware(targetPrinter));
      const rawPayload = isEpl ? epl : (zpl || epl);
      const docName = isEpl ? 'EPL Barcode Label' : 'ZPL Barcode Label';
      console.log(`[Electron Hardware Bridge] Routing raw ${isEpl ? 'EPL' : 'ZPL'} to: ${targetPrinter}`);

      const rawRes = await rawPrint(targetPrinter, rawPayload, docName);
      if (rawRes.success) {
        return { success: true, method: isEpl ? 'epl-raw' : 'zpl-raw', deviceName: targetPrinter };
      }
      console.warn(`Raw ${isEpl ? 'EPL' : 'ZPL'} print returned false, falling back to GDI raster window...`);
    }

    // 2. Thermal Receipt Printing (Strictly BIXOLON SRP-Q302)
    if (type === 'receipt' || escpos) {
      const targetPrinter = resolvedDevice || 'BIXOLON SRP-Q302';
      const payload = escpos || html || '';
      console.log(`[Electron Hardware Bridge] Routing raw ESC/POS to receipt printer: ${targetPrinter}`);
      const rawRes = await rawPrint(targetPrinter, payload, 'Thermal POS Receipt');
      if (rawRes.success) {
        return { success: true, method: 'escpos-raw', deviceName: targetPrinter };
      }
    }

    const printWindow = new BrowserWindow({
      show: false,
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
      },
    });

    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html || '');

    return new Promise((resolve) => {
      let isHandled = false;

      const performPrint = () => {
        if (isHandled) return;
        isHandled = true;

        const printOptions = {
          silent: silent !== false,
          printBackground: true,
          margins: { marginType: 'none' },
        };

        if (pageSize && typeof pageSize === 'object') {
          printOptions.pageSize = pageSize;
        }

        if (resolvedDevice && resolvedDevice !== 'Default System Printer') {
          printOptions.deviceName = resolvedDevice;
        }

        printWindow.webContents.print(printOptions, (success, failureReason) => {
          try {
            printWindow.close();
          } catch (_) {}

          if (!success) {
            console.warn('Silent print warning:', failureReason);
            resolve({ success: false, error: failureReason, deviceName: resolvedDevice });
          } else {
            resolve({ success: true, method: 'chromium-raster', deviceName: resolvedDevice });
          }
        });
      };

      printWindow.webContents.once('did-finish-load', async () => {
        try {
          await printWindow.webContents.executeJavaScript('document.body.offsetHeight');
        } catch (_) {}
        setTimeout(performPrint, 250);
      });

      // Fallback timeout in case did-finish-load is delayed
      setTimeout(() => {
        if (!isHandled) performPrint();
      }, 2000);

      printWindow.loadURL(dataUrl).catch((err) => {
        try {
          printWindow.close();
        } catch (_) {}
        resolve({ success: false, error: err.message });
      });
    });
  } catch (error) {
    console.error('Direct print error:', error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
