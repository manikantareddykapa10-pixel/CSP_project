import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../../components/shared/Layout/Layout';
import API from '../../services/API';
import moment from 'moment';
import toast from 'react-hot-toast';
import { ProgressBar } from 'react-loader-spinner';

// ─────────────────────────────────────────────
// Organisation view — list of donors who donated through this org
// ─────────────────────────────────────────────
const OrgDonorList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/inventory/get-donars')
      .then(({ data }) => { if (data?.success) setData(data.donars); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <ProgressBar visible height="120" width="120" color="#d32f2f" ariaLabel="loading" />
    </div>
  );

  return (
    <div className="container mt-4">
      <h5 className="mb-3">
        <i className="fa-solid fa-hand-holding-medical me-2 text-danger"></i>
        Donors who donated through your organisation
      </h5>
      <table className="table table-bordered">
        <thead className="table-active">
          <tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-muted py-3">
              No donors yet — add inventory (IN) with a donor's email to see them here
            </td></tr>
          ) : data.map(record => (
            <tr key={record._id}>
              <td>
                <div className="d-flex align-items-center gap-2">
                  {record.profilePic && (
                    <img
                      src={record.profilePic}
                      alt=""
                      className="rounded-circle"
                      style={{ width: 36, height: 36, objectFit: 'cover' }}
                    />
                  )}
                  {record.name || `${record.organisationName} (ORG)`}
                </div>
              </td>
              <td>{record.email}</td>
              <td>{record.phone}</td>
              <td>{moment(record.createdAt).format('DD/MM/YYYY hh:mm A')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────
// Donor view — blood requests + set location
// ─────────────────────────────────────────────
const statusBadge = (status) => {
  const map = {
    pending:   { bg: '#fff3e0', color: '#e65100', label: '⏳ Pending' },
    accepted:  { bg: '#e8f5e9', color: '#2e7d32', label: '✅ Accepted' },
    completed: { bg: '#e3f2fd', color: '#1565c0', label: '🎉 Completed' },
    cancelled: { bg: '#f5f5f5', color: '#757575', label: '✖ Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.color, padding: '2px 10px', borderRadius: 12, fontWeight: 600, fontSize: 12 }}>
      {s.label}
    </span>
  );
};

const DonorView = () => {
  const { user } = useSelector(state => state.auth);
  const [donationHistory, setDonationHistory] = useState([]);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const [revealedContacts, setRevealedContacts] = useState({});
  const prevCountRef = useRef(0);

  const fetchAvailableRequests = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/available');
      if (data?.success) {
        if (prevCountRef.current > 0 && data.requests.length > prevCountRef.current) {
          toast('🔔 New blood request in your area!', { duration: 5000 });
        }
        prevCountRef.current = data.requests.length;
        setAvailableRequests(data.requests);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchMyAccepted = useCallback(async () => {
    try {
      const { data } = await API.get('/requests/mine');
      if (data?.success) setMyRequests(data.requests.filter(r =>
        (r.acceptedBy === user?._id || r.respondedByMe) && r.status !== 'cancelled'
      ));
    } catch (err) { console.error(err); }
  }, [user?._id]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await API.get('/inventory/get-donars');
        if (data?.success) setDonationHistory(data.donars);
      } catch (err) { console.error(err); }
      await Promise.all([fetchAvailableRequests(), fetchMyAccepted()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(() => { fetchAvailableRequests(); fetchMyAccepted(); }, 8000);
    return () => clearInterval(interval);
  }, [fetchAvailableRequests, fetchMyAccepted]);

  const setMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await API.patch('/auth/update-location', {
            lat: pos.coords.latitude, lng: pos.coords.longitude
          });
          if (data?.success) toast.success('Location updated! You now appear on the Blood Map.');
          else toast.error(data?.message || 'Could not update location');
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Error updating location');
        }
        setGeoLoading(false);
      },
      () => { toast.error('Location access denied. Please allow location in browser settings.'); setGeoLoading(false); }
    );
  };

  const acceptRequest = async (reqId) => {
    setAccepting(reqId);
    try {
      const { data } = await API.patch(`/requests/${reqId}/accept`);
      if (data?.success) {
        const rc = data.requesterContact;
        const name = rc.name || rc.hospitalName || rc.organisationName || '';
        toast.success(`Accepted! Contact: ${name} — 📞 ${rc.phone}`, { duration: 8000 });
        setRevealedContacts(prev => ({ ...prev, [reqId]: rc }));
        fetchAvailableRequests();
        fetchMyAccepted();
      } else {
        toast.error(data?.message || 'Could not accept');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error accepting request');
    }
    setAccepting(null);
  };

  const markComplete = async (id) => {
    try {
      const { data } = await API.patch(`/requests/${id}/complete`);
      if (data?.success) { toast.success('Donation marked complete!'); fetchMyAccepted(); }
    } catch (err) { toast.error('Error'); }
  };

  if (loading) return (
    <div className="d-flex justify-content-center mt-5">
      <ProgressBar visible height="120" width="120" color="#d32f2f" ariaLabel="loading" />
    </div>
  );

  return (
    <div className="container mt-3">
      {/* Location CTA */}
      <div className="alert d-flex align-items-center justify-content-between mb-3"
        style={{ background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 10 }}>
        <div>
          <i className="fa-solid fa-location-dot text-primary me-2"></i>
          <strong>Appear on the Blood Map</strong> — set your location so seekers can find you
        </div>
        <button className="btn btn-primary btn-sm px-3" onClick={setMyLocation} disabled={geoLoading}>
          {geoLoading
            ? <span className="spinner-border spinner-border-sm me-1"></span>
            : <i className="fa-solid fa-crosshairs me-1"></i>}
          {geoLoading ? 'Detecting...' : 'Set My Location'}
        </button>
      </div>

      {/* Available requests */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h5 className="mb-0">
            <i className="fa-solid fa-droplet text-danger me-2"></i>
            Blood Requests Near You
            <span className="badge bg-danger ms-2">{availableRequests.length}</span>
          </h5>
          <span className="text-muted" style={{ fontSize: 12 }}>
            <i className="fa-solid fa-rotate-right me-1"></i>Live — updates every 8s
          </span>
        </div>

        {availableRequests.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ background: '#fafafa', borderRadius: 10 }}>
            <i className="fa-solid fa-circle-check mb-2" style={{ fontSize: 32, color: '#ccc' }}></i>
            <p className="mb-0">No pending requests right now</p>
          </div>
        ) : (
          <div className="row g-3">
            {availableRequests.map(req => {
              const revealed = revealedContacts[req._id];
              return (
                <div key={req._id} className="col-md-6">
                  <div className="card h-100" style={{ borderRadius: 10, border: '1px solid #ffcdd2', background: '#fff8f8' }}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span style={{ fontSize: 32, fontWeight: 800, color: '#d32f2f' }}>{req.bloodGroup}</span>
                        {statusBadge(req.status)}
                      </div>
                      <div style={{ fontSize: 13, color: '#555' }}>
                        <div><b>{req.requesterName}</b> ({req.requesterRole})</div>
                        {req.address && <div><i className="fa-solid fa-location-dot me-1 text-muted"></i>{req.address}</div>}
                        {req.notes && <div className="text-muted mt-1">{req.notes}</div>}
                        <div className="text-muted mt-1">{moment(req.createdAt).fromNow()}</div>
                      </div>

                      {revealed ? (
                        <div className="mt-2 p-2 rounded" style={{ background: '#e8f5e9', border: '1px solid #a5d6a7' }}>
                          <strong style={{ color: '#2e7d32', fontSize: 13 }}>✅ Accepted — Contact Info:</strong>
                          <div style={{ fontSize: 13 }} className="mt-1">
                            <b>{revealed.name || revealed.hospitalName || ''}</b><br />
                            📞 <a href={`tel:${revealed.phone}`}>{revealed.phone}</a><br />
                            ✉️ {revealed.email}
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-danger btn-sm mt-2 px-3"
                          onClick={() => acceptRequest(req._id)} disabled={accepting === req._id}>
                          {accepting === req._id
                            ? <span className="spinner-border spinner-border-sm me-1"></span>
                            : null}
                          Accept &amp; Reveal Contact
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My accepted donations */}
      {myRequests.length > 0 && (
        <div className="mb-4">
          <h5 className="mb-3">
            <i className="fa-solid fa-handshake me-2 text-success"></i>My Accepted Donations
          </h5>
          {myRequests.map(r => (
            <div key={r._id} className="card mb-2" style={{ borderRadius: 10, border: '1px solid #c8e6c9' }}>
              <div className="card-body py-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#d32f2f' }}>{r.bloodGroup}</span>
                    <span className="ms-2">{statusBadge(r.status)}</span>
                    <span className="ms-2 text-muted" style={{ fontSize: 12 }}>
                      {r.requesterName}
                    </span>
                  </div>
                  {r.status === 'accepted' && (
                    <button className="btn btn-sm btn-success" onClick={() => markComplete(r._id)}>
                      <i className="fa-solid fa-check me-1"></i>Done
                    </button>
                  )}
                </div>
                <div className="mt-2 small">
                  {r.requesterPhone && (
                    <div><i className="fa-solid fa-phone me-1 text-muted"></i><a href={`tel:${r.requesterPhone}`}>{r.requesterPhone}</a></div>
                  )}
                  {r.address && (
                    <div><i className="fa-solid fa-location-dot me-1 text-muted"></i>{r.address}</div>
                  )}
                  {r.notes && (
                    <div className="mt-1"><strong>Patient details:</strong> {r.notes}</div>
                  )}
                  {(r.location_lat != null && r.location_lng != null) || r.address ? (
                    <a
                      className="btn btn-sm btn-outline-primary mt-2"
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        r.location_lat != null && r.location_lng != null
                          ? `${r.location_lat},${r.location_lng}`
                          : r.address
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fa-solid fa-route me-1"></i>Navigate to hospital
                    </a>
                  ) : (
                    <div className="text-muted mt-1">Hospital location was not provided.</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Donation history */}
      <h5 className="mb-3">
        <i className="fa-solid fa-clock-rotate-left me-2 text-secondary"></i>Donation History
      </h5>
      <table className="table table-hover">
        <thead className="table-light">
          <tr><th>Name</th><th>Email</th><th>Phone</th><th>Date</th></tr>
        </thead>
        <tbody>
          {donationHistory.length === 0 ? (
            <tr><td colSpan={4} className="text-center text-muted py-3">No donation history yet</td></tr>
          ) : donationHistory.map(record => (
            <tr key={record._id}>
              <td>{record.name || `${record.organisationName} (ORG)`}</td>
              <td>{record.email}</td>
              <td>{record.phone}</td>
              <td>{moment(record.createdAt).format('DD/MM/YYYY hh:mm A')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main export — routes to the right view by role
// ─────────────────────────────────────────────
const Donar = () => {
  const { user } = useSelector(state => state.auth);
  return (
    <Layout>
      {user?.role === 'organisation' ? <OrgDonorList /> : <DonorView />}
    </Layout>
  );
};

export default Donar;
