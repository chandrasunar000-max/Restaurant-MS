import { useMemo } from "react";
import QRPrintCard from "./QRPrintCard";

// Updated to show only print buttons and room numbers (no raw URL display).
// For each room we embed a QRPrintCard with restaurant branding.
export default function QRCodesForRooms({ restaurantId, restaurantName = 'Restaurant', totalRooms = 0, hidePreview = true, showVisibleLabel = true }) {
  const count = Math.max(0, Number(totalRooms) || 0);
  const items = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  if (count === 0) return null;

  return (
    <section className="QR-card" style={{ marginTop: 8 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
        alignItems: 'stretch'
      }}>
        {items.map((room) => (
          <div key={room} style={{ display:'flex', flexDirection:'column', alignItems:'flex-start' }}>
            <QRPrintCard
              restaurantId={restaurantId}
              roomNumber={room}
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