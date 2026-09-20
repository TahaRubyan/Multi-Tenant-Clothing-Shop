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
        rects.push(`<rect x="${currentX}" y="0" width="${w}" height="${height}" fill="#000000" />`);
      }
      currentX += w;
    }
  }

  const totalWidth = currentX + (quietZoneModules * moduleWidth);

  return `<svg viewBox="0 0 ${totalWidth} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%; display: block;">
    <rect x="0" y="0" width="${totalWidth}" height="${height}" fill="#ffffff" />
    ${rects.join('')}
  </svg>`;
}

/**
 * Automatically identify connected receipt printer and label printer without user pop-ups.
 */
export function autoDetectPrinters(printers = []) {
  let detectedReceipt = null;
  let detectedLabel = null;

  const labelRegex = /label|barcode|sticker|xp-?3|gp-?1|gp-?2|gp-?3|tsc|zebra|zdesigner|zpl|epl|cpl|imz|mz\d|zd\d|gx\d|gk\d|gt\d|tlp|lp2|4bar|hprt|postek|godex|argox|gprinter|dymo|brother.*ql|intermec|datamax|bk-?l/i;
  const receiptRegex = /receipt|pos-?80|xp-?80|tm-?t|thermal.*80|rp80|xprinter.*8|epson|star.*tsp|citizen|bixolon|srp|sam4s|58|xp-?58|pos-?58/i;

  const validPrinters = printers
    .map(p => (typeof p === 'string' ? p : p.name || p.displayName || '').trim())
    .filter(Boolean);

  // 1. Keyword search
  for (const name of validPrinters) {
    if (!detectedLabel && labelRegex.test(name)) {
      detectedLabel = name;
    }
    if (!detectedReceipt && receiptRegex.test(name)) {
      detectedReceipt = name;
    }
  }

  // 2. Fallback heuristic for 2 physical devices (ignoring virtual PDF/Fax/OneNote)
  const physicalPrinters = validPrinters.filter(
    n => !/pdf|onenote|xps|fax|default/i.test(n)
  );

  if (physicalPrinters.length >= 2) {
    if (!detectedReceipt && detectedLabel) {
      detectedReceipt = physicalPrinters.find(p => p !== detectedLabel) || physicalPrinters[0];
    } else if (!detectedLabel && detectedReceipt) {
      detectedLabel = physicalPrinters.find(p => p !== detectedReceipt) || physicalPrinters[1];
    } else if (!detectedReceipt && !detectedLabel) {
      detectedReceipt = physicalPrinters[0];
      detectedLabel = physicalPrinters[1];
    }
  } else if (physicalPrinters.length === 1) {
    if (!detectedReceipt) detectedReceipt = physicalPrinters[0];
    if (!detectedLabel) detectedLabel = physicalPrinters[0];
  }

  return { detectedReceipt, detectedLabel };
}

/**
 * Executes printing through direct Electron hardware print or isolated invisible iframe.
 */
function executePrint(htmlContent, options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1. Direct Hardware Print via Electron IPC (silent, zero popup)
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printDirect === 'function') {
    const deviceName = options?.deviceName;
    const silent = options?.silent !== false;
    const pageSize = options?.pageSize;
    const type = options?.type || 'any';
    const zpl = options?.zpl;
    const epl = options?.epl;

    window.electronAPI.printDirect({
      html: htmlContent,
      zpl,
      epl,
      deviceName: deviceName && deviceName !== 'Default System Printer' ? deviceName : undefined,
      type,
      silent,
      pageSize,
    }).catch(err => {
      console.warn('Electron direct print warning, falling back to frame:', err);
    });

    // In true Electron environment, direct print was dispatched
    if (window.electronAPI.platform) {
      return;
    }
  }

  // 2. Clean Isolated iframe print (for browser, dev server & test environments)
  const existingFrame = document.getElementById('pos-clean-print-frame');
  if (existingFrame) {
    try {
      existingFrame.remove();
    } catch (_) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-clean-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  try {
    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    // Allow CSS rendering before initiating print
    setTimeout(() => {
      try {
        if (iframe.contentWindow && typeof iframe.contentWindow.print === 'function') {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } else if (typeof window.print === 'function') {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print warning, falling back to window.print:', err);
        if (typeof window.print === 'function') window.print();
      }
    }, 250);
  } catch (err) {
    console.error('Print initialization error:', err);
    if (typeof window.print === 'function') window.print();
  }
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

  const deviceName = options?.deviceName || shopSettings?.receiptPrinter || savedPrinterSettings?.receiptPrinter;
  const silent = options?.silent !== undefined
    ? options.silent
    : (shopSettings?.silentPrinting !== undefined ? shopSettings.silentPrinting : (savedPrinterSettings?.silentPrinting !== false));

  const shopName = shopSettings?.shopName || 'NOVA MEN AND WOMEN';
  const shopLocation = shopSettings?.shopLocation || 'Main Bazar, Jalal Pur Jattan, Gujrat';
  const shopPhone = shopSettings?.shopPhone || '+92 300 1234567';
  const footerNote = shopSettings?.receiptFooterNote || 'Thank you for shopping with us! Please visit again.';

  const items = saleData.items || [];
  const itemsRows = items.map((it) => {
    const variantTag = it.variantDetails ? it.variantDetails.size : it.unitType || 'Piece';
    const name = it.fabric || it.name || 'Garment Item';
    const isReturn = !!it.isReturn;
    const qty = it.qty || 1;
    const unitPrice = (it.unitPrice || 0).toLocaleString();
    const total = (it.total || 0).toLocaleString();

    return `
      <tr>
        <td style="padding: 3px 2px; border-bottom: 1px dotted #ccc; font-size: 11px; text-align: left; vertical-align: top;">
          [${escapeHtml(variantTag)}] ${escapeHtml(name)}
          ${isReturn ? '<strong style="color: #b91c1c;"> (RETURN)</strong>' : ''}
        </td>
        <td style="padding: 3px 2px; border-bottom: 1px dotted #ccc; font-size: 11px; text-align: center; vertical-align: top;">${qty}</td>
        <td style="padding: 3px 2px; border-bottom: 1px dotted #ccc; font-size: 11px; text-align: right; vertical-align: top;">Rs. ${unitPrice}</td>
        <td style="padding: 3px 2px; border-bottom: 1px dotted #ccc; font-size: 11px; text-align: right; vertical-align: top; font-weight: bold;">Rs. ${total}</td>
      </tr>
    `;
  }).join('');

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
  const barcodeSvg = generateBarcodeSvg(receiptNumber.replace(/[^0-9a-zA-Z]/g, ''));

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt - ${escapeHtml(receiptNumber)}</title>
  <style>
    @page {
      size: 75mm auto;
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
      font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
      width: 75mm;
      max-width: 75mm;
      margin: 0 auto;
      padding: 6px 4px;
      font-size: 11px;
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      text-align: center;
      font-size: 10px;
      margin: 4px 0;
      letter-spacing: 1px;
    }
    .header-title {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 2px;
      letter-spacing: 0.5px;
    }
    .subtext {
      font-size: 9.5px;
      color: #222;
      line-height: 1.25;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 4px;
      font-size: 10px;
      margin: 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    th {
      font-size: 10px;
      text-transform: uppercase;
      border-bottom: 1px dashed #000;
      padding: 3px 2px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 11px;
    }
    .net-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 800;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 4px 0;
      margin: 4px 0;
    }
    .barcode-wrap {
      text-align: center;
      margin-top: 6px;
    }
    .barcode-code {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin: 3px 0;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="text-center">
    <div class="header-title">${escapeHtml(shopName)}</div>
    <div class="subtext">${escapeHtml(shopLocation)}</div>
    <div class="subtext">Tel: ${escapeHtml(shopPhone)}</div>
    <div class="divider">================================</div>
  </div>

  <!-- BODY: Cashier, Payment, Date, Invoice -->
  <div class="meta-grid">
    <div>Cashier: <strong>${escapeHtml(cashier)}</strong></div>
    <div>Payment: <strong>${escapeHtml(paymentMethod)}</strong></div>
    <div>Date: ${escapeHtml(dateTime)}</div>
    <div>Invoice: <strong>${escapeHtml(receiptNumber)}</strong></div>
  </div>

  <div class="divider">--------------------------------</div>

  <!-- TABLE: Article, Qty, Price, Total after discount -->
  <table>
    <thead>
      <tr>
        <th style="text-align: left;">Article</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="divider">--------------------------------</div>

  <!-- TOTALS: Subtotal, Overall Discount, Net Total, Amount Received, Change Returned -->
  <div class="row">
    <span>Subtotal:</span>
    <span>Rs. ${subtotal}</span>
  </div>
  ${storewideDiscount > 0 ? `
  <div class="row">
    <span>Storewide Promo:</span>
    <span>-Rs. ${storewideDiscount.toLocaleString()}</span>
  </div>` : ''}
  ${wholeSaleDiscount > 0 ? `
  <div class="row">
    <span>Wholesale Discount (${wholeSaleDiscountPercent}%):</span>
    <span>-Rs. ${wholeSaleDiscount.toLocaleString()}</span>
  </div>` : ''}
  ${totalDiscount > 0 && storewideDiscount === 0 && wholeSaleDiscount === 0 ? `
  <div class="row">
    <span>Overall Discount:</span>
    <span>-Rs. ${totalDiscount.toLocaleString()}</span>
  </div>` : ''}

  <div class="net-total-row">
    <span>NET TOTAL:</span>
    <span>Rs. ${netTotal}</span>
  </div>

  <div class="row">
    <span>Amount Received:</span>
    <span>Rs. ${amountReceived}</span>
  </div>
  ${paymentMethod === 'Cash' || parseFloat(saleData.changeReturned) > 0 ? `
  <div class="row">
    <span>Change Returned:</span>
    <span>Rs. ${changeReturned}</span>
  </div>` : ''}

  <div class="divider">================================</div>

  <!-- FOOTER: Thank you note, Invoice #, Scannable Barcode -->
  <div class="barcode-wrap">
    <div style="font-size: 10px; margin-bottom: 3px;">${escapeHtml(footerNote)}</div>
    <div class="barcode-code">* ${escapeHtml(receiptNumber)} *</div>
    <div style="margin: 3px auto; max-width: 200px;">${barcodeSvg}</div>
    <div style="font-size: 8.5px; color: #555;">Scan barcode above for rapid returns &amp; exchanges</div>
  </div>
</body>
</html>`;

  executePrint(html, { deviceName, silent, type: 'receipt' });
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
export function generateZplLabel(product, shopSettings = {}, count = 1) {
  if (!product) return '';
  const shopName = (shopSettings?.shopName || 'NOVA MEN AND WOMEN').toUpperCase().slice(0, 32);
  const baseItemName = product?.fabricMaterial || product?.name || 'Garment Item';
  const color = product?.fabricColor || product?.color || '';
  const itemNameWithColor = (color ? `${baseItemName} - ${color}` : baseItemName).slice(0, 32);
  const clothType = (product?.fabricType || product?.apparelCategory || product?.category || 'Cotton Fabric').toUpperCase().slice(0, 30);
  const itemCode = String(product?.barcode || product?.sku || '000000000000').trim();
  const price = (product?.retailPrice || 0).toLocaleString();
  const printQty = Math.max(1, parseInt(count, 10) || 1);

  return `^XA
^PW384
^LL240
^LH0,0
^FO10,8^FB364,1,0,C^A0N,22,22^FD${shopName}^FS
^FO10,34^FB364,1,0,C^A0N,20,20^FD${itemNameWithColor}^FS
^FO10,58^FB364,1,0,C^A0N,18,18^FD${clothType}^FS
^FO42,80^BY2,2,42^BCN,42,N,N,N^FD${itemCode}^FS
^FO10,130^FB364,1,0,C^A0N,20,20^FD${itemCode}^FS
^FO10,154^GB364,2,2^FS
^FO10,162^FB364,1,0,C^A0N,28,28^FDRs. ${price}^FS
^PQ${printQty}
^XZ`;
}

/**
 * Generates authentic EPL2 (Eltron Programming Language 2) string for direct thermal label printers.
 * Specially formatted for desktop printers such as Zebra GK888t (EPL), GC420t, 2844, 2824.
 * Strict 6-line layout on standard 48mm/50mm (384 dots @ 203 DPI) x 30mm (240 dots) thermal sticker rolls:
 * Line 1: shop name
 * Line 2: item name with color
 * Line 3: cloth type
 * Line 4: barcode (Code 128)
 * Line 5: item code
 * Line 6: price
 */
export function generateEplLabel(product, shopSettings = {}, count = 1) {
  if (!product) return '';
  const shopName = (shopSettings?.shopName || 'NOVA MEN AND WOMEN').toUpperCase().slice(0, 30);
  const baseItemName = product?.fabricMaterial || product?.name || 'Garment Item';
  const color = product?.fabricColor || product?.color || '';
  const itemNameWithColor = (color ? `${baseItemName} - ${color}` : baseItemName).slice(0, 32);
  const clothType = (product?.fabricType || product?.apparelCategory || product?.category || 'Cotton Fabric').toUpperCase().slice(0, 24);
  const itemCode = String(product?.barcode || product?.sku || '000000000000').trim().slice(0, 20);
  const price = (product?.retailPrice || 0).toLocaleString();
  const printQty = Math.max(1, parseInt(count, 10) || 1);

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
    'OD',
    'D13',
    'S2',
    'q384',
    'Q240,24',
    'ZT',
    `A${xShop},10,0,3,1,1,N,"${shopName.replace(/"/g, "'")}"`,
    `A${xName},36,0,2,1,1,N,"${itemNameWithColor.replace(/"/g, "'")}"`,
    `A${xType},60,0,2,1,1,N,"${clothType.replace(/"/g, "'")}"`,
    `B${xBarcode},84,0,1,${narrowBar},${narrowBar * 2},42,N,"${itemCode.replace(/"/g, '')}"`,
    `A${xCode},132,0,3,1,1,N,"${itemCode.replace(/"/g, "'")}"`,
    'LO15,158,354,2',
    `A${xPrice},168,0,4,1,1,N,"${priceStr.replace(/"/g, "'")}"`,
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

  const deviceName = options?.deviceName || shopSettings?.labelPrinter || savedPrinterSettings?.labelPrinter;
  const silent = options?.silent !== undefined
    ? options.silent
    : (shopSettings?.silentPrinting !== undefined ? shopSettings.silentPrinting : (savedPrinterSettings?.silentPrinting !== false));

  const shopName = shopSettings?.shopName || 'NOVA MEN AND WOMEN';
  const labelCount = Math.max(1, parseInt(count, 10) || 1);

  // Line 2: item name with color
  const baseItemName = product.fabricMaterial || product.name || 'Garment Item';
  const color = product.fabricColor || product.color || '';
  const itemNameWithColor = color ? `${baseItemName} - ${color}` : baseItemName;

  // Line 3: cloth type
  const clothType = product.fabricType || product.apparelCategory || product.category || 'Cotton Fabric';

  // Line 4: barcode & Line 5: item code
  const itemCode = String(product.barcode || product.sku || '000000000000').trim();
  const barcodeSvg = generateBarcodeSvg(itemCode, { height: 38, moduleWidth: 2 });

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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Label - ${escapeHtml(itemCode)}</title>
  <style>
    @page {
      size: 50mm 30mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 50mm;
      height: 30mm;
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
      width: 50mm;
      height: 30mm;
      max-width: 50mm;
      max-height: 30mm;
      padding: 1mm 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      background: #ffffff !important;
      color: #000000 !important;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      border: 1px solid #000000;
    }
    .lbl-shop-name {
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    }
    .lbl-barcode-box {
      width: 96%;
      height: 11mm;
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
    }
    .lbl-item-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 8.5px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #000000 !important;
      line-height: 1;
    }
    .lbl-price {
      font-size: 10px;
      font-weight: 900;
      border-top: 1.5px solid #000000;
      width: 100%;
      padding-top: 1px;
      letter-spacing: 0.5px;
      color: #000000 !important;
      line-height: 1.1;
    }
  </style>
</head>
<body>
  ${labelsHtml}
</body>
</html>`;

  const zpl = generateZplLabel(product, shopSettings, count);
  const epl = generateEplLabel(product, shopSettings, count);

  executePrint(html, {
    deviceName,
    silent,
    type: 'label',
    zpl,
    epl,
    pageSize: { width: 50000, height: 30000 },
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
