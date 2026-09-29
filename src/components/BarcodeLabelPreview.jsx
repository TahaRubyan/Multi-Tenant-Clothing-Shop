import React, { useMemo } from 'react';
import { generateBarcodeSvg } from '../utils/printUtils';

/**
 * BarcodeLabelPreview Component
 * Renders high-contrast, crystal-clear 6-line thermal sticker preview matching the physical label printer output:
 * Line 1: shop name
 * Line 2: item name with color
 * Line 3: cloth type
 * Line 4: barcode (Authentic ISO/IEC 15417 Code 128 Set B vector)
 * Line 5: item code
 * Line 6: price
 */
export default function BarcodeLabelPreview({
  shopName = 'NOVA MEN AND WOMEN',
  itemName = 'Executive Cotton Kurta',
  tagLabel = '',
  tagSubtitle = '',
  color = 'Navy Blue',
  clothType = 'Wash & Wear Fabric',
  barcode = 'PAK-KRT-99201',
  price = 3500,
  className = '',
}) {
  const displayShopName = (shopName || 'TESSLO').toUpperCase();
  let baseName = tagLabel || itemName || 'Garment Item';
  baseName = baseName.replace(/\s*-\s*(Formal|Pret|Casual|Festive|Bridal|Silk|Cotton)$/gi, '').trim();

  let rawSubtitle = String(tagSubtitle || color || '').trim();
  rawSubtitle = rawSubtitle
    .replace(/\(\s*(.*?)\s*\(\s*([A-Za-z0-9]+)\s*\(\s*(\d+)\s*\)\s*\)\s*\)/g, '$1 ($2-$3)')
    .replace(/\(\s*([A-Za-z0-9]+)\s*\(\s*(\d+)\s*\)\s*\)/g, '($1-$2)')
    .replace(/\(\s*\)/g, '')
    .trim();

  const displayClothType = (clothType || 'Apparel & Fabric').toUpperCase();
  const typeAndColor = rawSubtitle ? `${displayClothType} • ${rawSubtitle}` : displayClothType;

  const cleanBarcode = String(barcode || '000000000000').trim();
  const formattedPrice = (parseFloat(price) || 0).toLocaleString();

  const barcodeSvgHtml = useMemo(() => {
    return generateBarcodeSvg(cleanBarcode, { height: 32, moduleWidth: 2, quietZoneModules: 14 });
  }, [cleanBarcode]);

  return (
    <div className={`thermal-barcode-label-18x09 printable-sticker ${className}`}>
      {/* 1. Shop Name */}
      <div className="tbl-shop-name" title={displayShopName}>
        {displayShopName}
      </div>

      {/* 2. Item Name */}
      <div className="tbl-item-name" title={baseName}>
        {baseName}
      </div>

      {/* 3. Item Type + Color */}
      <div className="tbl-cloth-type tbl-type-color" title={typeAndColor}>
        {typeAndColor}
      </div>

      {/* 4. Authentic Code 128 Barcode (Scannable on Screen & Thermal Print) */}
      <div
        className="tbl-barcode-box"
        dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
      />

      {/* 5. Item Code */}
      <div className="tbl-item-code font-mono">
        {cleanBarcode}
      </div>

      {/* 6. Price */}
      <div className="tbl-price font-mono">
        PRICE: Rs. {formattedPrice}
      </div>
    </div>
  );
}
