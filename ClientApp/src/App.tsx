import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/LoginPage';
import Register from './pages/auth/RegisterPage';
import TransporterDashboard from './pages/transporter/TransporterDashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import ProfilePage from './pages/ProfilePage';
import AboutUsPage from './pages/AboutUsPage';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import ServicesPage from './pages/ServicesPage';
import FAQPage from './pages/FAQPage';
import ContactPage from './pages/ContactPage';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50">
          <Routes>
          {/* Routes with Navbar */}
          <Route path="/" element={<><Navbar /><LandingPage /></>} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/services" element={<><Navbar /><ServicesPage /></>} />
          <Route path="/faq" element={<><Navbar /><FAQPage /></>} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Auth Routes (no navbar usually, or keep it if preferred) */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Dashboards (often have their own sidebar/navbar) */}
          <Route path="/transporter-dashboard" element={<TransporterDashboard />} />
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          <Route path="/customer-portal" element={<CustomerDashboard />} />

          {/* Catch all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
