import { useMemo } from "react";
import QRPrintCard from "./QRPrintCard";

// Updated to show only print buttons and table numbers (no raw URL display).
// For each table we embed a QRPrintCard with restaurant branding.
export default function QRCodesForTables({ restaurantId, restaurantName = 'Restaurant', totalTables = 1, hidePreview = true, showVisibleLabel = true }) {
  const count = Math.max(1, Number(totalTables) || 1);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  return (
    <section className="QR-card" style={{ marginTop: 8 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
        alignItems: 'stretch'
      }}>
        {items.map((table) => (
          <div key={table} style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
            <QRPrintCard
              restaurantId={restaurantId}
              tableNumber={table}
              restaurantName={restaurantName}
              hidePreview={hidePreview}
              showVisibleLabel={showVisibleLabel}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
