# blood brige

A real-time blood donation platform connecting donors, hospitals, and organisations.

## Stack

**SERN** — SQLite, Express, React, Node.js

## Features

- **User Roles:**
  - Admin: View and manage registered donors, hospitals, and organisations.
  - Donor: Set location, browse blood requests nearby, accept and fulfil them.
  - Donors can set or replace their profile picture from **My Profile**.
  - Hospital: Manage blood inventory, request blood, track consumers.
  - Organisation: Manage inventory, coordinate donors and hospitals, post blood requests.

- **Real-Time Blood Map:**
  - Live map showing donor locations (blue) and blood requests (red/orange).
  - Hospitals can select a request to view available donors with the matching blood group and broadcast it to those donors.
  - Donors can respond to a broadcast; responders appear green on the hospital's map and the hospital receives an in-app notification with their contact details.
  - Hospitals and admins can click a donor to view the shortest available driving route from their saved/current location.
  - Built with Leaflet + OpenStreetMap — no API key needed.
  - Auto-refreshes every 15 seconds via client-side polling.

- **Blood Request System:**
  - Organisations and hospitals post urgent blood requests with location.
  - Hospitals send requests to available, location-enabled donors with the requested blood group; donors respond from the map or donor dashboard.
  - Hospital request pages show donor responses and contact details; hospitals mark the request complete after coordinating the donation.
  - Status notifications via polling every 8 seconds with toast alerts.

- **Statistical Dashboard:**
  - Analytics, statistical dashboard, and consumer records are available to hospital and admin accounts.
  - Blood demand prediction using moving average on last 90 days of inventory data.
  - Donor matching using weighted scoring (blood type, proximity, availability, history).
  - Inventory optimisation using threshold-based rules and expiry alerts.
  - Rule-based chatbot for blood donation queries.
  - Live stats pulled directly from the database.

- **Authentication & Security:**
  - JWT (JSON Web Tokens) for session management.
  - Passwords hashed with bcrypt.
  - Donors and hospitals can optionally upload a JPEG, PNG, or WebP profile picture (up to 2 MB).
  - Rate limiting — 1000 requests per 15 minutes general, 5 failed auth attempts per 15 minutes.
  - Helmet.js for security headers.
  - CORS configuration.

- **Frontend:**
  - React.js with Redux Toolkit for state management.
  - Bootstrap for styling.

- **Backend:**
  - Node.js and Express.js, MVC architecture.
  - SQLite (better-sqlite3) — file-based, no external database server needed.
  - Custom query builder compatible with Mongoose-style syntax.

## Getting Started

### Prerequisites

- Node.js and npm

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Rakt-Setu
   ```

2. **Backend Setup:**
   ```bash
   npm install
   ```

3. **Frontend Setup:**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Environment Configuration:**

   **Backend (.env):**
   ```env
   PORT=8080
   DEV_MODE=development
   JWT_SECRET=your-secret-key
   JWT_EXPIRE=7d
   ALLOWED_ORIGINS=http://localhost:3000
   RATE_LIMIT_MAX=1000
   ```

   **Frontend (client/.env):**
   ```env
   REACT_APP_BASEURL=http://localhost:8080/api/v1
   ```

### Running the Application

```bash
# Start both together
npm start

# Or separately
npm run server   # backend
npm run client   # frontend
```

- Seed demo donors and hospitals around Gudivada and Vijayawada with `npm run seed:regional`.
  The demo accounts use the password `demo123`; rerunning the command skips accounts already created and fills missing donor avatars.
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api/v1

> SQLite database file is created automatically on first run. No external database setup needed.

### Deployment
- Backend: Render
- Frontend: Netlify

## Project Structure

```
Rakt-Setu/
├── client/                     # React frontend
│   ├── src/
│   └── public/
├── config/
│   └── db.js                   # SQLite connection + table setup
├── controllers/
│   ├── ai/
│   │   ├── chatbotController.js
│   │   ├── donorMatchingController.js
│   │   └── predictionController.js
│   ├── adminController.js
│   ├── analyticsController.js
│   ├── authController.js
│   ├── inventoryController.js
│   └── requestController.js
├── middleware/
│   ├── authMiddleware.js
│   ├── adminMiddleware.js
│   └── securityMiddleware.js
├── models/
│   ├── inventoryModel.js
│   └── userModel.js
├── routes/
│   ├── aiRoutes.js
│   ├── adminRoutes.js
│   ├── analyticsRoutes.js
│   ├── authRoute.js
│   ├── inventoryRoutes.js
│   └── requestRoutes.js
├── server.js
└── package.json
```

## Important Files and Code

Use this section as a quick guide to the source files when documenting or presenting the project.

### Key Files

| File | Purpose |
|---|---|
| `server.js` | Configures Express, middleware, API prefixes, and starts the backend server. |
| `config/db.js` | Opens SQLite, creates tables, and provides the database/model helpers. |
| `models/userModel.js` | Defines the user fields shared by donors, hospitals, organisations, and admins. |
| `controllers/authController.js` | Implements registration, login, current-user lookup, location updates, and donor profile-picture updates. |
| `middleware/authMiddleware.js` | Verifies the JWT and attaches the authenticated user ID to the request. |
| `middleware/authorizeRoles.js` | Checks the authenticated account role before protected operations. |
| `routes/authRoute.js` | Maps authentication and profile endpoints to their controllers. |
| `controllers/requestController.js` | Creates and manages blood requests and provides map data. |
| `routes/requestRoutes.js` | Exposes blood-request and map API endpoints. |
| `client/src/App.js` | Declares frontend routes and applies role-aware route protection. |
| `client/src/components/routes/ProtectedRoute.js` | Loads the signed-in user and restricts pages to allowed roles. |
| `client/src/pages/BloodMap.js` | Displays donor/request map markers, profile popups, and donor routes. |
| `client/src/pages/Profile.js` | Lets donors preview, upload, and save a profile picture. |
| `seedRegionalData.js` | Seeds demo donors/hospitals around Gudivada and Vijayawada; run with `npm run seed:regional`. |

### Backend Startup and API Routes

`server.js` registers API modules under `/api/v1`:

```js
app.use('/api/v1/auth', require('./routes/authRoute.js'));
app.use('/api/v1/inventory', require('./routes/inventoryRoutes.js'));
app.use('/api/v1/analytics', require('./routes/analyticsRoutes.js'));
app.use('/api/v1/ai', require('./routes/aiRoutes.js'));
app.use('/api/v1/requests', require('./routes/requestRoutes.js'));
```

### User Model

`models/userModel.js` shares one users table across account roles:

```js
const userModel = createModel('users', [
  'role', 'name', 'organisationName', 'hospitalName',
  'email', 'password', 'website', 'address', 'phone',
  'bloodGroup', 'lastDonation', 'totalDonations', 'isAvailable', 'profilePic'
]);
```

### Authentication and Donor Profile Photos

The profile-picture endpoint requires a signed-in user. The controller validates the image type and size and updates only the current donor account:

```js
router.patch('/profile-picture', authMiddleware, updateProfilePictureController);

const result = db.prepare(
  "UPDATE users SET profilePic = ?, updatedAt = ? WHERE _id = ? AND role = 'donar'"
).run(profilePic, new Date().toISOString(), req.body.userId);
```

Profile pictures are JPEG, PNG, or WebP data URLs up to 2 MB. The donor profile page sends the selected image to `PATCH /api/v1/auth/profile-picture`.

### Role-Protected API

Analytics routes show how authentication and role checks are combined:

```js
router.get(
  '/stats',
  authMiddleware,
  authorizeRoles('admin', 'hospital'),
  globalStatsController
);
```

The same allowed-role list is applied to the frontend page routes in `client/src/App.js`.

### Blood Map and Driving Routes

`controllers/requestController.js` returns donors with map coordinates and profile pictures:

```sql
SELECT _id, name, bloodGroup, address, location_lat, location_lng,
       isAvailable, profilePic
FROM users
WHERE role = 'donar'
  AND location_lat IS NOT NULL
  AND location_lng IS NOT NULL
```

When an admin or hospital user selects a donor, `client/src/pages/BloodMap.js` requests road routes from OSRM and draws the shortest returned route:

```js
const response = await fetch(
  `https://router.project-osrm.org/route/v1/driving/${coordinates}` +
  '?overview=full&geometries=geojson&steps=false&alternatives=true'
);
const result = await response.json();
const shortestRoute = result.routes.reduce((shortest, candidate) =>
  candidate.distance < shortest.distance ? candidate : shortest
);
```

The map popup displays the donor's profile photo, blood group, location, and availability. If no photo is set, it uses `client/public/profile-placeholder.svg`.

Hospitals can choose one of their pending requests on the map to display available donors with the matching blood group, then send the request to those donors. Donors see broadcast requests while signed in and can respond from the map or donor dashboard. Responses are recorded per donor; responding donors are highlighted green on the hospital map, and the hospital receives an in-app notification with their contact details.

## Screenshots

<img width="1425" height="798" alt="Screenshot 2026-04-11 at 11 15 34 AM" src="https://github.com/user-attachments/assets/5fc809b5-8ad6-48c3-adc2-051e1477e9a2" />
<img width="1464" height="792" alt="Screenshot 2026-05-05 at 12 12 44 PM" src="https://github.com/user-attachments/assets/9b6021ea-2ca6-4e48-9be0-13b200fa9571" />
<img width="1468" height="867" alt="Screenshot 2026-04-14 at 11 41 01 PM" src="https://github.com/user-attachments/assets/a4501e4f-d265-4bee-b563-4279e57288da" />
<img width="1469" height="866" alt="Screenshot 2026-04-14 at 11 40 05 PM" src="https://github.com/user-attachments/assets/5013228a-47d8-48f9-9590-6aa8b10457a3" />
<img width="1464" height="868" alt="Screenshot 2026-04-14 at 11 39 25 PM" src="https://github.com/user-attachments/assets/55ff9feb-af70-4720-af9e-ed914c91308f" />
<img width="1470" height="866" alt="Screenshot 2026-04-14 at 11 38 02 PM" src="https://github.com/user-attachments/assets/866ef72c-7a38-4bb1-8019-fac1826466cc" />
<img width="1456" height="867" alt="Screenshot 2026-04-14 at 11 37 36 PM" src="https://github.com/user-attachments/assets/8b80efda-fc9e-484d-8b03-0f01e545ecd3" />
<img width="1468" height="798" alt="Screenshot 2026-05-05 at 12 01 40 PM" src="https://github.com/user-attachments/assets/975a346f-e464-4bb6-ac16-debf98e19234" />
<img width="1464" height="793" alt="Screenshot 2026-05-05 at 12 01 26 PM" src="https://github.com/user-attachments/assets/82419ebc-70ec-4c7e-bee8-4d2a7a769406" />
