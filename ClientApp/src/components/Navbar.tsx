import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { disablePushNotifications } from '../lib/firebaseMessaging';
import { logoutFirebaseAuth } from '../lib/firebaseAuth';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/apiClient';

const Navbar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();


    const roles: string[] = user?.Roles ?? user?.roles ?? [];
    const primaryRole = (user?.roleName || user?.RoleName || roles[0] || '').toLowerCase();
    const isTransporter = primaryRole === 'transporter' || primaryRole === 'company';
    const isDriver = primaryRole === 'driver' || !!(user?.DriverId ?? user?.driverId);
    const isCustomer = primaryRole === 'customer' || primaryRole === 'customer' || !!(user?.CustomerId ?? user?.customerId);
    const dashboardRoute = isDriver
        ? '/driver-dashboard'
        : isTransporter
            ? '/transporter-dashboard'
            : isCustomer
                ? '/customer-portal'
                : '/';
    const displayName = user?.firstName || user?.FirstName || user?.company || user?.Company || 'User';
    const rawPic = user?.profilePic || user?.ProfilePic || '';
    const profilePic = rawPic
        ? (rawPic.startsWith('http') || rawPic.startsWith('data:') ? rawPic : `${(apiClient.defaults.baseURL || '').replace(/\/api\/?$/, '')}${rawPic.startsWith('/') ? '' : '/'}${rawPic}`)
        : '';

    const handleLogout = async () => {
        await disablePushNotifications();
        await logoutFirebaseAuth();
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to={dashboardRoute} className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="Navgatix Logo" className="h-[64px] object-contain hover:scale-105 transition-transform duration-300" />
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden lg:flex items-center space-x-8">
                        {user && isTransporter && (
                            <Link to="/transporter-dashboard" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">Fleet Terminal</Link>
                        )}
                        {user && isDriver && (
                            <Link to="/driver-dashboard" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">Driver Terminal</Link>
                        )}
                        {user && isCustomer && (
                            <>
                                <Link to="/customer-portal" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">Customer (Logistics) Portal</Link>
                                <Link to="/customer-portal?tab=new" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary-500/25 transition-colors hover:bg-primary-500">
                                    Add Shipment
                                </Link>
                            </>
                        )}
                        {!user && (
                            <Link to="/" className="text-slate-900 font-bold hover:text-primary-600 transition-colors">Home</Link>
                        )}

                        <Link to="/services" className="text-slate-600 font-medium hover:text-primary-600 transition-colors">Services</Link>
                        <Link to="/faq" className="text-slate-600 font-medium hover:text-primary-600 transition-colors">FAQ</Link>
                        <Link to="/about" className="text-slate-600 font-medium hover:text-primary-600 transition-colors">About Us</Link>
                        <Link to="/contact" className="text-slate-600 font-medium hover:text-primary-600 transition-colors">Contact Us</Link>
                    </div>

                    {/* Auth Section */}
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                {isCustomer && (
                                    <div className="lg:hidden flex items-center gap-2">
                                        <Link to="/customer-portal" className="text-primary-600 font-semibold px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors text-sm">
                                            Customer Page
                                        </Link>
                                        <Link to="/customer-portal?tab=new" className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-500">
                                            Shipment
                                        </Link>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100">
                                    {profilePic ? (
                                        <img
                                            src={profilePic}
                                            alt={displayName}
                                            className="h-7 w-7 rounded-full object-cover border border-primary-200"
                                        />
                                    ) : (
                                        <User className="h-4 w-4 text-primary-600" />
                                    )}
                                    <span className="text-sm font-bold text-slate-800">
                                        {displayName}
                                    </span>
                                </div>
                                <Link to="/profile" className="text-slate-600 hover:text-primary-600 font-medium px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors text-sm border border-transparent hover:border-primary-100">
                                    My Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="text-slate-600 hover:text-red-500 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-slate-600 hover:text-slate-900 font-semibold px-4 py-2 transition-colors">
                                    Login
                                </Link>
                                <Link to="/register" className="btn-primary hover:bg-primary-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-primary-500/30 transition-all">
                                    Create an account
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
