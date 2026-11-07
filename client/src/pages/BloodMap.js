import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../components/shared/Layout/Layout';
import API from '../services/API';
import toast from 'react-hot-toast';

const BLOOD_GROUPS = ['All', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const DEFAULT_CENTER = [16.48, 80.82]; // Gudivada-Vijayawada region
const PROFILE_PLACEHOLDER = '/profile-placeholder.svg';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[character]));

const profileImageSource = (image) => {
  if (typeof image === 'string' &&
      (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) ||
       /^\/demo-profiles\/donor-[1-5]\.svg$/.test(image))) {
    return image;
  }
  return PROFILE_PLACEHOLDER;
};

const BloodMap = () => {
  const { user } = useSelector(state => state.auth);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersLayer = useRef(null);
  const routeLayer = useRef(null);
  const routeRequestRef = useRef(0);
  const routeToDonorRef = useRef(null);
  const selectedDonorRef = useRef(null);
  const awaitingMapOriginRef = useRef(false);
  const [mapData, setMapData] = useState({ donors: [], requests: [] });
  const [filter, setFilter] = useState('All');
  const [selectedRequestId, setSelectedRequestId] = useState(
    () => new URLSearchParams(window.location.search).get('request')
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stats, setStats] = useState({ donors: 0, pending: 0, accepted: 0 });
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [awaitingMapOrigin, setAwaitingMapOrigin] = useState(false);
  const selectedRequest = mapData.requests.find(request => request.id === selectedRequestId);
  const selectedHospitalRequest = user?.role === 'hospital' && selectedRequest?.requestedBy === user?._id
    ? selectedRequest
    : null;

  const routeToDonor = useCallback(async (donor, originOverride) => {
    const requestId = ++routeRequestRef.current;
    selectedDonorRef.current = donor;
    setRouteInfo(null);
    setRouteLoading(true);
    routeLayer.current?.clearLayers();

    let origin = originOverride || user?.location;
    if (!origin && navigator.geolocation) {
      try {
        origin = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
            () => reject(new Error('Location permission was denied')),
            { timeout: 10000 }
          );
        });
      } catch {
        if (requestId !== routeRequestRef.current) return;
        setRouteLoading(false);
        awaitingMapOriginRef.current = true;
        setAwaitingMapOrigin(true);
        toast('Allow location access, or click the map to choose your starting point.', { duration: 6000 });
        return;
      }
    }

    if (requestId !== routeRequestRef.current) return;
    if (!origin || !Number.isFinite(Number(origin.lat)) || !Number.isFinite(Number(origin.lng))) {
      setRouteLoading(false);
      awaitingMapOriginRef.current = true;
      setAwaitingMapOrigin(true);
      toast('Click the map to choose your starting point.');
      return;
    }

    awaitingMapOriginRef.current = false;
    setAwaitingMapOrigin(false);
    try {
      const coordinates = `${Number(origin.lng)},${Number(origin.lat)};${Number(donor.lng)},${Number(donor.lat)}`;
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false&alternatives=true`
      );
      if (!response.ok) throw new Error('The routing service is unavailable. Please try again.');
      const result = await response.json();
      if (requestId !== routeRequestRef.current) return;
      if (result.code !== 'Ok' || !result.routes?.length) {
        throw new Error('No driving route could be found between these locations.');
      }

      const shortestRoute = result.routes.reduce((shortest, candidate) =>
        candidate.distance < shortest.distance ? candidate : shortest
      );
      const L = window.L;
      const route = L.geoJSON(shortestRoute.geometry, {
        style: { color: '#1565c0', weight: 6, opacity: 0.85 }
      });
      routeLayer.current?.clearLayers();
      route.addTo(routeLayer.current);
      leafletMap.current.fitBounds(route.getBounds(), { padding: [36, 36] });
      setRouteInfo({
        donorName: donor.name,
        donorLat: donor.lat,
        donorLng: donor.lng,
        distanceKm: (shortestRoute.distance / 1000).toFixed(1),
        durationMinutes: Math.round(shortestRoute.duration / 60),
        origin
      });
    } catch (error) {
      if (requestId === routeRequestRef.current) {
        toast.error(error.message || 'Could not calculate a route to this donor.');
      }
    } finally {
      if (requestId === routeRequestRef.current) setRouteLoading(false);
    }
  }, [user?.location]);

  routeToDonorRef.current = routeToDonor;

  const fetchMapData = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/map');
      if (data?.success) {
        setMapData(data);
        setLoadError('');
        setStats({
          donors: data.donors.length,
          pending: data.requests.filter(r => r.status === 'pending').length,
          accepted: data.requests.filter(r => r.status === 'accepted').length,
        });
      } else {
        setLoadError(data?.message || 'Could not load map data. Please try again.');
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Could not load map data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Init map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    leafletMap.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    map.on('click', event => {
      if (awaitingMapOriginRef.current && selectedDonorRef.current) {
        routeToDonorRef.current?.(selectedDonorRef.current, event.latlng);
      }
    });

    // Handle broadcast and donor-response actions rendered in Leaflet popups.
    map.on('popupopen', (e) => {
      const popup = e.popup.getElement();
      const respondButton = popup?.querySelector('[data-respond-id]');
      if (respondButton) {
        respondButton.addEventListener('click', async () => {
          const reqId = respondButton.getAttribute('data-respond-id');
          respondButton.disabled = true;
          respondButton.textContent = 'Sending...';
          try {
            const { data } = await API.patch(`/requests/${reqId}/respond`);
            if (data?.success) {
              toast.success(data.message || 'Your response was sent to the hospital');
              map.closePopup();
              fetchMapData();
            } else {
              toast.error(data?.message || 'Could not send your response');
              respondButton.disabled = false;
              respondButton.textContent = 'I can donate';
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || 'Error sending response');
            respondButton.disabled = false;
            respondButton.textContent = 'I can donate';
          }
        });
      }

      const acceptButton = popup?.querySelector('[data-accept-id]');
      if (acceptButton) {
        acceptButton.addEventListener('click', async () => {
          const reqId = acceptButton.getAttribute('data-accept-id');
          acceptButton.disabled = true;
          acceptButton.textContent = 'Accepting...';
          try {
            const { data } = await API.patch(`/requests/${reqId}/accept`);
            if (data?.success) {
              const requester = data.requesterContact;
              toast.success(`Accepted! Requester: ${requester.name || requester.hospitalName || ''} — ${requester.phone}`);
              map.closePopup();
              fetchMapData();
            } else {
              toast.error(data?.message || 'Could not accept');
              acceptButton.disabled = false;
              acceptButton.textContent = 'Accept Request';
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || 'Error accepting request');
            acceptButton.disabled = false;
            acceptButton.textContent = 'Accept Request';
          }
        });
      }

      const broadcastButton = popup?.querySelector('[data-broadcast-id]');
      if (broadcastButton) {
        broadcastButton.addEventListener('click', async () => {
          const reqId = broadcastButton.getAttribute('data-broadcast-id');
          broadcastButton.disabled = true;
          broadcastButton.textContent = 'Sending to matching donors...';
          try {
            const { data } = await API.patch(`/requests/${reqId}/broadcast`);
            if (data?.success) {
              toast.success(data.message);
              map.closePopup();
              fetchMapData();
            } else {
              toast.error(data?.message || 'Could not send the request');
              broadcastButton.disabled = false;
              broadcastButton.textContent = 'Send request to matching donors';
            }
          } catch (err) {
            toast.error(err?.response?.data?.message || 'Error sending request');
            broadcastButton.disabled = false;
            broadcastButton.textContent = 'Send request to matching donors';
          }
        });
      }
    });

    return () => {
      map.remove();
      leafletMap.current = null;
      routeLayer.current = null;
    };
  }, [fetchMapData]);

  // Render markers whenever data or filter changes
  useEffect(() => {
    if (!leafletMap.current || !markersLayer.current) return;
    const L = window.L;
    markersLayer.current.clearLayers();

    const isDonor = user?.role === 'donar';
    const isHospital = user?.role === 'hospital';
    const canRouteToDonor = ['admin', 'hospital'].includes(user?.role);
    const requestBloodGroup = isDonor ? user?.bloodGroup : filter;

    // Donor markers (blue)
    mapData.donors.forEach(d => {
      if (selectedHospitalRequest) {
        if (d.bloodGroup !== selectedHospitalRequest.bloodGroup || !d.isAvailable) return;
      } else if (filter !== 'All' && d.bloodGroup !== filter) return;
      const hasResponded = selectedHospitalRequest?.respondedDonorIds.includes(d.id);
      const markerColor = hasResponded ? '#2e7d32' : '#1a73e8';
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: 13, fillColor: markerColor, color: hasResponded ? '#1b5e20' : '#0d47a1', weight: 2, fillOpacity: 0.9
      });
      marker.on('click', () => {
        if (canRouteToDonor) routeToDonor(d);
      });
      marker.bindPopup(`
        <div style="min-width:220px;max-width:260px;padding:4px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <img src="${escapeHtml(profileImageSource(d.profilePic))}" alt=""
              style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${markerColor}" />
            <div>
              <strong style="color:${markerColor}">${hasResponded ? '✅ Responded' : '🩸 Donor Profile'}</strong><br/>
              <b>${escapeHtml(d.name || 'Donor')}</b>
            </div>
          </div>
          <div>Blood Group: <b>${escapeHtml(d.bloodGroup || 'Not specified')}</b></div>
          ${d.address ? `<div>📍 ${escapeHtml(d.address)}</div>` : ''}
          <div>Status: <span style="color:${d.isAvailable ? 'green' : 'gray'}">${d.isAvailable ? '✅ Available' : '⏸ Unavailable'}</span></div>
          ${canRouteToDonor ? '<small style="display:block;margin-top:8px">Click this donor for the shortest available driving route.</small>' : ''}
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });

    // Request markers
    mapData.requests.forEach(r => {
      if (!requestBloodGroup || (requestBloodGroup !== 'All' && r.bloodGroup !== requestBloodGroup)) return;
      const isPending = r.status === 'pending';
      const isSelected = r.id === selectedRequestId;
      const color = isSelected && r.broadcasted ? '#2e7d32' : isPending ? '#d32f2f' : '#f57c00';
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 15, fillColor: color, color: isPending ? '#b71c1c' : '#e65100',
        weight: 2, fillOpacity: 0.85
      });

      const hasResponded = r.respondedDonorIds.includes(user?._id);
      const responseButton = (isDonor && isPending && r.broadcasted)
        ? hasResponded
          ? '<div style="margin-top:8px;color:#2e7d32;font-weight:bold">✅ Your response was sent</div>'
          : `<button data-respond-id="${r.id}" style="margin-top:8px;width:100%;padding:5px 10px;background:#2e7d32;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">I can donate</button>`
        : '';
      const acceptLegacyButton = (isDonor && isPending && !r.broadcasted && r.requesterRole === 'organisation')
        ? `<button data-accept-id="${r.id}" style="margin-top:8px;width:100%;padding:5px 10px;background:#d32f2f;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">Accept Request</button>`
        : '';
      const matchedDonors = mapData.donors.filter(d =>
        d.bloodGroup === r.bloodGroup && d.isAvailable &&
        Number.isFinite(Number(d.lat)) && Number.isFinite(Number(d.lng))
      ).length;
      const canBroadcast = isHospital && r.requestedBy === user?._id && isPending && !r.broadcasted;
      const broadcastButton = canBroadcast
        ? `<button data-broadcast-id="${r.id}" style="margin-top:8px;width:100%;padding:6px 10px;background:#1565c0;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">Send request to ${matchedDonors} matching donor${matchedDonors === 1 ? '' : 's'}</button>`
        : '';
      const donorResponseCount = r.respondedDonorIds.length;

      marker.bindPopup(`
        <div style="min-width:220px;max-width:260px;padding:4px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <img src="${escapeHtml(profileImageSource(r.requesterProfilePic))}" alt=""
              style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${color}" />
            <div>
              <strong style="color:${color}">${isPending ? '🆘 Blood Needed' : '🟠 In Progress'}</strong><br/>
              <b>${escapeHtml(r.requesterName || 'Requester')}</b><br/>
              <small>${escapeHtml(r.requesterRole || 'User')}</small>
            </div>
          </div>
          Group needed: <b style="font-size:16px">${escapeHtml(r.bloodGroup)}</b><br/>
          ${r.address ? `📍 ${escapeHtml(r.address)}<br/>` : ''}
          ${r.notes ? `<div style="margin-top:6px"><b>Patient details:</b> ${escapeHtml(r.notes)}</div>` : ''}
          Status: <b>${escapeHtml(r.status.toUpperCase())}</b><br/>
          ${r.broadcasted ? `<span style="color:#2e7d32">Responses: ${donorResponseCount}</span>` : ''}
          ${broadcastButton}
          ${responseButton}
          ${acceptLegacyButton}
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });
  }, [mapData, filter, user, routeToDonor, selectedRequestId, selectedHospitalRequest]);

  // Initial fetch + polling every 15s
  useEffect(() => {
    fetchMapData();
    const interval = setInterval(fetchMapData, 15000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  return (
    <Layout>
      <div className="container-fluid px-4 mt-3">
        {/* Stats bar */}
        {loadError && (
          <div className="alert alert-danger d-flex justify-content-between align-items-center py-2">
            <span>{loadError}</span>
            <button className="btn btn-sm btn-outline-danger" onClick={fetchMapData}>Retry</button>
          </div>
        )}
        <div className="row g-2 mb-3">
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#e3f2fd' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#1a73e8' }}></i>
              <span><b>{stats.donors}</b> Donors on map</span>
            </div>
          </div>
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#ffebee' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#d32f2f' }}></i>
              <span><b>{stats.pending}</b> Pending requests</span>
            </div>
          </div>
          <div className="col">
            <div className="d-flex align-items-center p-2 rounded" style={{ background: '#fff3e0' }}>
              <i className="fa-solid fa-circle-dot me-2" style={{ color: '#f57c00' }}></i>
              <span><b>{stats.accepted}</b> In progress</span>
            </div>
          </div>
          <div className="col-auto d-flex align-items-center gap-2">
            {user?.role === 'donar' ? (
              <span className="small text-muted">
                Showing requests for your blood group: <strong>{user.bloodGroup || 'Not set'}</strong>
              </span>
            ) : user?.role === 'hospital' ? (
              <>
                <label htmlFor="request-match-select" className="mb-0 fw-semibold">Request:</label>
                <select
                  id="request-match-select"
                  className="form-select form-select-sm"
                  style={{ width: '240px' }}
                  value={selectedRequestId || ''}
                  onChange={event => setSelectedRequestId(event.target.value || null)}
                >
                  <option value="">All donors</option>
                  {mapData.requests
                    .filter(request => request.requestedBy === user?._id && request.status === 'pending')
                    .map(request => (
                      <option key={request.id} value={request.id}>
                        {request.bloodGroup} — {request.address || request.requesterName}
                      </option>
                    ))}
                </select>
                {selectedHospitalRequest && (
                  <span className="small text-success">
                    Showing available {selectedHospitalRequest.bloodGroup} donors
                  </span>
                )}
              </>
            ) : (
              <>
                <label className="mb-0 fw-semibold">Filter:</label>
                <select className="form-select form-select-sm" style={{ width: '90px' }}
                  value={filter} onChange={e => setFilter(e.target.value)}>
                  {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
                </select>
              </>
            )}
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchMapData}>
              <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="d-flex gap-3 mb-2" style={{ fontSize: '13px' }}>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#1a73e8', marginRight: 4 }}></span>Donor</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#d32f2f', marginRight: 4 }}></span>Pending Request</span>
          <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#f57c00', marginRight: 4 }}></span>Accepted (In Progress)</span>
          {user?.role === 'hospital' && (
            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#2e7d32', marginRight: 4 }}></span>Donor responded</span>
          )}
        </div>

        {routeInfo && (
          <div className="alert alert-primary d-flex flex-wrap justify-content-between align-items-center gap-2 py-2 mb-2">
            <span>
              <i className="fa-solid fa-route me-2"></i>
              Shortest available driving route to <strong>{routeInfo.donorName}</strong>:
              {' '}{routeInfo.distanceKm} km · about {routeInfo.durationMinutes} min
            </span>
            <div className="d-flex gap-2">
              <a
                className="btn btn-sm btn-outline-primary"
                href={`https://www.google.com/maps/dir/?api=1&origin=${routeInfo.origin.lat},${routeInfo.origin.lng}&destination=${routeInfo.donorLat},${routeInfo.donorLng}&travelmode=driving`}
                target="_blank"
                rel="noreferrer"
              >
                Open directions
              </a>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  routeRequestRef.current++;
                  routeLayer.current?.clearLayers();
                  selectedDonorRef.current = null;
                  awaitingMapOriginRef.current = false;
                  setRouteLoading(false);
                  setAwaitingMapOrigin(false);
                  setRouteInfo(null);
                }}
              >
                Clear route
              </button>
            </div>
          </div>
        )}
        {awaitingMapOrigin && (
          <div className="alert alert-warning py-2 mb-2">
            Click the map to set your starting point and display the route to the selected donor.
          </div>
        )}
        {routeLoading && (
          <div className="alert alert-info py-2 mb-2">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            Finding the shortest available driving route...
          </div>
        )}

        {/* Map container */}
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1000, background: 'white', padding: '12px 24px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <div className="spinner-border spinner-border-sm text-danger me-2"></div> Loading map...
            </div>
          )}
          <div ref={mapRef} style={{ height: '68vh', width: '100%', borderRadius: '12px', border: '2px solid #e9ecef' }} />
        </div>

        <p className="text-muted mt-2" style={{ fontSize: '12px' }}>
          <i className="fa-solid fa-rotate-right me-1"></i>Auto-refreshes every 15 seconds.
          {user?.role === 'donar'
            ? ' Click red markers to accept blood requests.'
            : ['admin', 'hospital'].includes(user?.role)
              ? ' Click a donor to show the shortest available driving route from your saved or current location.'
              : ' Click markers for details.'}
        </p>
      </div>
    </Layout>
  );
};

export default BloodMap;
