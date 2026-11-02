const ICON_URL =
  "https://base44.app/api/apps/6984bc8fae105e5a06a39d65/files/mp/public/6984bc8fae105e5a06a39d65/8bf1f83c9_shop-area-icon.png";

/**
 * Custom Shop Areas mark. Used wherever the old book icon appeared so the
 * navigation group and page headers match.
 */
export default function ShopAreasIcon({ className = "w-4 h-4" }) {
  return <img src={ICON_URL} alt="" className={`${className} object-contain`} draggable={false} />;
}