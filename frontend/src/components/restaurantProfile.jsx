import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import "../assets/css/RestaurantProfile.css";
import QRCodesForTables from "./QRCodesForTables";
import QRCodesForRooms from "./QRCodesForRooms";

export default function RestaurantProfile() {
	const [profile, setProfile] = useState({ _id: "", name: "", branch: "", address: "", pincode: "", image: "", plan: "free", totalTables: 1, totalRooms: 0, esewaId: "", geofenceEnabled: false, geofenceRadiusMeters: 0 });
	const [form, setForm] = useState({ name: "", branch: "", address: "", pincode: "", image: "", totalTables: 1, totalRooms: 0, esewaId: "", geofenceEnabled: false, geofenceRadiusMeters: 0 });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const [activeTab, setActiveTab] = useState("profile");
	const [isEditing, setIsEditing] = useState(false);
	const [logoType, setLogoType] = useState('url');
	const [logoFile, setLogoFile] = useState(null);

	// Resolve image URL: if image starts with http(s) return as-is; otherwise prepend the backend host
	const getRestaurantImageUrl = useCallback((img) => {
		if (!img) return null;
		// If it's already an absolute URL (e.g. cloudinary, s3, http...) or data URI, return as is
		if (/^https?:\/\//i.test(img)) return img;
		try {
			// Use the axios API base URL and strip the trailing '/api' segment if present
			const base = api?.defaults?.baseURL || "";
			const host = base.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
			if (host) {
				const p = img.startsWith('/') ? img : `/${img}`;
				return `${host}${p}`;
			}
			// Fallback to current origin
			if (typeof window !== 'undefined' && window.location && window.location.origin) {
				const origin = window.location.origin.replace(/\/+$/, '');
				const p = img.startsWith('/') ? img : `/${img}`;
				return `${origin}${p}`;
			}
			return img;
		} catch (_) {
			return img;
		}
	}, []);

	const fetchProfile = useCallback(async () => {
		try {
			const res = await api.get("restaurants/me");
			const data = res.data || {};
			setProfile(data);
			setForm({
				name: data.name || "",
				branch: data.branch || "",
				address: data.address || "",
				pincode: data.pincode || "",
				image: data.image || "",
				totalTables: data.totalTables ?? 1,
				totalRooms: data.totalRooms ?? 0,
				esewaId: data.esewaId || "",
				geofenceEnabled: !!data.geofenceEnabled,
				geofenceRadiusMeters: Number(data.geofenceRadiusMeters) || 0,
			});
			if (data.image && !data.image.startsWith('http')) {
				setLogoType('file');
			} else {
				setLogoType('url');
			}
		} catch (err) {
			setError(err?.response?.data?.message || err.message || "Failed to load profile");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchProfile();
	}, [fetchProfile]);

	const startEdit = () => {
		setIsEditing(true);
		setMessage("");
		setError("");
		setForm({
			name: profile.name || "",
			branch: profile.branch || "",
			address: profile.address || "",
			pincode: profile.pincode || "",
			image: profile.image || "",
			totalTables: profile.totalTables ?? 1,
			totalRooms: profile.totalRooms ?? 0,
			esewaId: profile.esewaId || "",
			geofenceEnabled: !!profile.geofenceEnabled,
			geofenceRadiusMeters: Number(profile.geofenceRadiusMeters) || 0,
		});
	};

	const cancelEdit = () => {
		setIsEditing(false);
		setLogoFile(null);
		if (profile.image && !profile.image.startsWith('http')) {
			setLogoType('file');
		} else {
			setLogoType('url');
		}
		setMessage("");
		setError("");
	};

	const handleLogoFileChange = (e) => {
		setLogoFile(e.target.files[0]);
	};

	const saveEdit = async () => {
		setSaving(true);
		setMessage("");
		setError("");

		try {
			const payload = { ...form };

			if (logoType === 'file' && logoFile) {
				const formData = new FormData();
				formData.append('logo', logoFile);
				const logoRes = await api.post('/restaurants/me/logo', formData, {
					headers: { 'Content-Type': 'multipart/form-data' }
				});
				if (logoRes.data.restaurant?.image) {
					payload.image = logoRes.data.restaurant.image;
				}
				setLogoFile(null); 
			}
			
			const res = await api.put("/restaurants/me", payload);
			const data = res.data || {};

			setProfile(data);
			setForm(data);
			
			setIsEditing(false);
			setMessage("Profile updated successfully.");
		} catch (e) {
			setError(e?.response?.data?.message || e.message || "Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	return (
		<main className="profile-page" style={{ paddingTop: 8 }}>
			<header className="profile-header">
				<div className="row">
					<div>
						<h1 className="title">Restaurant Profile</h1>
						<p className="subtitle">Manage your basic info and settings.</p>
					</div>
					<div className="actions">
						{!isEditing ? (
							<button className="btn btn-primary" onClick={startEdit}>Edit</button>
						) : (
							<div className="edit-actions">
								<button className="btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
								<button className="btn btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
							</div>
						)}
					</div>
				</div>
			</header>

			{loading && <div className="loading">Loading…</div>}
			{error && <div role="alert" className="error">{error}</div>}
			{message && <div className="msg success" role="status">{message}</div>}

			{!loading && !error && profile?._id && (
				<>
					<nav style={{ display: 'flex', gap: 8, marginTop: 12 }}>
						{['profile', 'settings', 'qrcodes'].map((t) => (
							<button
								key={t}
								className={`btn ${activeTab === t ? 'btn-primary' : ''}`}
								onClick={() => setActiveTab(t)}
								type="button"
							>
								{t === 'profile' ? 'Profile' : t === 'settings' ? 'Settings' : 'QR Codes'}
							</button>
						))}
					</nav>

					{activeTab === 'profile' && (
						<section className="profile-card">
							<div className="profile-top">
								<div className="avatar-wrap">
									{profile.image ? (
										<img src={getRestaurantImageUrl(profile.image)} alt={profile.name || 'Logo'} />
									) : (
										<div className="avatar-placeholder">{(profile.name || 'R').charAt(0).toUpperCase()}</div>
									)}
								</div>
								<div>
									<div className="id-line">ID: {profile._id}</div>
									<div>Plan: {String(profile.plan || 'free').toUpperCase()}</div>
								</div>
							</div>
							<form className="fields-grid" onSubmit={(e) => e.preventDefault()}>
								<div className="field">
									<label>Name</label>
									<input value={isEditing ? form.name : (profile.name || '')} onChange={(e) => setForm({ ...form, name: e.target.value })} readOnly={!isEditing} />
								</div>
								<div className="field">
									<label>Branch</label>
									<input value={isEditing ? form.branch : (profile.branch || '')} onChange={(e) => setForm({ ...form, branch: e.target.value })} readOnly={!isEditing} />
								</div>
								<div className="field span-2">
									<label>Address</label>
									<textarea value={isEditing ? form.address : (profile.address || '')} onChange={(e) => setForm({ ...form, address: e.target.value })} readOnly={!isEditing} />
								</div>
								<div className="field">
									<label>Pincode</label>
									<input value={isEditing ? form.pincode : (profile.pincode || '')} onChange={(e) => setForm({ ...form, pincode: e.target.value })} readOnly={!isEditing} />
								</div>
								<div className="field">
									<label>Total Tables</label>
									<input type="number" min="1" step="1" value={isEditing ? (form.totalTables || 1) : (profile.totalTables ?? 1)} onChange={(e) => setForm({ ...form, totalTables: e.target.valueAsNumber || Number(e.target.value) || 1 })} readOnly={!isEditing} />
								</div>
								<div className="field">
									<label>Total Rooms</label>
									<input type="number" min="0" step="1" value={isEditing ? (form.totalRooms || 0) : (profile.totalRooms ?? 0)} onChange={(e) => setForm({ ...form, totalRooms: e.target.valueAsNumber || Number(e.target.value) || 0 })} readOnly={!isEditing} />
								</div>
							</form>
						</section>
					)}

					{activeTab === 'settings' && (
						<section className="profile-card">
							<form className="fields-grid" onSubmit={(e) => e.preventDefault()}>
								<div className="field span-2">
									<label>Logo</label>
									{isEditing ? (
										<div>
											<div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
												<label>
													<input type="radio" value="url" checked={logoType === 'url'} onChange={() => setLogoType('url')} />
													URL
												</label>
												<label>
													<input type="radio" value="file" checked={logoType === 'file'} onChange={() => setLogoType('file')} />
													Upload File
												</label>
											</div>
											{logoType === 'url' ? (
												<input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://example.com/logo.png" />
											) : (
												<input type="file" onChange={handleLogoFileChange} accept="image/*" />
											)}
										</div>
									) : (
										<input value={profile.image || ''} readOnly placeholder="Logo URL or path" />
									)}
								</div>
								<div className="field span-2">
									<label>Payment eSewa ID (optional)</label>
									<input value={isEditing ? form.esewaId : (profile.esewaId || '')} onChange={(e) => setForm({ ...form, esewaId: e.target.value })} readOnly={!isEditing} placeholder="eSewa ID (mobile or email)" />
									<small style={{ color: '#999' }} className="hint">Used for payment QR codes in customer invoices</small>
								</div>

								<div className="field">
									<label>Geofencing</label>
									<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
										<label className="switch" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
											<input type="checkbox" disabled={!isEditing} checked={isEditing ? !!form.geofenceEnabled : !!profile.geofenceEnabled} onChange={(e) => setForm({ ...form, geofenceEnabled: e.target.checked })} />
											<span>{(isEditing ? form.geofenceEnabled : profile.geofenceEnabled) ? 'On' : 'Off'}</span>
										</label>
									</div>
									<small style={{ color: '#fff' }} className="hint">When On, guests must be within your set radius to place orders.</small>
								</div>
								{(isEditing ? form.geofenceEnabled : profile.geofenceEnabled) && (
									<div className="field">
										<label>Allowed radius</label>
										<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
											<input type="range" min={10} max={100} step={5} disabled={!isEditing || profile.plan === 'free'} value={isEditing ? (Number(form.geofenceRadiusMeters) || 0) : (Number(profile.geofenceRadiusMeters) || 0)} onChange={(e) => setForm({ ...form, geofenceRadiusMeters: e.target.valueAsNumber || Number(e.target.value) || 0 })} />
											<span style={{ color: '#07ff2c' }}> {isEditing ? (Number(form.geofenceRadiusMeters) || 0) : (Number(profile.geofenceRadiusMeters) || 0)} m</span>
										</div>
										<small style={{ color: '#fff' }} className="hint">Choose 10–100 meters. Center uses your registered location.</small>
									</div>
								)}
							</form>
						</section>
					)}

					{activeTab === 'qrcodes' && (
						<section className="QR-card">
							<p>Print QR for each table below. Preview includes URL for testing.</p>
							<QRCodesForTables
								restaurantId={profile._id}
								restaurantName={profile.name}
								totalTables={profile.totalTables ?? 1}
								hidePreview={true}
								showVisibleLabel={true}
							/>
							{(profile.totalRooms ?? 0) > 0 && (
								<>
									<p style={{ marginTop: 24 }}>Print QR for each room below. Preview includes URL for testing.</p>
									<QRCodesForRooms
										restaurantId={profile._id}
										restaurantName={profile.name}
										totalRooms={profile.totalRooms ?? 0}
										hidePreview={true}
										showVisibleLabel={true}
									/>
								</>
							)}
						</section>
					)}
				</>
			)}
		</main>
	);
}
