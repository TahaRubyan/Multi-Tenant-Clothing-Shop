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
      const tempFile = path.join(os.tmpdir(), `raw_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
      fs.writeFileSync(tempFile, content, 'utf8');

      const psScript = `
Add-Type -TypeDefinition @"
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
$content = [System.IO.File]::ReadAllText('${tempFile.replace(/\\/g, '\\\\')}')
$res = [RawPrinter]::SendStringToPrinter('${printerName.replace(/'/g, "''")}', $content)
Write-Output "SUCCESS:$res"
`;

      execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], (err, stdout) => {
        try { fs.unlinkSync(tempFile); } catch (_) {}
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
  if (deviceName && /epl|gk888|gc420|2844|2824/i.test(deviceName)) {
    return true;
  }
  if (cachedIsEpl !== null) return cachedIsEpl;
  try {
    const { execSync } = require('child_process');
    const out = execSync('powershell -NoProfile -Command "(Get-ItemProperty -Path \'HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\USBPRINT\\*\\*\' -ErrorAction SilentlyContinue).FriendlyName"', { encoding: 'utf8', timeout: 2000 });
    cachedIsEpl = /gk888|epl|2844|gc420/i.test(out);
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

    const labelRegex = /label|barcode|sticker|xp-?3|gp-?1|gp-?2|gp-?3|tsc|zebra|zdesigner|zpl|epl|cpl|imz|mz\d|zd\d|gx\d|gk\d|gt\d|tlp|lp2|4bar|hprt|postek|godex|argox|gprinter|dymo|brother.*ql|intermec|datamax|bk-?l/i;
    const receiptRegex = /receipt|pos-?80|xp-?80|tm-?t|thermal.*80|rp80|xprinter.*8|epson|star.*tsp|citizen|bixolon|srp|sam4s|58|xp-?58|pos-?58/i;
    const physicalPrinters = sysPrinters.filter(p => !/pdf|onenote|xps|fax/i.test(p.name));

    if (type === 'label') {
      const labelMatch = physicalPrinters.find(p => labelRegex.test(p.name));
      if (labelMatch) return labelMatch.name;
      const receiptMatch = physicalPrinters.find(p => receiptRegex.test(p.name));
      if (receiptMatch && physicalPrinters.length >= 2) {
        const other = physicalPrinters.find(p => p.name !== receiptMatch.name);
        if (other) return other.name;
      }
    } else if (type === 'receipt') {
      const receiptMatch = physicalPrinters.find(p => receiptRegex.test(p.name));
      if (receiptMatch) return receiptMatch.name;
      const labelMatch = physicalPrinters.find(p => labelRegex.test(p.name));
      if (labelMatch && physicalPrinters.length >= 2) {
        const other = physicalPrinters.find(p => p.name !== labelMatch.name);
        if (other) return other.name;
      }
    }

    const def = sysPrinters.find(p => p.isDefault) || physicalPrinters[0] || sysPrinters[0];
    return def ? def.name : requestedName;
  } catch (err) {
    console.warn('Printer resolution warning:', err);
    return requestedName;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    title: 'SHAAN Multi-Tenant Clothing & Garments POS',
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

ipcMain.handle('print-direct', async (event, { html, zpl, epl, deviceName, type = 'any', silent = true, pageSize }) => {
  try {
    const resolvedDevice = await resolvePrinterName(deviceName, type);
    const isZebra = resolvedDevice && /zdesigner|zpl|zebra|imz|gk888|epl|gc420|2844|2824/i.test(resolvedDevice);

    // If target is a Zebra / EPL printer and EPL or ZPL code is supplied, route raw commands directly to hardware spooler
    if (isZebra && (epl || zpl)) {
      const isEpl = Boolean(epl && detectEplHardware(resolvedDevice));
      const rawPayload = isEpl ? epl : (zpl || epl);
      const docName = isEpl ? 'EPL Barcode Label' : 'ZPL Barcode Label';
      console.log(`Routing raw ${isEpl ? 'EPL' : 'ZPL'} print job directly to hardware: ${resolvedDevice}`);

      const rawRes = await rawPrint(resolvedDevice, rawPayload, docName);
      if (rawRes.success) {
        return { success: true, method: isEpl ? 'epl-raw' : 'zpl-raw', deviceName: resolvedDevice };
      }
      console.warn(`Raw ${isEpl ? 'EPL' : 'ZPL'} print returned false, falling back to GDI raster window...`);
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
