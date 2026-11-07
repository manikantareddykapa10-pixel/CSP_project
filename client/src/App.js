import './App.css';
import {Routes, Route} from 'react-router-dom'
import HomePage from './pages/HomePage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import {Toaster} from 'react-hot-toast'
import ProtectedRoute from './components/routes/ProtectedRoute';
import PublicRoute from './components/routes/PublicRoute';
import Donar from './pages/Dashboard/Donar';
import Hospital from './pages/Dashboard/Hospital';
import OrganisationPage from './pages/Dashboard/OrganisationPage';
import Consumer from './pages/Dashboard/Consumer';
import Donation from './pages/Donation';
import Analytics from './pages/Dashboard/Analytics';
import DonarList from './pages/admin/DonarList';
import HospitalList from './pages/admin/HospitalList';
import OrgList from './pages/admin/OrgList';
import AdminHome from './pages/admin/AdminHome';
import AIDashboard from './pages/Dashboard/AIDashboard';
import Chatbot from './components/Chatbot/Chatbot';
import BloodMap from './pages/BloodMap';
import RequestBlood from './pages/RequestBlood';
import Profile from './pages/Profile';

function App() {
  return (
    <>
    <div><Toaster position="top-left" /></div>
    <Chatbot />
      <Routes>
        <Route path="/" element={
            <ProtectedRoute>
              <HomePage/>
            </ProtectedRoute>
        } />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donar-list"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DonarList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital-list"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <HospitalList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/org-list"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OrgList />
            </ProtectedRoute>
          }/>

        <Route path="/donar" element={
            <ProtectedRoute>
              <Donar/>
            </ProtectedRoute>
        } />
        <Route path="/hospital" element={
            <ProtectedRoute>
              <Hospital/>
            </ProtectedRoute>
        } />
        <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['admin', 'hospital']}>
              <Analytics/>
            </ProtectedRoute>
        } />
        <Route path="/consumer" element={
            <ProtectedRoute allowedRoles={['admin', 'hospital']}>
              <Consumer/>
            </ProtectedRoute>
        } />
        <Route path="/donation" element={
            <ProtectedRoute>
              <Donation/>
            </ProtectedRoute>
        } />
        <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['donar']}>
              <Profile/>
            </ProtectedRoute>
        } />
        <Route path="/organisation" element={
            <ProtectedRoute>
              <OrganisationPage/>
            </ProtectedRoute>
        } />
        <Route path="/statistical-dashboard" element={
            <ProtectedRoute allowedRoles={['admin', 'hospital']}>
              <AIDashboard/>
            </ProtectedRoute>
        } />
        <Route path="/blood-map" element={
            <ProtectedRoute>
              <BloodMap/>
            </ProtectedRoute>
        } />
        <Route path="/request-blood" element={
            <ProtectedRoute>
              <RequestBlood/>
            </ProtectedRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Login/>
          </PublicRoute>
        } />
        <Route path="/register" element={
            <PublicRoute>
              <Register/>
            </PublicRoute>
        } />
      </Routes>
    </>
  );
}

export default App;
