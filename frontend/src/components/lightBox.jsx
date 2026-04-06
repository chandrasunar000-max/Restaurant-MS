import React from "react";
import "../assets/css/lightBox.css";

export default function LightBox({ item, onClose }) {
	if (!item) return null;
	return (
		<div className="lightbox-overlay" onClick={onClose}>
			<div className="lightbox-modal" onClick={e => e.stopPropagation()}>
				<button className="lightbox-cancel-badge" onClick={onClose} aria-label="Close lightbox">Close</button>
				<div className="lightbox-img-wrap" >
					{item.image ? (
						<img src={item.image} alt={item.name} className="lightbox-img" />
					) : (
						<div className="lightbox-placeholder">{item.name?.charAt(0) || "🍽"}</div>
					)}
				</div>
				<div className="lightbox-details" style={{ position:'relative', paddingBottom: 72 }}>
					<h2 className="lightbox-title">{item.name}</h2>
					<div className="lightbox-pills top">
						{item.category && <span className="lightbox-pill category">{item.category}</span>}
						{item.type && <span className="lightbox-pill type">{item.type}</span>}
						{item.spiceLevel ? <span className="lightbox-pill spice">Spice {item.spiceLevel}</span> : null}
					</div>
					{item.description && <p className="lightbox-description">{item.description}</p>}
					{item.sizes && Object.keys(item.sizes).length > 0 && (
						<div className="scroll-row">
							{Object.entries(item.sizes).map(([size, price]) => price ? (
								<span key={size} className="lightbox-pill price" style={{
									
									background:'rgba(0,0,0,0.08)',
									border:'1px solid #ddd',
									borderRadius:10,
									padding:'4px 8px',
									fontSize:12,
									whiteSpace:'nowrap'
								}}>
									{size}: ₹{Number(price).toFixed(2)}
								</span>
							) : null)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
