/**
 * printUtils.js
 * Isolated printing engine for NOVA POS.
 * Solves white/black blank screen print bugs by generating clean, standalone print documents
 * rendered in an isolated printing frame with zero interference from SPA modal backdrops or layout overflow rules.
 */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Authentic ISO/IEC 15417 Code 128 Patterns (Indices 0 to 106)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

/**
 * Generate genuine ISO/IEC 15417 Code 128 (Set B) scannable barcode vector lines.
 * Universally readable by all 1D laser, CCD, and 2D camera handheld barcode guns.
 */
export function generateBarcodeSvg(code = '000000000000', options = {}) {
  const cleanCode = String(code || '000000000000').trim();
  const height = options.height || 40;
  const moduleWidth = options.moduleWidth || 2;
  const quietZoneModules = 10;

  // Code 128 Set B Start Code = 104
  let checksum = 104;
  const symbols = [104];

  for (let i = 0; i < cleanCode.length; i++) {
    const codePoint = cleanCode.charCodeAt(i);
    // Code 128 Set B supports ASCII 32 (' ') through 126 ('~')
    const val = (codePoint >= 32 && codePoint <= 126) ? (codePoint - 32) : 0;
    symbols.push(val);
    checksum += val * (i + 1);
  }

  const checksumVal = checksum % 103;
  symbols.push(checksumVal);
  symbols.push(106); // Stop code (106)

  let currentX = quietZoneModules * moduleWidth;
  const rects = [];

  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym];
    if (!pattern) continue;

    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10) * moduleWidth;
      const isBar = p % 2 === 0;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000000" shape-rendering="crispEdges" />`);
      }
      currentX += w;
    }
  }

  const totalWidth = currentX + (quietZoneModules * moduleWidth);

  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" style="width: 100%; height: 100%; display: block; shape-rendering: crispEdges;">
    <rect x="0" y="0" width="${totalWidth}" height="${height}" fill="#ffffff" shape-rendering="crispEdges" />
    ${rects.join('')}
  </svg>`;
}

export const LABEL_PRINTER_KEYWORD_REGEX = /zdesigner|imz|zpl|epl|zebra|gk888|gc420|2844|2824|label|sticker|barcode|xp-?3|tsc|ttp|gprinter|gp-?3|4barcode|xprinter.*3|honeywell|godex|argox|citizen.*cl/i;
export const RECEIPT_PRINTER_KEYWORD_REGEX = /bixolon|srp|receipt|pos-?80|xp-?80|tm-?t|thermal.*80|rp80|xprinter.*8|epson|star.*tsp|citizen|sam4s|58|xp-?58|pos-?58|hprt|rongta|senor|black.*copper/i;

/**
 * Automatically identify connected receipt printer and label printer without user pop-ups.
 * Strictly prevents any crossed assignment between receipt and label hardware.
 */
export function autoDetectPrinters(printers = []) {
  let detectedReceipt = null;
  let detectedLabel = null;

  const validPrinters = printers
    .map(p => (typeof p === 'string' ? p : p.name || p.displayName || '').trim())
    .filter(Boolean);

  // 1. Keyword search with strict partition
  for (const name of validPrinters) {
    if (!detectedLabel && LABEL_PRINTER_KEYWORD_REGEX.test(name) && !RECEIPT_PRINTER_KEYWORD_REGEX.test(name)) {
      detectedLabel = name;
    }
    if (!detectedReceipt && RECEIPT_PRINTER_KEYWORD_REGEX.test(name) && !LABEL_PRINTER_KEYWORD_REGEX.test(name)) {
      detectedReceipt = name;
    }
  }

  // 2. Secondary pass if still missing
  for (const name of validPrinters) {
    if (!detectedLabel && LABEL_PRINTER_KEYWORD_REGEX.test(name)) {
      detectedLabel = name;
    }
    if (!detectedReceipt && RECEIPT_PRINTER_KEYWORD_REGEX.test(name)) {
      detectedReceipt = name;
    }
  }

  // 3. Disallow crossed assignment
  if (detectedReceipt && LABEL_PRINTER_KEYWORD_REGEX.test(detectedReceipt)) {
    detectedReceipt = null;
  }
  if (detectedLabel && RECEIPT_PRINTER_KEYWORD_REGEX.test(detectedLabel)) {
    detectedLabel = null;
  }

  // 4. Fallback heuristic for physical devices (ignoring virtual PDF/Fax/OneNote)
  const physicalPrinters = validPrinters.filter(
    n => !/pdf|onenote|xps|fax|default/i.test(n)
  );

  if (physicalPrinters.length >= 2) {
    if (!detectedReceipt && detectedLabel) {
      detectedReceipt = physicalPrinters.find(p => p !== detectedLabel && !LABEL_PRINTER_KEYWORD_REGEX.test(p)) || 'BIXOLON SRP-Q302';
    } else if (!detectedLabel && detectedReceipt) {
      detectedLabel = physicalPrinters.find(p => p !== detectedReceipt && !RECEIPT_PRINTER_KEYWORD_REGEX.test(p)) || 'ZDesigner iMZ220 (ZPL)';
    } else if (!detectedReceipt && !detectedLabel) {
      detectedReceipt = physicalPrinters.find(p => RECEIPT_PRINTER_KEYWORD_REGEX.test(p)) || physicalPrinters[0];
      detectedLabel = physicalPrinters.find(p => p !== detectedReceipt && LABEL_PRINTER_KEYWORD_REGEX.test(p)) || physicalPrinters[1];
    }
  }

  // Final guarantees
  if (!detectedReceipt || LABEL_PRINTER_KEYWORD_REGEX.test(detectedReceipt)) {
    detectedReceipt = validPrinters.find(n => RECEIPT_PRINTER_KEYWORD_REGEX.test(n) && !LABEL_PRINTER_KEYWORD_REGEX.test(n)) || 'BIXOLON SRP-Q302';
  }
  if (!detectedLabel || RECEIPT_PRINTER_KEYWORD_REGEX.test(detectedLabel)) {
    detectedLabel = validPrinters.find(n => LABEL_PRINTER_KEYWORD_REGEX.test(n) && !RECEIPT_PRINTER_KEYWORD_REGEX.test(n)) || 'ZDesigner iMZ220 (ZPL)';
  }

  return { detectedReceipt, detectedLabel };
}

function fallbackIframePrint(htmlContent, shouldTriggerPrint = true) {
  if (!shouldTriggerPrint || typeof document === 'undefined') return;

  const existingFrame = document.getElementById('pos-clean-print-frame');
  if (existingFrame) {
    try { existingFrame.remove(); } catch (_) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-clean-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (e) {
          console.warn('Isolated iframe print error:', e);
        } finally {
          setTimeout(() => {
            try { iframe.remove(); } catch (_) {}
          }, 3000);
        }
      }, 250);
    }
  } catch (err) {
    console.warn('Print iframe write error:', err);
  }
}

function wrapReceiptText(text, maxLen = 44) {
  if (!text) return [];
  const words = String(text).trim().split(/\s+/);
  const result = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= maxLen) {
      cur += ' ' + w;
    } else {
      result.push(cur);
      cur = w;
    }
  }
  if (cur) result.push(cur);
  return result;
}

/**
 * Generates authentic ESC/POS commands for thermal receipt printers (BIXOLON SRP-Q302).
 */
export function generateEscPosReceipt(saleData, shopSettings = {}) {
  if (!saleData) return '';
  const shopName = (shopSettings?.shopName || 'NOVA MEN AND WOMEN').trim();
  const shopLocation = (shopSettings?.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan').trim();
  const shopPhone = (shopSettings?.shopPhone || '+92 300 1234567').trim();
  const footerNote = (shopSettings?.receiptFooterNote || 'Thank you for shopping at NOVA MEN AND WOMEN. Exchanges accepted within 14 days with original receipt.').trim();

  const items = saleData.items || [];
  const subtotal = (saleData.subtotal || 0).toLocaleString();
  const netTotal = (saleData.netTotal || 0).toLocaleString();
  const storewideDiscount = saleData.storewideDiscount || 0;
  const wholeSaleDiscount = saleData.wholeSaleDiscount || 0;
  const wholeSaleDiscountPercent = saleData.wholeSaleDiscountPercent || 0;
  const totalDiscount = (storewideDiscount + wholeSaleDiscount);
  const amountReceived = (saleData.amountReceived || saleData.netTotal || 0).toLocaleString();
  const changeReturned = (saleData.changeReturned || 0).toLocaleString();
  const paymentMethod = saleData.paymentMethod || 'Cash';
  const cashier = saleData.salesman || 'Cashier';
  const dateTime = saleData.dateTime || new Date().toLocaleString();
  const receiptNumber = saleData.receiptNumber || `INV-${Date.now().toString().slice(-6)}`;

  const lines = [];
  lines.push('\x1b@'); // Initialize printer
  // RJ11 / RJ12 Cash Drawer Kick Pulse (Pin 2 & 5, 25ms & 50ms, DLE DC4, Star BEL)
  lines.push('\x1b\x70\x00\x19\xfa');
  lines.push('\x1b\x70\x01\x19\xfa');
  lines.push('\x1b\x70\x00\x32\xff');
  lines.push('\x1b\x70\x01\x32\xff');
  lines.push('\x10\x14\x01\x00\x05');
  lines.push('\x10\x14\x01\x01\x05');
  lines.push('\x07');
  lines.push('\x1ba\x01'); // Center align
  lines.push('\x1b!\x38' + shopName + '\n\x1b!\x00'); // Double-Height, Double-Width, Bold Shop Header
  lines.push('\x1bE\x01TESSLO FASHION RETAIL OS\n\x1bE\x00');

  // Address wrapped cleanly across lines without truncation
  const locationLines = wrapReceiptText(shopLocation, 44);
  locationLines.forEach(l => lines.push(l + '\n'));
  lines.push('Tel: ' + shopPhone + '\n');
  lines.push('------------------------------------------------\n');

  lines.push('\x1ba\x00'); // Left align
  lines.push(`Cashier: ${cashier}\n`);
  const formatRow = (col1, col2) => {
    const c1 = String(col1 || '').slice(0, 24);
    const c2 = String(col2 || '');
    const spaces = Math.max(1, 48 - c1.length - c2.length);
    return `${c1}${' '.repeat(spaces)}${c2}\n`;
  };

  lines.push(formatRow(`Payment: ${paymentMethod}`, `Invoice: ${receiptNumber}`));
  lines.push(`Date:    ${dateTime}\n`);
  lines.push('------------------------------------------------\n');
  lines.push('ARTICLE          QTY     PRICE    DISC     TOTAL\n');
  lines.push('------------------------------------------------\n');

  let itemDiscountsTotal = 0;
  let rawSubtotal = 0;

  for (const it of items) {
    const variantTag = it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece';
    const conciseName = formatConciseArticle(it);
    const fullName = `[${variantTag}] ${conciseName}${it.isReturn ? ' (RET)' : ''}`;
    const nameChunks = wrapReceiptText(fullName, 16);

    const qStr = String(it.qty || 1).padStart(3);
    const pStr = (it.unitPrice || 0).toLocaleString().padStart(8);
    const itemDiscPercent = it.itemDiscountPercent || 0;
    const itemDiscAmt = it.itemDiscount || 0;
    itemDiscountsTotal += itemDiscAmt;
    rawSubtotal += ((it.unitPrice || 0) * (it.qty || 1));
    const lineTotal = it.total !== undefined ? it.total : ((it.unitPrice || 0) * (it.qty || 1)) - itemDiscAmt;
    const tStr = lineTotal.toLocaleString().padStart(9);
    const dStr = itemDiscAmt > 0
      ? (it.itemDiscountMode === 'rupees' ? `Rs${itemDiscAmt}` : `${itemDiscPercent}%`).padStart(6)
      : '-'.padStart(6);

    const firstChunk = (nameChunks[0] || '').padEnd(16);
    lines.push(`${firstChunk} ${qStr} ${pStr} ${dStr}  ${tStr}\n`);

    for (let c = 1; c < nameChunks.length; c++) {
      lines.push(`${nameChunks[c]}\n`);
    }
  }

  const grossSubtotal = rawSubtotal > 0 ? rawSubtotal : (saleData.subtotal || 0) + itemDiscountsTotal;
  const totalOverallBillDiscount = storewideDiscount + wholeSaleDiscount;
  const allDiscountsTotal = itemDiscountsTotal + totalOverallBillDiscount;

  lines.push('------------------------------------------------\n');
  lines.push(formatRow('Gross Total:', `Rs. ${grossSubtotal.toLocaleString()}`));
  if (itemDiscountsTotal > 0) {
    lines.push(formatRow('Item Discount:', `-Rs. ${itemDiscountsTotal.toLocaleString()}`));
  }
  if (totalOverallBillDiscount > 0) {
    const discTitle = wholeSaleDiscountPercent > 0
      ? `Discount (${wholeSaleDiscountPercent}%):`
      : 'Discount on Whole Bill:';
    lines.push(formatRow(discTitle, `-Rs. ${totalOverallBillDiscount.toLocaleString()}`));
  }
  if (allDiscountsTotal > 0 && itemDiscountsTotal > 0 && totalOverallBillDiscount > 0) {
    lines.push(formatRow('Total Discount:', `-Rs. ${allDiscountsTotal.toLocaleString()}`));
  }

  lines.push('================================================\n');
  lines.push('\x1b!\x20'); // Double-Height Bold Net Total
  lines.push(formatRow('NET TOTAL:', `Rs. ${netTotal}`));
  lines.push('\x1b!\x00');
  lines.push('================================================\n');

  lines.push(formatRow('Amount Tendered:', `Rs. ${amountReceived}`));
  if (paymentMethod === 'Cash' || parseFloat(saleData.changeReturned) > 0) {
    lines.push(formatRow('Cash Returned:', `Rs. ${changeReturned}`));
  }

  lines.push('------------------------------------------------\n');
  lines.push('\x1ba\x01'); // Center align
  const footerLines = wrapReceiptText(footerNote, 44);
  footerLines.forEach(fl => lines.push(fl + '\n'));
  lines.push(`* ${receiptNumber} *\n`);

  // Extra line feeds ensure the paper travels fully past the print head and cutting blade
  lines.push('\n\n\n\n\n\n\n');
  lines.push('\x1dV\x41\x03'); // GS V 65 3 (feed paper & cut)
  lines.push('\x1dV\x00');     // GS V 0 (cut paper fallback)

  return lines.join('');
}

/**
 * Executes printing through direct Electron hardware print, Vite hardware bridge, or isolated invisible iframe.
 */
function executePrint(htmlContent, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Direct Hardware Print via Electron IPC (silent, zero popup)
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printDirect === 'function' && window.electronAPI.platform) {
    const deviceName = options?.deviceName;
    const silent = options?.silent !== false;
    const pageSize = options?.pageSize;
    const type = options?.type || 'any';
    const zpl = options?.zpl;
    const epl = options?.epl;
    const escpos = options?.escpos;

    const orientation = options?.orientation || 'x_axis';

    window.electronAPI.printDirect({
      html: htmlContent,
      zpl,
      epl,
      escpos,
      deviceName: deviceName && deviceName !== 'Default System Printer' ? deviceName : undefined,
      type,
      silent,
      pageSize,
      orientation,
    }).catch(err => {
      console.warn('Electron direct print warning:', err);
      if (!silent) {
        fallbackIframePrint(htmlContent, true);
      }
    });

    return;
  }

  // 2. Web / Browser / Vercel Mode:
  // Browsers cannot access raw USB hardware directly without the print dialog.
  // Trigger clean print dialog in browser/Vercel mode so physical paper prints successfully.
  const isBrowser = typeof window !== 'undefined' && !window.electronAPI;
  const shouldPopup = isBrowser ? true : (options?.silent === false);
  fallbackIframePrint(htmlContent, shouldPopup);

  // Optional background bridge dispatch for local workstation printing
  const isHttpEnv = typeof window !== 'undefined' &&
    window.location &&
    window.location.protocol &&
    window.location.protocol.startsWith('http') &&
    !(typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST));

  if (isHttpEnv && typeof fetch === 'function') {
    const payload = JSON.stringify({
      html: htmlContent,
      zpl: options.zpl,
      epl: options.epl,
      escpos: options.escpos,
      deviceName: options.deviceName,
      type: options.type || 'receipt',
      silent: options.silent !== false,
      pageSize: options.pageSize,
    });

    // Fire-and-forget probe local workstation bridge if present
    fetch('/api/print-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => {});
  }
}

/**
 * Formats product/article name cleanly and concisely for 80mm thermal receipts.
 * Removes redundant category prefixes while preserving authentic product titles and variants.
 */
export function formatConciseArticle(it) {
  if (!it) return 'Garment Item';
  let raw = String(it.fabric || it.name || 'Garment Item').trim();
  // Strip duplicate category prefixes like "Formal - Executive Royal Oxford Shirt - Formal"
  raw = raw.replace(/^(Formal|Pret|Casual|Festive|Bridal|Silk|Cotton)\s*-\s*/gi, '');
  raw = raw.replace(/\s*-\s*(Formal|Pret|Casual|Festive|Bridal|Silk|Cotton)$/gi, '');
  // Clean double parens like (Sky Blue (L (42))) -> (Sky Blue, L-42)
  raw = raw.replace(/\(\s*(.*?)\s*\(\s*([A-Za-z0-9]+)\s*\(\s*(\d+)\s*\)\s*\)\s*\)/g, '($1, $2-$3)');
  raw = raw.replace(/\(\s*(.*?)\s*\(\s*(.*?)\s*\)\s*\)/g, '($1, $2)');
  return raw;
}

/**
 * Generates the clean standalone 80mm Thermal POS Receipt HTML matching the physical receipt 1:1.
 */
export function generateThermalReceiptHtml(saleData, shopSettings = {}) {
  if (!saleData) return '';

  const shopName = shopSettings?.shopName || 'NOVA MEN AND WOMEN';
  const shopLocation = shopSettings?.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat, Pakistan';
  const shopPhone = shopSettings?.shopPhone || '+92 300 1234567';
  const footerNote = shopSettings?.receiptFooterNote || 'Thank you for shopping at NOVA MEN AND WOMEN. Exchanges accepted within 14 days with original receipt.';

  const items = saleData.items || [];
  const itemsRows = items.map((it) => {
    const variantTag = it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece';
    const conciseName = formatConciseArticle(it);
    const isReturn = !!it.isReturn;
    const qty = it.qty || 1;
    const unitPrice = (it.unitPrice || 0).toLocaleString();
    const itemDiscPercent = it.itemDiscountPercent || 0;
    const itemDiscAmt = it.itemDiscount || 0;
    const lineTotal = (it.total !== undefined ? it.total : (it.unitPrice * qty) - itemDiscAmt).toLocaleString();

    return `
      <tr>
        <td style="padding: 4px 2px; border-bottom: 1px dotted #ccc; font-size: 10.5px; font-weight: 700; line-height: 1.35; vertical-align: top; text-align: left; word-break: break-word;">
          [${escapeHtml(variantTag)}] ${escapeHtml(conciseName)}
          ${isReturn ? '<br/><strong style="color: #b91c1c; font-size: 9px;">(RETURN)</strong>' : ''}
        </td>
        <td style="padding: 4px 1px; border-bottom: 1px dotted #ccc; font-size: 10.5px; text-align: center; vertical-align: top; white-space: nowrap;">
          ${qty}
        </td>
        <td style="padding: 4px 1px; border-bottom: 1px dotted #ccc; font-size: 10.5px; text-align: right; vertical-align: top; white-space: nowrap;">
          Rs. ${unitPrice}
        </td>
        <td style="padding: 4px 1px; border-bottom: 1px dotted #ccc; font-size: 10px; text-align: right; vertical-align: top; white-space: nowrap;">
          ${itemDiscAmt > 0 ? (it.itemDiscountMode === 'rupees' ? `Rs. ${itemDiscAmt}` : `${itemDiscPercent}%`) : (itemDiscPercent > 0 ? `${itemDiscPercent}%` : '-')}
        </td>
        <td style="padding: 4px 1px; border-bottom: 1px dotted #ccc; font-size: 10.5px; text-align: right; vertical-align: top; font-weight: bold; white-space: nowrap;">
          Rs. ${lineTotal}
        </td>
      </tr>
    `;
  }).join('');

  const itemDiscountsTotal = items.reduce((acc, it) => acc + (it.itemDiscount || 0), 0);
  const rawSubtotal = items.reduce((acc, it) => acc + ((it.unitPrice || 0) * (it.qty || 1)), 0);
  const grossSubtotal = rawSubtotal > 0 ? rawSubtotal : (saleData.subtotal || 0) + itemDiscountsTotal;
  const storewideDiscount = saleData.storewideDiscount || 0;
  const wholeSaleDiscount = saleData.wholeSaleDiscount || 0;
  const wholeSaleDiscountPercent = saleData.wholeSaleDiscountPercent || 0;
  const totalOverallBillDiscount = storewideDiscount + wholeSaleDiscount;
  const allDiscountsTotal = itemDiscountsTotal + totalOverallBillDiscount;
  const netTotal = (saleData.netTotal || 0).toLocaleString();
  const amountReceived = (saleData.amountReceived || saleData.netTotal || 0).toLocaleString();
  const changeReturned = (saleData.changeReturned || 0).toLocaleString();
  const paymentMethod = saleData.paymentMethod || 'Cash';
  const cashier = saleData.salesman || 'Cashier';
  const dateTime = saleData.dateTime || new Date().toLocaleString();
  const receiptNumber = saleData.receiptNumber || `INV-${Date.now().toString().slice(-6)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${escapeHtml(receiptNumber)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      text-rendering: geometricPrecision !important;
    }
    body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      width: 78mm;
      max-width: 78mm;
      margin: 0 auto;
      padding: 6px 4px;
      font-size: 11px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: 800; }
    .divider {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      margin: 5px 0;
      letter-spacing: 1.5px;
      line-height: 1.2;
      border-bottom: 1.5px dashed #000000;
      height: 1px;
    }
    .header-title {
      font-size: 17px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.6px;
      line-height: 1.25;
      color: #000000 !important;
    }
    .header-platform-tag {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #000000 !important;
      margin-bottom: 3px;
    }
    .subtext {
      font-size: 10.5px;
      font-weight: 600;
      color: #000000 !important;
      line-height: 1.45;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px 6px;
      font-size: 10.5px;
      font-weight: 600;
      line-height: 1.45;
      margin: 6px 0;
      border: 1px solid #000000;
      padding: 5px 6px;
      border-radius: 4px;
      background: #fafafa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0;
    }
    th {
      font-size: 10.5px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 4px 1px;
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      line-height: 1.3;
      color: #000000 !important;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
      color: #000000 !important;
    }
    .net-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 900;
      padding: 6px 2px;
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      margin: 6px 0;
      line-height: 1.3;
      color: #000000 !important;
    }
    .footer-section {
      text-align: center;
      font-size: 10.5px;
      font-weight: 600;
      margin-top: 8px;
      line-height: 1.5;
      color: #000000 !important;
    }
    .footer-policy {
      font-size: 9.5px;
      font-weight: 600;
      color: #111111 !important;
      line-height: 1.45;
      margin-top: 3px;
    }
    .barcode-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 2px;
      text-align: center;
      margin-top: 6px;
      line-height: 1.3;
      color: #000000 !important;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="text-center">
    <div class="header-platform-tag">TESSLO CLOTHING ERP</div>
    <div class="header-title">${escapeHtml(shopName)}</div>
    <div class="subtext">${escapeHtml(shopLocation)}</div>
    <div class="subtext">Tel: ${escapeHtml(shopPhone)}</div>
    <div class="divider"></div>
  </div>

  <!-- BODY: Cashier, Payment, Date, Invoice -->
  <div class="meta-grid">
    <div>Cashier: <strong>${escapeHtml(cashier)}</strong></div>
    <div>Payment: <strong>${escapeHtml(paymentMethod)}</strong></div>
    <div>Date: ${escapeHtml(dateTime)}</div>
    <div>Invoice: <strong>${escapeHtml(receiptNumber)}</strong></div>
  </div>

  <div class="divider"></div>

  <!-- TABLE: Article, Qty, Price, Discount, Total -->
  <table style="width: 100%; border-collapse: collapse; margin: 4px 0; table-layout: fixed;">
    <thead>
      <tr>
        <th style="text-align: left; width: 36%; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 1px;">Article</th>
        <th style="text-align: center; width: 10%; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 1px;">Qty</th>
        <th style="text-align: right; width: 18%; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 1px; white-space: nowrap;">Price</th>
        <th style="text-align: right; width: 16%; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 1px; white-space: nowrap;">Discount</th>
        <th style="text-align: right; width: 20%; font-size: 10px; font-weight: bold; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3px 1px; white-space: nowrap;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider">--------------------------------</div>

  <!-- TOTALS: Gross Total, Discount on Whole Bill, Net Total, Amount Tendered, Cash Returned -->
  <div class="row">
    <span>Gross Total:</span>
    <span>Rs. ${grossSubtotal.toLocaleString()}</span>
  </div>
  ${itemDiscountsTotal > 0 ? `
  <div class="row" style="color: #047857;">
    <span>Item Discount:</span>
    <span>-Rs. ${itemDiscountsTotal.toLocaleString()}</span>
  </div>` : ''}
  ${totalOverallBillDiscount > 0 ? `
  <div class="row" style="color: #047857;">
    <span>Discount on Whole Bill${wholeSaleDiscountPercent > 0 ? ` (${wholeSaleDiscountPercent}%)` : ''}:</span>
    <span>-Rs. ${totalOverallBillDiscount.toLocaleString()}</span>
  </div>` : ''}
  ${allDiscountsTotal > 0 && itemDiscountsTotal > 0 && totalOverallBillDiscount > 0 ? `
  <div class="row" style="font-weight: 700;">
    <span>Total Discount:</span>
    <span>-Rs. ${allDiscountsTotal.toLocaleString()}</span>
  </div>` : ''}

  <div class="divider"></div>

  <div class="net-total-row">
    <span>NET TOTAL:</span>
    <span>Rs. ${netTotal}</span>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Amount Tendered:</span>
    <span>Rs. ${amountReceived}</span>
  </div>
  ${paymentMethod === 'Cash' || parseFloat(saleData.changeReturned) > 0 ? `
  <div class="row">
    <span>Cash Returned:</span>
    <span>Rs. ${changeReturned}</span>
  </div>` : ''}

  <div class="divider"></div>

  <!-- FOOTER: Thank you note, Exchange Policy, Invoice # -->
  <div class="footer-section">
    <div>Thank you for shopping at ${escapeHtml(shopName)}.</div>
    <div class="footer-policy">${escapeHtml(footerNote.includes('Exchanges') ? footerNote : 'Exchanges accepted within 14 days with original receipt.')}</div>
    <div class="barcode-code">* ${escapeHtml(receiptNumber)} *</div>
  </div>
</body>
</html>`;
}

/**
 * Print 75mm Thermal POS Receipt.
 * Formatted precisely for 75mm continuous roll receipt printers.
 * Height dynamically expands based on items and transactions.
 */
export function printThermalReceipt(saleData, shopSettings = {}, options = {}) {
  if (!saleData) return;

  // Retrieve printer device configuration
  let savedPrinterSettings = {};
  try {
    if (typeof localStorage !== 'undefined') {
      savedPrinterSettings = JSON.parse(localStorage.getItem('pos_printer_settings') || '{}');
    }
  } catch (_) {}

  const rawDevice = options?.deviceName || shopSettings?.receiptPrinter || savedPrinterSettings?.receiptPrinter;
  // STRICT GUARD: Receipt must NEVER be sent to a label printer or blank default
  const isLabelTarget = rawDevice && LABEL_PRINTER_KEYWORD_REGEX.test(rawDevice);
  const deviceName = (!rawDevice || rawDevice === 'Default System Printer' || isLabelTarget)
    ? 'BIXOLON SRP-Q302'
    : rawDevice;
  const silent = options?.silent !== undefined
    ? options.silent
    : (shopSettings?.silentPrinting !== undefined ? shopSettings.silentPrinting : (savedPrinterSettings?.silentPrinting !== false));

  const html = generateThermalReceiptHtml(saleData, shopSettings);
  const escpos = generateEscPosReceipt(saleData, shopSettings);
  executePrint(html, { deviceName, silent, type: 'receipt', escpos });

  // If cash transaction, ensure physical cash drawer solenoid is kicked via DK port (unless skipped)
  if (saleData?.paymentMethod === 'Cash' && options?.skipDrawerKick !== true) {
    triggerCashDrawerKick(shopSettings, { deviceName }).catch(() => {});
  }
}

/**
 * Triggers cash drawer kick solenoid pulse via thermal receipt printer (BIXOLON SRP-Q302).
 * Sends raw RJ11/RJ12 multi-standard pulse through Electron IPC without popup.
 */
export async function triggerCashDrawerKick(shopSettings = {}, options = {}) {
  let savedPrinterSettings = {};
  try {
    if (typeof localStorage !== 'undefined') {
      savedPrinterSettings = JSON.parse(localStorage.getItem('pos_printer_settings') || '{}');
    }
  } catch (_) {}

  const rawDevice = options?.deviceName || shopSettings?.receiptPrinter || savedPrinterSettings?.receiptPrinter;
  const isLabelTarget = rawDevice && LABEL_PRINTER_KEYWORD_REGEX.test(rawDevice);
  const targetPrinter = (!rawDevice || rawDevice === 'Default System Printer' || isLabelTarget)
    ? 'BIXOLON SRP-Q302'
    : rawDevice;

  const pin = options?.pin || shopSettings?.drawerPin || savedPrinterSettings?.drawerPin || 'all';

  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.kickCashDrawer === 'function') {
    try {
      const res = await window.electronAPI.kickCashDrawer(targetPrinter, { pin });
      console.log(`[Cash Drawer] Solenoid kick pulse dispatched to: ${targetPrinter} (pin: ${pin})`, res);
      return res;
    } catch (err) {
      console.warn('[Cash Drawer] Electron kick error:', err);
      return { success: false, error: err.message };
    }
  }

  // Network / Browser fallback
  if (typeof window !== 'undefined' && typeof fetch === 'function' && window.location?.protocol?.startsWith('http')) {
    try {
      const res = await fetch('/api/kick-cash-drawer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printer: targetPrinter }),
      });
      return await res.json();
    } catch (_) {}
  }

  return { success: true, simulated: true };
}

/**
 * Generates authentic ZPL (Zebra Programming Language) string for direct thermal barcode labels.
 * Strict 6-line layout on standard 48mm (384 dots @ 203 DPI) x 30mm (240 dots) thermal sticker rolls:
 * Line 1: shop name
 * Line 2: item name with color
 * Line 3: cloth type
 * Line 4: barcode (Code 128)
 * Line 5: item code
 * Line 6: price
 */
export function generateZplLabel(product, shopSettings = {}, count = 1, options = {}) {
  if (!product) return '';
  const orientation = options?.orientation || shopSettings?.labelOrientation || 'x_axis';
  const shopName = (shopSettings?.shopName || 'NOVA MEN AND WOMEN').toUpperCase().slice(0, 32);
  const baseItemName = product?.tagLabel || product?.fabricMaterial || product?.name || 'Garment Item';
  const color = product?.tagSubtitle || product?.fabricColor || product?.color || '';
  const itemNameWithColor = (color ? `${baseItemName} - ${color}` : baseItemName).slice(0, 32);
  const clothType = (product?.fabricType || product?.apparelCategory || product?.category || 'Cotton Fabric').toUpperCase().slice(0, 30);
  const itemCode = String(product?.barcode || product?.sku || '000000000000').trim();
  const price = (product?.retailPrice || 0).toLocaleString();
  const printQty = Math.max(1, parseInt(count, 10) || 1);
  const printMethod = shopSettings?.printMethod || 'thermal_transfer';
  const mediaTypeCmd = printMethod === 'direct_thermal' ? '^MTD' : '^MTT';

  // Orientation commands:
  // x_axis: Normal Horizontal orientation across 50mm width (^PON normal, ^FWN field orientation normal)
  // y_axis: Vertical / Rotated 90° orientation (^FWR)
  // inverted_180: Inverted bottom-up (^POI)
  const orientationCmd = orientation === 'y_axis'
    ? '^FWR'
    : (orientation === 'inverted_180' ? '^POI' : '^PON\n^FWN');

  return `^XA
${mediaTypeCmd}
${orientationCmd}
~SD22
^MD22
^PR3
^PW384
^LL240
^LH0,0
^FO10,8^FB364,1,0,C^A0N,20,20^FD${shopName}^FS
^FO10,30^FB364,1,0,C^A0N,18,18^FD${itemNameWithColor}^FS
^FO10,50^FB364,1,0,C^A0N,16,16^FD${clothType}^FS
^FO20,68^BY2,3,32^BCN,32,N,N,N^FD${itemCode}^FS
^FO10,104^FB364,1,0,C^A0N,20,20^FD${itemCode}^FS
^FO15,126^GB354,2,2^FS
^FO10,132^FB364,1,0,C^A0N,26,26^FDPRICE: Rs. ${price}^FS
^PQ${printQty}
^XZ`;
}

/**
 * Generates authentic EPL2 (Eltron Programming Language 2) string for direct thermal / thermal transfer label printers.
 * Specially formatted for desktop printers such as Zebra GK888t (EPL), GC420t, 2844, 2824.
 * Strict 6-line layout on standard 48mm/50mm (384 dots @ 203 DPI) x 30mm (240 dots) thermal sticker rolls:
 * Line 1: shop name
 * Line 2: item name with color
 * Line 3: cloth type
 * Line 4: barcode (Code 128)
 * Line 5: item code
 * Line 6: price
 */
export function generateEplLabel(product, shopSettings = {}, count = 1, options = {}) {
  if (!product) return '';
  const orientation = options?.orientation || shopSettings?.labelOrientation || 'x_axis';
  const rot = orientation === 'y_axis' ? 1 : 0;
  const shopName = (shopSettings?.shopName || 'NOVA MEN AND WOMEN').toUpperCase().slice(0, 30);
  const baseItemName = product?.fabricMaterial || product?.name || 'Garment Item';
  const color = product?.fabricColor || product?.color || '';
  const itemNameWithColor = (color ? `${baseItemName} - ${color}` : baseItemName).slice(0, 32);
  const clothType = (product?.fabricType || product?.apparelCategory || product?.category || 'Cotton Fabric').toUpperCase().slice(0, 24);
  const itemCode = String(product?.barcode || product?.sku || '000000000000').trim().slice(0, 20);
  const price = (product?.retailPrice || 0).toLocaleString();
  const printQty = Math.max(1, parseInt(count, 10) || 1);
  const printMethod = shopSettings?.printMethod || 'thermal_transfer';
  // OR = Thermal Transfer (with Ribbon - engages ribbon motor/sensor so ribbon doesn't spill out)
  // OD = Direct Thermal (without Ribbon)
  const mediaMode = printMethod === 'direct_thermal' ? 'OD' : 'OR';

  // EPL2 Character Width Calculations for 384-dot (48mm / 50mm) label
  const xShop = Math.max(10, Math.floor((384 - (shopName.length * 12)) / 2));
  const xName = Math.max(10, Math.floor((384 - (itemNameWithColor.length * 10)) / 2));
  const xType = Math.max(10, Math.floor((384 - (clothType.length * 10)) / 2));
  const xCode = Math.max(10, Math.floor((384 - (itemCode.length * 12)) / 2));
  const priceStr = `PRICE: Rs. ${price}`;
  const xPrice = Math.max(10, Math.floor((384 - (priceStr.length * 14)) / 2));

  // Center Code 128 barcode dynamically
  const narrowBar = itemCode.length > 12 ? 1 : 2;
  const charWidth = narrowBar === 1 ? 11 : 22;
  const barcodeApproxWidth = (itemCode.length + 3) * charWidth + 20;
  const xBarcode = Math.max(10, Math.floor((384 - barcodeApproxWidth) / 2));

  return [
    'N',
    mediaMode,
    'D13',
    'S2',
    'q384',
    'Q240,24',
    'ZT',
    `A${xShop},8,${rot},2,1,1,N,"${shopName.replace(/"/g, "'")}"`,
    `A${xName},30,${rot},2,1,1,N,"${itemNameWithColor.replace(/"/g, "'")}"`,
    `A${xType},50,${rot},1,1,1,N,"${clothType.replace(/"/g, "'")}"`,
    `B${xBarcode},68,${rot},1,${narrowBar},${narrowBar * 2},32,N,"${itemCode.replace(/"/g, '')}"`,
    `A${xCode},104,${rot},3,1,1,N,"${itemCode.replace(/"/g, "'")}"`,
    'LO15,128,354,2',
    `A${xPrice},134,${rot},3,1,1,N,"${priceStr.replace(/"/g, "'")}"`,
    `P${printQty}`,
    ''
  ].join('\n');
}

/**
 * Print Barcode Sticker Labels for Label Printers.
 * Layout:
 * 1. shop name
 * 2. item name with color
 * 3. cloth type
 * 4. barcode (Code 128)
 * 5. item code
 * 6. price
 * Size: Standard thermal label sticker roll (48mm/50mm x 30mm / 2" x 1.2").
 */
export function printBarcodeLabels(product, count = 1, shopSettings = {}, options = {}) {
  if (!product) return;

  // Retrieve printer device configuration
  let savedPrinterSettings = {};
  try {
    if (typeof localStorage !== 'undefined') {
      savedPrinterSettings = JSON.parse(localStorage.getItem('pos_printer_settings') || '{}');
    }
  } catch (_) {}

  const rawDevice = options?.deviceName || shopSettings?.labelPrinter || savedPrinterSettings?.labelPrinter;
  // STRICT GUARD: Label printer must NEVER be a receipt printer or blank default
  const isReceiptTarget = rawDevice && RECEIPT_PRINTER_KEYWORD_REGEX.test(rawDevice);
  const deviceName = (!rawDevice || rawDevice === 'Default System Printer' || isReceiptTarget)
    ? 'ZDesigner iMZ220 (ZPL)'
    : rawDevice;
  const silent = options?.silent !== undefined
    ? options.silent
    : (shopSettings?.silentPrinting !== undefined ? shopSettings.silentPrinting : (savedPrinterSettings?.silentPrinting !== false));

  const shopName = shopSettings?.shopName || 'NOVA MEN AND WOMEN';
  const labelCount = Math.max(1, parseInt(count, 10) || 1);

  // Line 2: item name with color (using dedicated tagLabel if specified)
  const baseItemName = product.tagLabel || product.fabricMaterial || product.name || product.itemName || 'Garment Item';
  const color = product.tagSubtitle || product.fabricColor || product.color || '';
  const itemNameWithColor = color ? `${baseItemName} - ${color}` : baseItemName;

  // Line 3: cloth type
  const clothType = product.fabricType || product.apparelCategory || product.category || 'Cotton Fabric';

  // Line 4: barcode & Line 5: item code
  const itemCode = String(product.barcode || product.sku || '000000000000').trim();
  const barcodeSvg = generateBarcodeSvg(itemCode, { height: 28, moduleWidth: 2 });

  // Line 6: price
  const price = (product.retailPrice || 0).toLocaleString();

  let labelsHtml = '';
  for (let i = 0; i < labelCount; i++) {
    labelsHtml += `
      <div class="sticker-label">
        <div class="lbl-shop-name">${escapeHtml(shopName)}</div>
        <div class="lbl-item-name">${escapeHtml(itemNameWithColor)}</div>
        <div class="lbl-cloth-type">${escapeHtml(clothType)}</div>
        <div class="lbl-barcode-box">
          ${barcodeSvg}
        </div>
        <div class="lbl-item-code">${escapeHtml(itemCode)}</div>
        <div class="lbl-price">PRICE: Rs. ${price}</div>
      </div>
    `;
  }

  const labelOrientation = options?.orientation || shopSettings?.labelOrientation || savedPrinterSettings?.labelOrientation || 'x_axis';
  const isYAxis = labelOrientation === 'y_axis';
  const isRotated90 = labelOrientation === 'rotated_90';
  const pageOrientation = isYAxis ? '30mm 50mm portrait' : '50mm 30mm landscape';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Label - ${escapeHtml(itemCode)}</title>
  <style>
    @page {
      size: ${pageOrientation};
      margin: 0mm !important;
    }
    @media print {
      @page {
        size: ${pageOrientation};
        margin: 0mm !important;
      }
      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        margin: 0mm !important;
        padding: 0mm !important;
        background: #ffffff !important;
        color: #000000 !important;
      }
      .sticker-label {
        width: ${isYAxis ? '27mm' : '48mm'} !important;
        height: ${isYAxis ? '48mm' : '27.5mm'} !important;
        max-width: ${isYAxis ? '27mm' : '48mm'} !important;
        max-height: ${isYAxis ? '48mm' : '27.5mm'} !important;
        margin: 0 auto !important;
        padding: 0.4mm 1mm !important;
        box-sizing: border-box !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: visible !important;
        ${isRotated90 ? 'transform: rotate(90deg); transform-origin: center center;' : ''}
      }
      .sticker-label:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      width: 100%;
      height: auto;
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      image-rendering: pixelated !important;
      shape-rendering: crispEdges !important;
    }
    .sticker-label {
      width: ${isYAxis ? '27mm' : '48mm'};
      height: ${isYAxis ? '48mm' : '27.5mm'};
      max-width: ${isYAxis ? '27mm' : '48mm'};
      max-height: ${isYAxis ? '48mm' : '27.5mm'};
      padding: 0.4mm 1mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      background: #ffffff !important;
      color: #000000 !important;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      overflow: visible;
      border: 1px solid #000000;
      ${isRotated90 ? 'transform: rotate(90deg); transform-origin: center center;' : ''}
    }
    .sticker-label:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .lbl-shop-name {
      font-size: 8.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      color: #000000 !important;
      line-height: 1.1;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 1px;
    }
    .lbl-item-name {
      font-size: 8px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      color: #000000 !important;
      line-height: 1.15;
      margin-top: 1px;
    }
    .lbl-cloth-type {
      font-size: 7px;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      color: #000000 !important;
      line-height: 1;
      margin-top: 1px;
    }
    .lbl-barcode-box {
      width: 96%;
      height: 7.5mm;
      min-height: 7.5mm;
      max-height: 7.5mm;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 1px auto;
      overflow: hidden;
    }
    .lbl-barcode-box svg {
      width: 100%;
      height: 100%;
      display: block;
      shape-rendering: crispEdges !important;
    }
    .lbl-barcode-box rect {
      shape-rendering: crispEdges !important;
    }
    .lbl-item-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #000000 !important;
      line-height: 1.1;
      margin: 1px 0;
      overflow: visible;
    }
    .lbl-price {
      font-size: 11px;
      font-weight: 900;
      border-top: 1.5px solid #000000;
      width: 100%;
      padding-top: 1px;
      letter-spacing: 0.5px;
      color: #000000 !important;
      line-height: 1.15;
      overflow: visible;
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>`;

  const zpl = generateZplLabel(product, shopSettings, count, { orientation: labelOrientation });
  const epl = generateEplLabel(product, shopSettings, count, { orientation: labelOrientation });

  executePrint(html, {
    deviceName,
    silent,
    type: 'label',
    zpl,
    epl,
    orientation: labelOrientation,
    pageSize: isYAxis ? { width: 30000, height: 50000 } : { width: 50000, height: 30000 },
  });
}

/**
 * Instant Hardware Test Print for 75mm Thermal Receipt.
 */
export function testPrintThermalReceipt(shopSettings = {}, options = {}) {
  const sampleSale = {
    receiptNumber: `INV-TEST-${Date.now().toString().slice(-4)}`,
    dateTime: new Date().toLocaleString(),
    salesman: 'Admin Cashier',
    paymentMethod: 'Cash',
    subtotal: 7500,
    storewideDiscount: 500,
    wholeSaleDiscount: 0,
    netTotal: 7000,
    amountReceived: 8000,
    changeReturned: 1000,
    items: [
      {
        fabric: 'Executive Cotton Kurta',
        variantDetails: { size: 'Large (42)' },
        qty: 1,
        unitPrice: 4500,
        total: 4500,
        isReturn: false,
      },
      {
        fabric: 'Pasha Classic Latha',
        variantDetails: { size: '4.5m Suit' },
        qty: 1,
        unitPrice: 3000,
        total: 3000,
        isReturn: false,
      },
    ],
  };
  printThermalReceipt(sampleSale, shopSettings, options);
}

/**
 * Instant Hardware Test Print for Barcode Sticker Label.
 */
export function testPrintBarcodeLabel(shopSettings = {}, options = {}) {
  const sampleProduct = {
    fabricMaterial: 'Executive Woolen Blazer',
    apparelCategory: 'Gents Wear',
    fabricColor: 'Charcoal Black',
    size: '42 (L)',
    barcode: '890123456789',
    retailPrice: 8500,
  };
  printBarcodeLabels(sampleProduct, 1, shopSettings, options);
}

/**
 * Print 80mm Day-End Cash Settlement & Register Close Slip (Z-Report)
 */
export function printSettlementReport(report, shopSettings = {}) {
  if (!report) return;

  const shopName = escapeHtml(shopSettings.shopName || 'NOVA MEN & WOMEN');
  const shopPhone = escapeHtml(shopSettings.shopPhone || '+92 300 1234567');
  const shopLocation = escapeHtml(shopSettings.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Day Settlement Z-Report - ${escapeHtml(report.date)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #ffffff !important;
      color: #000000 !important;
      font-family: "Courier New", Courier, monospace, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      padding: 6mm 4mm;
      width: 80mm;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .store-name {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .store-sub { font-size: 9.5px; color: #222; margin-bottom: 2px; }
    .divider {
      border-top: 1px dashed #000;
      margin: 5px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 2px 0;
    }
    .report-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 4px 0;
    }
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .summary-table td {
      padding: 2.5px 0;
      font-size: 11px;
    }
    .total-row {
      font-size: 12.5px;
      font-weight: 900;
    }
    .status-box {
      border: 1px solid #000;
      padding: 4px;
      margin: 6px 0;
      text-align: center;
      font-weight: 800;
      font-size: 11px;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      padding-top: 5px;
      font-size: 9.5px;
    }
    .sig-col {
      width: 45%;
      border-top: 1px dashed #000;
      text-align: center;
      padding-top: 2px;
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="store-name">${shopName}</div>
    <div class="store-sub">${shopLocation}</div>
    <div class="store-sub">Tel: ${shopPhone}</div>
    <div class="divider"></div>
    <div class="report-title">DAY-END REGISTER Z-REPORT</div>
    <div class="meta-row">
      <span>Date: ${escapeHtml(report.date)}</span>
      <span>Time: ${escapeHtml(report.closedAt || '')}</span>
    </div>
    <div class="meta-row">
      <span>Closed By: ${escapeHtml(report.closedBy || 'Store Admin')}</span>
      <span>Terminal: POS-T1</span>
    </div>
  </div>

  <div class="double-divider"></div>

  <table class="summary-table">
    <tr>
      <td>Invoices Settled:</td>
      <td class="text-right bold">${escapeHtml(String(report.orderCount || 0))}</td>
    </tr>
    <tr>
      <td>Expected Cash:</td>
      <td class="text-right bold">Rs. ${escapeHtml(Number(report.expectedCash || 0).toLocaleString())}</td>
    </tr>
    <tr>
      <td>Actual Physical Cash:</td>
      <td class="text-right bold">Rs. ${escapeHtml(Number(report.actualCash || 0).toLocaleString())}</td>
    </tr>
    <tr>
      <td>Digital Payments:</td>
      <td class="text-right bold">Rs. ${escapeHtml(Number(report.digitalSales || 0).toLocaleString())}</td>
    </tr>
    <tr class="total-row">
      <td style="padding-top: 4px; border-top: 1px solid #000;">TOTAL DAY REVENUE:</td>
      <td class="text-right bold" style="padding-top: 4px; border-top: 1px solid #000;">Rs. ${escapeHtml(Number(report.totalSales || 0).toLocaleString())}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <div class="status-box">
    DISCREPANCY: ${report.discrepancy === 0 ? 'PERFECTLY BALANCED (Rs. 0)' : `${report.discrepancy > 0 ? '+Rs.' : '-Rs.'} ${Math.abs(report.discrepancy).toLocaleString()} (${String(report.status || '').toUpperCase()})`}
  </div>

  ${report.reasonNote ? `
  <div style="font-size: 10px; margin: 4px 0;">
    <strong>Note:</strong> ${escapeHtml(report.reasonNote)}
  </div>
  ` : ''}

  <div class="signatures-row">
    <div class="sig-col">Cashier Signature</div>
    <div class="sig-col">Manager Signature</div>
  </div>

  <div class="divider" style="margin-top: 15px;"></div>
  <div class="text-center" style="font-size: 9px; color: #555;">
    Official Register Closing Report • Retain for Audit
  </div>
</body>
</html>`;

  executePrint(html);
}
