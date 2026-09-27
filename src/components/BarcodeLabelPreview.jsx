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
  const baseName = tagLabel || itemName || 'Garment Item';
  const effectiveSubtitle = tagSubtitle || color || '';
  const itemNameWithColor = effectiveSubtitle ? `${baseName} - ${effectiveSubtitle}` : baseName;
  const displayClothType = (clothType || 'Apparel & Fabric').toUpperCase();
  const cleanBarcode = String(barcode || '000000000000').trim();
  const formattedPrice = (parseFloat(price) || 0).toLocaleString();

  const barcodeSvgHtml = useMemo(() => {
    return generateBarcodeSvg(cleanBarcode, { height: 38, moduleWidth: 2 });
  }, [cleanBarcode]);

  return (
    <div className={`thermal-barcode-label-18x09 printable-sticker ${className}`}>
      {/* 1. Shop Name */}
      <div className="tbl-shop-name" title={displayShopName}>
        {displayShopName}
      </div>

      {/* 2. Item Name with Color */}
      <div className="tbl-item-name" title={itemNameWithColor}>
        {itemNameWithColor}
      </div>

      {/* 3. Cloth Type */}
      <div className="tbl-cloth-type" title={displayClothType}>
        {displayClothType}
      </div>

      {/* 4. Authentic Code 128 Barcode (Scannable on Screen & Print) */}
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
