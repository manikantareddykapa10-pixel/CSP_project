const { getDb, generateId } = require('../config/db');

const createRequest = async (req, res) => {
  try {
    const { bloodGroup, location_lat, location_lng, address, notes } = req.body;
    const requestedBy = req.body.userId;
    if (!bloodGroup) return res.status(400).json({ success: false, message: 'Blood group required' });
    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO requests (_id, bloodGroup, requestedBy, status, location_lat, location_lng, address, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
    `).run(id, bloodGroup, requestedBy, location_lat || null, location_lng || null, address || '', notes || '', now, now);
    const created = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    return res.status(201).json({ success: true, message: 'Blood request created', request: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error creating request', error: error.message });
  }
};

const getAvailableRequests = async (req, res) => {
  try {
    const db = getDb();
    const requests = db.prepare(`
      SELECT r.*,
        COALESCE(u.name, u.hospitalName, u.organisationName) as requesterName,
        u.email as requesterEmail, u.phone as requesterPhone, u.role as requesterRole
      FROM requests r
      JOIN users u ON r.requestedBy = u._id
      LEFT JOIN request_donors rd ON rd.requestId = r._id AND rd.donorId = ?
      WHERE r.status = 'pending' AND (
        (r.broadcasted = 1 AND rd.status IN ('notified', 'responded'))
        OR (r.broadcasted = 0 AND u.role = 'organisation')
      )
      ORDER BY r.createdAt DESC
    `).all(req.body.userId);
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching requests', error: error.message });
  }
};

const broadcastRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.requestedBy !== userId) return res.status(403).json({ success: false, message: 'Only the hospital that created this request can broadcast it' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending requests can be broadcast' });

    const hospital = db.prepare('SELECT role FROM users WHERE _id = ?').get(userId);
    if (hospital?.role !== 'hospital') return res.status(403).json({ success: false, message: 'Only hospitals can broadcast requests' });

    const transaction = db.transaction(() => {
      if (!request.broadcasted) {
        const now = new Date().toISOString();
        const donors = db.prepare(`
          SELECT _id FROM users
          WHERE role = 'donar' AND bloodGroup = ? AND isAvailable = 1
            AND location_lat IS NOT NULL AND location_lng IS NOT NULL
        `).all(request.bloodGroup);
        const addDonor = db.prepare(`
          INSERT OR IGNORE INTO request_donors (requestId, donorId, status, notifiedAt)
          VALUES (?, ?, 'notified', ?)
        `);
        donors.forEach(donor => addDonor.run(id, donor._id, now));
        db.prepare('UPDATE requests SET broadcasted = 1, updatedAt = ? WHERE _id = ?').run(now, id);
      }
      return db.prepare('SELECT COUNT(*) as count FROM request_donors WHERE requestId = ?').get(id).count;
    });
    const matchedDonors = transaction();
    return res.status(200).json({
      success: true,
      message: `Request sent to ${matchedDonors} matching donor${matchedDonors === 1 ? '' : 's'}`,
      matchedDonors
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error broadcasting request', error: error.message });
  }
};

const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.body.userId;
    const db = getDb();
    const donor = db.prepare("SELECT role FROM users WHERE _id = ?").get(donorId);
    if (donor?.role !== 'donar') return res.status(403).json({ success: false, message: 'Only donors can respond to requests' });

    const update = db.prepare(`
      UPDATE request_donors
      SET status = 'responded', respondedAt = COALESCE(respondedAt, ?)
      WHERE requestId = ? AND donorId = ? AND status IN ('notified', 'responded')
        AND EXISTS (SELECT 1 FROM requests WHERE _id = ? AND status = 'pending' AND broadcasted = 1)
    `).run(new Date().toISOString(), id, donorId, id);
    if (!update.changes) return res.status(400).json({ success: false, message: 'This request is no longer available to you' });

    const requester = db.prepare(`
      SELECT COALESCE(name, hospitalName, organisationName) as name, phone
      FROM users WHERE _id = (SELECT requestedBy FROM requests WHERE _id = ?)
    `).get(id);
    return res.status(200).json({ success: true, message: 'Your response was sent to the hospital', requester });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error responding to request', error: error.message });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const donorId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending') return res.status(400).json({ success: false, message: 'Request no longer available' });
    if (request.requestedBy === donorId) return res.status(400).json({ success: false, message: 'You cannot accept your own request' });
    const donorRole = db.prepare("SELECT role FROM users WHERE _id = ?").get(donorId);
    if (donorRole?.role !== 'donar') return res.status(403).json({ success: false, message: 'Only donors can respond to requests' });
    if (request.broadcasted) {
      const response = db.prepare(`
        UPDATE request_donors
        SET status = 'responded', respondedAt = COALESCE(respondedAt, ?)
        WHERE requestId = ? AND donorId = ? AND status IN ('notified', 'responded')
      `).run(new Date().toISOString(), id, donorId);
      if (!response.changes) return res.status(403).json({ success: false, message: 'You were not matched to this request' });
      const requester = db.prepare('SELECT _id, name, hospitalName, organisationName, email, phone, role FROM users WHERE _id = ?').get(request.requestedBy);
      const donor = db.prepare('SELECT _id, name, email, phone, bloodGroup FROM users WHERE _id = ?').get(donorId);
      return res.status(200).json({ success: true, message: 'Your response was sent to the hospital', donorContact: donor, requesterContact: requester });
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE requests SET acceptedBy = ?, status = ?, updatedAt = ? WHERE _id = ?').run(donorId, 'accepted', now, id);
    const donor = db.prepare('SELECT _id, name, email, phone, bloodGroup FROM users WHERE _id = ?').get(donorId);
    const requester = db.prepare('SELECT _id, name, hospitalName, organisationName, email, phone, role FROM users WHERE _id = ?').get(request.requestedBy);
    return res.status(200).json({ success: true, message: 'Request accepted!', donorContact: donor, requesterContact: requester });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error accepting request', error: error.message });
  }
};

const completeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    if (request.requestedBy !== userId && request.acceptedBy !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE _id = ?').run('completed', new Date().toISOString(), id);
    return res.status(200).json({ success: true, message: 'Donation marked complete!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error completing request', error: error.message });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId;
    const db = getDb();
    const request = db.prepare('SELECT * FROM requests WHERE _id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    if (request.requestedBy !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });
    db.prepare('UPDATE requests SET status = ?, updatedAt = ? WHERE _id = ?').run('cancelled', new Date().toISOString(), id);
    return res.status(200).json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error cancelling request', error: error.message });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.body.userId;
    const db = getDb();
    const requests = db.prepare(`
      SELECT r.*,
        COALESCE(u1.name, u1.hospitalName, u1.organisationName) as requesterName,
        u1.email as requesterEmail, u1.phone as requesterPhone, u1.role as requesterRole,
        u2.name as donorName, u2.email as donorEmail, u2.phone as donorPhone, u2.bloodGroup as donorBloodGroup,
        EXISTS (
          SELECT 1 FROM request_donors rd
          WHERE rd.requestId = r._id AND rd.donorId = ? AND rd.status = 'responded'
        ) as respondedByMe
      FROM requests r
      JOIN users u1 ON r.requestedBy = u1._id
      LEFT JOIN users u2 ON r.acceptedBy = u2._id
      WHERE r.requestedBy = ? OR r.acceptedBy = ? OR EXISTS (
        SELECT 1 FROM request_donors rd
        WHERE rd.requestId = r._id AND rd.donorId = ? AND rd.status = 'responded'
      )
      ORDER BY r.createdAt DESC
    `).all(userId, userId, userId, userId);
    const responses = db.prepare(`
      SELECT rd.requestId, u._id as donorId, u.name as donorName, u.phone as donorPhone,
        u.email as donorEmail, u.bloodGroup as donorBloodGroup, rd.respondedAt
      FROM request_donors rd
      JOIN users u ON u._id = rd.donorId
      JOIN requests r ON r._id = rd.requestId
      WHERE r.requestedBy = ? AND rd.status = 'responded'
      ORDER BY rd.respondedAt
    `).all(userId);
    const responsesByRequest = new Map();
    responses.forEach(response => {
      const requestResponses = responsesByRequest.get(response.requestId) || [];
      requestResponses.push(response);
      responsesByRequest.set(response.requestId, requestResponses);
    });
    requests.forEach(request => {
      request.responders = responsesByRequest.get(request._id) || [];
    });
    return res.status(200).json({ success: true, requests });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching your requests', error: error.message });
  }
};

const getMapData = async (req, res) => {
  try {
    const db = getDb();
    const donors = db.prepare(`
      SELECT _id, name, bloodGroup, address, location_lat, location_lng, isAvailable, profilePic
      FROM users
      WHERE role = 'donar' AND location_lat IS NOT NULL AND location_lng IS NOT NULL
    `).all();
    const user = db.prepare('SELECT role FROM users WHERE _id = ?').get(req.body.userId);
    const requests = db.prepare(`
      SELECT r._id, r.requestedBy, r.bloodGroup, r.status, r.broadcasted, r.location_lat, r.location_lng, r.address, r.notes, r.createdAt,
        COALESCE(u.name, u.hospitalName, u.organisationName) as requesterName,
        u.role as requesterRole, u.profilePic as requesterProfilePic
      FROM requests r
      JOIN users u ON r.requestedBy = u._id
      WHERE r.status IN ('pending', 'accepted')
        AND r.location_lat IS NOT NULL AND r.location_lng IS NOT NULL
        AND (
          (r.broadcasted = 1 AND (? != 'donar' OR EXISTS (
            SELECT 1 FROM request_donors rd
            WHERE rd.requestId = r._id AND rd.donorId = ? AND rd.status IN ('notified', 'responded')
          )))
          OR (r.broadcasted = 0 AND u.role = 'organisation')
          OR r.requestedBy = ?
        )
    `).all(user?.role || '', req.body.userId, req.body.userId);
    const responses = db.prepare(`
      SELECT requestId, donorId FROM request_donors WHERE status = 'responded'
    `).all();
    const respondedByRequest = new Map();
    responses.forEach(response => {
      const donorIds = respondedByRequest.get(response.requestId) || [];
      donorIds.push(response.donorId);
      respondedByRequest.set(response.requestId, donorIds);
    });
    return res.status(200).json({
      success: true,
      donors: donors.map(d => ({
        id: d._id, name: d.name, bloodGroup: d.bloodGroup,
        address: d.address, lat: d.location_lat, lng: d.location_lng,
        isAvailable: !!d.isAvailable, profilePic: d.profilePic
      })),
      requests: requests.map(r => ({
        id: r._id, bloodGroup: r.bloodGroup, status: r.status,
        lat: r.location_lat, lng: r.location_lng, address: r.address, notes: r.notes,
        requesterName: r.requesterName, requesterRole: r.requesterRole,
        requestedBy: r.requestedBy, broadcasted: !!r.broadcasted,
        respondedDonorIds: respondedByRequest.get(r._id) || [],
        requesterProfilePic: r.requesterProfilePic, createdAt: r.createdAt
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error fetching map data', error: error.message });
  }
};

module.exports = { createRequest, getAvailableRequests, broadcastRequest, respondToRequest, acceptRequest, completeRequest, cancelRequest, getMyRequests, getMapData };
