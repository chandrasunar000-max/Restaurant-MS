import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { getSocket, joinRestaurant } from "../api/socket";
import "../assets/css/Dashboard.css";

export default function RecentOrders() {
	// console.log('[RecentOrders] card-layout component mounted');
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [restaurantId, setRestaurantId] = useState("");
	const [activeTab, setActiveTab] = useState("pending"); // all | pending | accepted | rejected

	useEffect(() => {
		const load = async () => {
			try {
				const me = await api.get("/restaurants/me");
				const rid = me.data?._id || "";
				setRestaurantId(rid);
				const res = await api.get("/orders");
				setOrders(Array.isArray(res.data) ? res.data : []);
			} catch (e) {
				setError(e?.response?.data?.message || e.message || "Failed to load recent orders");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, []);

	useEffect(() => {
		if (!restaurantId) return;
		joinRestaurant(restaurantId);
		const s = getSocket();
		const onNew = (order) => {
			setOrders((prev) => {
				const exists = prev.some((o) => o._id === order._id);
				return exists ? prev : [order, ...prev];
			});
		};
		const onUpdate = (order) => {
			setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
		};
		s.on("order:new", onNew);
		s.on("order:update", onUpdate);
		return () => {
			s.off("order:new", onNew);
			s.off("order:update", onUpdate);
		};
	}, [restaurantId]);

	const updateStatus = async (id, status) => {
		try {
			const res = await api.put(`/orders/${id}/status`, { status });
			setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
		} catch (err) {
			alert(err?.response?.data?.message || err.message || "Failed to update status");
		}
	};

	// Bulk update helper for recent orders (iterative)
	const bulkUpdateStatus = async (ids, status) => {
		if (!ids.length) return;
		const failures = [];
		// Optimistic: mark locally first for snappy UI
		setOrders(prev => prev.map(o => ids.includes(o._id) ? { ...o, status } : o));
		for (const id of ids) {
			try {
				await api.put(`/orders/${id}/status`, { status });
			} catch (e) {
				failures.push(id);
			}
		}
		if (failures.length) {
			try {
				const restored = await Promise.all(failures.map(fid => api.get(`/orders/${fid}`)));
				const map = new Map(restored.map(r => [r.data._id, r.data]));
				setOrders(prev => prev.map(o => map.has(o._id) ? map.get(o._id) : o));
				alert(`Failed to update ${failures.length} order(s). They were restored.`);
			} catch (_) {
				alert(`Failed to restore ${failures.length} order(s). Please refresh manually.`);
			}
		}
	};

		const recent = useMemo(() => {
			const filtered = activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);
			const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
			return sorted; // no limit: show all
		}, [orders, activeTab]);

		const counts = useMemo(() => {
			const pending = orders.filter(o => o.status === 'pending').length;
			const accepted = orders.filter(o => o.status === 'accepted').length;
			const rejected = orders.filter(o => o.status === 'rejected').length;
			return { all: orders.length, pending, accepted, rejected };
		}, [orders]);

	const pendingIds = useMemo(() => orders.filter(o => o.status === 'pending').map(o => o._id), [orders]);

	if (loading) return <p className="muted">Loading recent orders…</p>;
	if (error) return <p className="error">{error}</p>;

		return (
				<div className="recent-card" style={{ padding: 16, marginTop: 12, height: "calc(100vh - 160px)", background: "linear-gradient(180deg, rgba(13,13,13,0.9), rgba(30,30,30,0.9))", borderRadius: 12 }}>
					<h3 className="recent-title fancy-title" style={{ marginTop: 0, color: "#F5F5F5" }}>{activeTab === "pending" ? "Pending Orders" : "Orders"}</h3>

							{/* Status Tabs + Bulk actions */}
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									<button
										className={`btn ${activeTab === "all" ? "btn-primary" : ""}`}
										onClick={() => setActiveTab("all")}
										style={activeTab === "all" ? { background: "#8B0000", borderColor: "#8B0000", color: "#fff" } : { background: "#ffffff", borderColor: "#e5e7eb" }}
									>
										All <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontWeight: 800, fontSize: '0.8rem' }}>{counts.all}</span>
									</button>
									<button
										className={`btn ${activeTab === "pending" ? "" : ""}`}
										onClick={() => setActiveTab("pending")}
										style={{
											background: activeTab === "pending" ? "#facc15" : "#fef9c3",
											color: "#713f12",
											borderColor: "#fde047",
										}}
									>
										Pending <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 999, background: '#fef08a', color: '#713f12', fontWeight: 800, fontSize: '0.8rem' }}>{counts.pending}</span>
									</button>
									<button
										className={`btn ${activeTab === "accepted" ? "" : ""}`}
										onClick={() => setActiveTab("accepted")}
										style={{
											background: activeTab === "accepted" ? "#22c55e" : "#dcfce7",
											color: "#065f46",
											borderColor: "#86efac",
										}}
									>
										Accepted <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 999, background: '#bbf7d0', color: '#065f46', fontWeight: 800, fontSize: '0.8rem' }}>{counts.accepted}</span>
									</button>
									<button
										className={`btn ${activeTab === "rejected" ? "" : ""}`}
										onClick={() => setActiveTab("rejected")}
										style={{
											background: activeTab === "rejected" ? "#ef4444" : "#fee2e2",
											color: "#7f1d1d",
											borderColor: "#fecaca",
										}}
									>
										Rejected <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 999, background: '#fecaca', color: '#7f1d1d', fontWeight: 800, fontSize: '0.8rem' }}>{counts.rejected}</span>
									</button>
								</div>
								{activeTab === 'pending' && pendingIds.length > 0 && (
									<div style={{ display: 'flex', gap: 8 }}>
										<button
											className="btn"
											style={{ background: '#0d9c49', color: '#fff', borderColor: '#0d9c49' }}
											onClick={() => bulkUpdateStatus(pendingIds, 'accepted')}
										>
											Accept All
										</button>
										<button
											className="btn"
											style={{ background: '#c62828', color: '#fff', borderColor: '#c62828' }}
											onClick={() => {
												if (window.confirm(`Reject all ${pendingIds.length} pending orders? This cannot be undone.`)) {
													bulkUpdateStatus(pendingIds, 'rejected');
												}
											}}
										>
											Reject All
										</button>
									</div>
								)}
							</div>
				{recent.length === 0 ? (
					<p className="muted" style={{ color: '#cbd5e1' }}>No recent orders.</p>
				) : (
						<div style={{ overflowY: "auto", paddingBottom: 8 }}>
							<div
								style={{
									display: 'flex',
									gap: 16,
									overflowX: 'auto',
									paddingBottom: 8,
									scrollSnapType: 'x mandatory'
								}}
							>
								{recent.map((o) => {
									const statusStyles = {
										pending: { bg: '#fef9c3', color: '#713f12', border: '#fde68a', label: 'Pending' },
										accepted: { bg: '#dcfce7', color: '#065f46', border: '#86efac', label: 'Accepted' },
										rejected: { bg: '#fee2e2', color: '#7f1d1d', border: '#fecaca', label: 'Rejected' },
										cancelled: { bg: '#fee2e2', color: '#7f1d1d', border: '#fecaca', label: 'Cancelled' },
									};
									const st = statusStyles[o.status] || { bg: '#e5e7eb', color: '#111827', border: '#e5e7eb', label: o.status };
									return (
										<div
											key={o._id}
											style={{
												minWidth: '90dvw',
												width: '90dvw',
												background: '#1E1E1E',
												color: '#F5F5F5',
												border: '1px solid #8B0000',
												borderRadius: 16,
												padding: 16,
												boxShadow: '0 10px 25px rgba(139,0,0,0.18)',
												scrollSnapAlign: 'start'
											}}
										>
											{/* Header */}
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(245,245,245,0.08)', paddingBottom: 8, marginBottom: 12 }}>
												<div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
													<div style={{ fontWeight: 800, fontSize: 18 }}>{o.roomNumber ? `Room #${o.roomNumber}` : `Table #${o.tableNumber}`}</div>
													<div style={{ opacity: 0.8 }}>Order: {o.orderId}</div>
													<div style={{ opacity: 0.6 }}>{new Date(o.createdAt).toLocaleString()}</div>
												</div>
												<span
													style={{
														background: st.bg,
														color: st.color,
														border: `1px solid ${st.border}`,
														fontWeight: 800,
														padding: '4px 10px',
														borderRadius: 999
													}}
												>
													{st.label}
												</span>
											</div>

											{/* Customer */}
											<div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 10 }}>
												<div style={{ opacity: 0.9 }}>Name: <strong>{o.customerName || '—'}</strong></div>
												<div style={{ opacity: 0.9 }}>Phone: <strong>{o.customerPhone || '—'}</strong></div>
											</div>

											{/* Items */}
											<div style={{ marginBottom: 10 }}>
												<div style={{ fontWeight: 700, marginBottom: 6, color: '#f3f4f6' }}>Items</div>
												<ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
													{(o.items || []).map((it) => (
														<li key={it._id || it.item}>
															{it.item?.name || it.item} {it.size ? `(${it.size})` : ''} × {it.quantity}
														</li>
													))}
												</ul>
											</div>

											{/* Totals + Actions */}
											<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
												<div style={{ display: 'grid', gap: 4 }}>
													<div>Subtotal: <strong>₹{['cancelled','rejected'].includes(o.status) ? 0 : o.total}</strong></div>
													<div>Tip: <strong>{o.tipForChef || '—'}</strong></div>
												</div>
												<div>
													{o.status === 'pending' ? (
														<div style={{ display: 'flex', gap: 8 }}>
															<button className="btn" onClick={() => updateStatus(o._id, 'rejected')} style={{ background: '#7f1d1d', color: '#fff', borderColor: '#7f1d1d' }}>Reject</button>
															<button className="btn btn-primary" onClick={() => updateStatus(o._id, 'accepted')} style={{ background: '#8B0000', borderColor: '#8B0000', color: '#fff' }}>Accept</button>
														</div>
													) : (
														<span className="muted" style={{ color: '#cbd5e1' }}>—</span>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
				)}
			</div>
		);
}

