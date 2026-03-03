import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css'; // Hamein iska naya code next step mein likhna hai

// ===================================================
// 1. ENTERPRISE CHART CONFIGURATION
// ===================================================
ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ===================================================
// 2. REUSABLE ENTERPRISE COMPONENTS (INLINE)
// ===================================================

// Toast Notification System
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };

  return (
    <div style={{
      position: 'fixed', bottom: '20px', right: '20px', backgroundColor: bgColors[type],
      color: '#fff', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
      zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, animation: 'slideIn 0.3s ease-out'
    }}>
      <i className={`fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}`}></i>
      {message}
    </div>
  );
};

// Modal System for Forms
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: '#fff', width: '100%', maxWidth: '600px', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh'
      }}>
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>&times;</button>
        </div>
        <div style={{ padding: '25px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ===================================================
// 3. MAIN APPLICATION COMPONENT
// ===================================================
function App() {
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';

  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState({ isLoading: true, isSidebarOpen: true });
  const [toasts, setToasts] = useState([]);
  
  // Data States
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState({ topProducts: [], categorySales: [], salesTrend: [] });
  
  // UI & Interaction States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [posCategory, setPosCategory] = useState('All');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
  
  // Auth State
  const [auth, setAuth] = useState({ isLoggedIn: false, showSignup: false, loginType: 'admin', username: '', password: '', currentUser: '', userRole: '' });

  // POS State
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // --- HELPER FUNCTIONS ---
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --- API CALLS ---
  const fetchInventoryData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) {
      showToast("Inventory Sync Failed", "error");
    }
  }, []);

  const fetchSalesData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sales`);
      setSales(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAdminData = useCallback(async () => {
    if (auth.userRole !== 'admin' && auth.userRole !== 'manager') return;
    try {
      if (auth.userRole === 'admin') {
        const usersRes = await axios.get(`${API_BASE}/users`);
        setUsersList(usersRes.data);
      }
      const ledgerRes = await axios.get(`${API_BASE}/ledger`);
      setLedgerData(ledgerRes.data);
      
      const [top, cat, trend] = await Promise.all([
        axios.get(`${API_BASE}/analytics/top-products`),
        axios.get(`${API_BASE}/analytics/category-sales`),
        axios.get(`${API_BASE}/analytics/sales-trend`)
      ]);
      setAnalyticsData({ topProducts: top.data, categorySales: cat.data, salesTrend: trend.data });
    } catch (err) {
      showToast("Advanced modules sync failed. Checking permissions.", "warning");
    }
  }, [auth.userRole]);

  // --- LIFECYCLE ---
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const savedUser = localStorage.getItem('username');
      
      if (token && savedUser) {
        setAuth(prev => ({ ...prev, isLoggedIn: true, currentUser: savedUser, userRole: role || 'staff' }));
        await Promise.all([fetchInventoryData(), fetchSalesData()]);
      }
      setAppState(prev => ({ ...prev, isLoading: false }));
    };
    initApp();
  }, [fetchInventoryData, fetchSalesData]);

  useEffect(() => {
    if (auth.isLoggedIn) fetchAdminData();
  }, [auth.isLoggedIn, activeTab, fetchAdminData]);

  // --- AUTHENTICATION LOGIC ---
  const handleAuthInput = (e) => setAuth({ ...auth, [e.target.name]: e.target.value });

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAppState(prev => ({ ...prev, isLoading: true }));
    const endpoint = auth.showSignup ? 'register' : 'login';
    const payload = auth.showSignup ? { username: auth.username, password: auth.password, role: 'staff' } : { username: auth.username, password: auth.password };
    
    try {
      const res = await axios.post(`${API_BASE}/${endpoint}`, payload);
      if (!auth.showSignup) {
        const actualRole = res.data.role || 'staff';
        if (actualRole !== auth.loginType) {
          showToast(`Profile ${actualRole.toUpperCase()} mismatched with ${auth.loginType.toUpperCase()} portal!`, "error");
          setAppState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('role', actualRole);
        
        setAuth(prev => ({ ...prev, isLoggedIn: true, currentUser: res.data.username, userRole: actualRole, password: '' }));
        showToast(`Welcome back, ${res.data.username}!`, "success");
        fetchInventoryData(); fetchSalesData();
      } else {
        showToast("Account Created! Please login.", "success");
        setAuth(prev => ({ ...prev, showSignup: false, loginType: 'staff', password: '' }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Authentication Server Offline", "error");
    } finally {
      setAppState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleLogout = () => {
    if(window.confirm("Terminate secure session?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- INVENTORY CRUD ---
  const openAddModal = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setFormData({ ...product, image: null });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleInventorySubmit = async (e) => {
    e.preventDefault();
    if (auth.userRole !== 'admin') return showToast("Admin privileges required.", "error");

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'image' && formData[key] instanceof File) data.append(key, formData[key]);
      else if (key !== 'image') data.append(key, formData[key]);
    });

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editingId) {
        await axios.put(`${API_BASE}/products/${editingId}`, data, config);
        showToast("Entity updated successfully", "success");
      } else {
        await axios.post(`${API_BASE}/products`, data, config);
        showToast("New entity registered", "success");
      }
      fetchInventoryData();
      fetchAdminData();
      setIsModalOpen(false);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const deleteProduct = async (id) => {
    if (auth.userRole !== 'admin') return showToast("Permission Denied", "error");
    if(window.confirm("WARNING: Purging this SKU will alter audit logs. Proceed?")) {
      try {
        await axios.delete(`${API_BASE}/products/${id}`);
        showToast("Entity purged from database.", "info");
        fetchInventoryData();
      } catch (err) {
        showToast("Purge failed.", "error");
      }
    }
  };

  // --- POS LOGIC ---
  const addToCart = (product) => {
    if (product.quantity <= 0) return showToast(`${product.name} is Out of Stock!`, "warning");
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.quantity) {
          showToast(`Max stock reached for ${product.name}`, "warning");
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.cartQty + delta;
        if (newQty > item.quantity) { showToast("Stock Limit!", "warning"); return item; }
        return { ...item, cartQty: newQty };
      }
      return item;
    }).filter(item => item.cartQty > 0));
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    const scanned = barcodeInput.trim().toLowerCase();
    if (!scanned) return;
    const found = products.find(p => p.sku.toLowerCase() === scanned);
    if (found) {
      addToCart(found);
      showToast(`Scanned: ${found.name}`, "success");
    } else {
      showToast("SKU not recognized", "error");
    }
    setBarcodeInput('');
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      await Promise.all(cart.map(item => axios.post(`${API_BASE}/sales`, { product_id: item.id, quantity_sold: item.cartQty })));
      
      const total = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
      generatePDFInvoice(cart, total);
      
      setCart([]);
      showToast("Transaction Complete & Invoice Generated", "success");
      fetchInventoryData(); fetchSalesData(); fetchAdminData();
    } catch (err) {
      showToast("Sync Error during checkout", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const generatePDFInvoice = (items, total) => {
    const doc = new jsPDF();
    const invNo = Math.floor(Math.random() * 900000) + 100000;
    
    doc.setFontSize(24); doc.setTextColor(79, 70, 229);
    doc.text("INV-PRO ENTERPRISE", 105, 20, { align: "center" });
    
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Invoice: #INV-${invNo}  |  Cashier: ${auth.currentUser.toUpperCase()}  |  Date: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });
    doc.line(15, 35, 195, 35);

    autoTable(doc, {
      startY: 45,
      head: [['SKU', 'Product', 'Qty', 'Unit Rate', 'Total']],
      body: items.map(i => [i.sku, i.name, i.cartQty, `Rs.${i.price}`, `Rs.${i.price * i.cartQty}`]),
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.setFontSize(14); doc.setTextColor(16, 185, 129);
    doc.text(`GRAND TOTAL: Rs. ${total.toLocaleString()}`, 195, doc.lastAutoTable.finalY + 20, { align: 'right' });
    doc.save(`Invoice_INV-${invNo}.pdf`);
  };

  // --- FILTERING & COMPUTATIONS ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (posCategory === 'All' || p.category === posCategory)
    );
  }, [products, searchTerm, posCategory]);

  const uniqueCategories = ['All', ...new Set(products.map(p => p.category))];
  
  // Pagination logic for Dashboard table
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);


  // ===================================================
  // RENDER: SPLIT-SCREEN AUTHENTICATION GATEWAY
  // ===================================================
  if (appState.isLoading) {
    return <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#fff', fontSize: '2rem' }}><i className="fas fa-circle-notch fa-spin"></i></div>;
  }

  if (!auth.isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
        
        {/* Left Branding Panel */}
        <div style={{ flex: 1.2, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0) 70%)', top: '-10%', left: '-10%' }}></div>
          <div style={{ zIndex: 10 }}>
            <span style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '25px', color: '#818cf8' }}>
              <i className="fas fa-shield-check"></i> MILITARY-GRADE SECURITY
            </span>
            <h1 style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, margin: '0 0 20px 0' }}>INV-PRO <br/><span style={{ color: '#4f46e5' }}>Suite 3.0</span></h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '500px', lineHeight: 1.6 }}>The world's most advanced Cloud POS and Inventory Management architecture. Login to access your terminal.</p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', position: 'relative' }}>
          {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
          
          <div style={{ width: '100%', maxWidth: '480px', padding: '50px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            
            {/* Safe Fallback Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: 800, margin: '0 0 10px 0' }}>{auth.showSignup ? 'Create Account' : 'Portal Access'}</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Please provide your credentials below.</p>
            </div>

            {/* Role Selector (Only for Login) */}
            {!auth.showSignup && (
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '6px', borderRadius: '12px', marginBottom: '30px' }}>
                {['admin', 'manager', 'staff'].map(role => (
                  <button key={role} onClick={() => setAuth({ ...auth, loginType: role })} style={{
                    flex: 1, padding: '12px 0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, textTransform: 'capitalize', transition: '0.3s',
                    background: auth.loginType === role ? '#ffffff' : 'transparent',
                    color: auth.loginType === role ? '#4f46e5' : '#64748b',
                    boxShadow: auth.loginType === role ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                  }}>{role}</button>
                ))}
              </div>
            )}

            {/* Strict Form Layout */}
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Username Identity</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-user" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  {/* BULLETPROOF INLINE STYLES FOR INPUT SO IT ALWAYS SHOWS */}
                  <input required name="username" value={auth.username} onChange={handleAuthInput} placeholder="Enter your ID" style={{
                    width: '100%', boxSizing: 'border-box', height: '54px', paddingLeft: '45px', paddingRight: '15px',
                    backgroundColor: '#f8fafc', color: '#0f172a', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', outline: 'none'
                  }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Security Passphrase</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-lock" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                  {/* BULLETPROOF INLINE STYLES */}
                  <input required type="password" name="password" value={auth.password} onChange={handleAuthInput} placeholder="••••••••" style={{
                    width: '100%', boxSizing: 'border-box', height: '54px', paddingLeft: '45px', paddingRight: '15px',
                    backgroundColor: '#f8fafc', color: '#0f172a', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1rem', outline: 'none'
                  }} onFocus={(e) => e.target.style.borderColor = '#4f46e5'} onBlur={(e) => e.target.style.borderColor = '#e2e8f0'} />
                </div>
              </div>

              <button type="submit" disabled={appState.isLoading} style={{
                width: '100%', height: '54px', backgroundColor: auth.showSignup ? '#0f172a' : (auth.loginType === 'admin' ? '#4f46e5' : auth.loginType === 'manager' ? '#0ea5e9' : '#10b981'),
                color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '10px', transition: '0.3s'
              }}>
                {appState.isLoading ? <i className="fas fa-spinner fa-spin"></i> : (auth.showSignup ? 'Register New Node' : 'Authenticate Session')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button onClick={() => setAuth({ ...auth, showSignup: !auth.showSignup })} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
                {auth.showSignup ? 'Already have access? Return to Login' : 'Request network access'} <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER: ENTERPRISE DASHBOARD & MODULES
  // ===================================================
  const isAdmin = auth.userRole === 'admin';
  const isManager = auth.userRole === 'manager' || auth.userRole === 'admin';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      
      {/* GLOBAL TOAST RENDERER */}
      <div style={{ position: 'fixed', zIndex: 9999 }}>{toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}</div>

      {/* --- SIDEBAR NAVIGATION (STRICT LAYOUT) --- */}
      <div style={{ width: appState.isSidebarOpen ? '280px' : '80px', height: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', flexShrink: 0, zIndex: 100 }}>
        
        {/* Brand Header */}
        <div style={{ height: '80px', display: 'flex', alignItems: 'center', padding: '0 25px', borderBottom: '1px solid rgba(255,255,255,0.05)', justifyContent: appState.isSidebarOpen ? 'space-between' : 'center' }}>
          {appState.isSidebarOpen && <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fas fa-cube" style={{ color: '#4f46e5' }}></i> INV-PRO</h1>}
          <button onClick={() => setAppState({...appState, isSidebarOpen: !appState.isSidebarOpen})} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}><i className="fas fa-bars"></i></button>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: '20px 15px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          {appState.isSidebarOpen && <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', paddingLeft: '10px', marginTop: '10px' }}>Primary Modules</div>}
          
          <button onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'dashboard' ? 'rgba(79,70,229,0.15)' : 'transparent', color: activeTab === 'dashboard' ? '#818cf8' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
            <i className="fas fa-table-cells-large" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Inventory Matrix"}
          </button>
          
          <button onClick={() => setActiveTab('sales')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'sales' ? 'rgba(16,185,129,0.15)' : 'transparent', color: activeTab === 'sales' ? '#34d399' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
            <i className="fas fa-cash-register" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "POS Terminal"}
          </button>

          {isManager && (
            <>
              {appState.isSidebarOpen && <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', paddingLeft: '10px', marginTop: '20px' }}>Intelligence & Audit</div>}
              <button onClick={() => setActiveTab('analytics')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'analytics' ? 'rgba(245,158,11,0.15)' : 'transparent', color: activeTab === 'analytics' ? '#fbbf24' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
                <i className="fas fa-chart-pie" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Data Analytics"}
              </button>
              <button onClick={() => setActiveTab('ledger')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'ledger' ? 'rgba(56,189,248,0.15)' : 'transparent', color: activeTab === 'ledger' ? '#38bdf8' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
                <i className="fas fa-book-journal-whills" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Audit Ledger"}
              </button>
            </>
          )}

          {isAdmin && (
            <>
              {appState.isSidebarOpen && <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', paddingLeft: '10px', marginTop: '20px' }}>Administration</div>}
              <button onClick={() => setActiveTab('users')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'users' ? 'rgba(239,68,68,0.15)' : 'transparent', color: activeTab === 'users' ? '#f87171' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
                <i className="fas fa-users-gear" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Access Control"}
              </button>
            </>
          )}
        </div>

        {/* User Profile Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isAdmin ? '#4f46e5' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{auth.currentUser.charAt(0).toUpperCase()}</div>
          {appState.isSidebarOpen && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{auth.currentUser}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>{auth.userRole} Node</div>
            </div>
          )}
          {appState.isSidebarOpen && <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-power-off"></i></button>}
        </div>
      </div>

      {/* --- MAIN CONTENT AREA (STRICT WIDTH & SCROLL) --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <div style={{ height: '80px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')} Module</h2>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#64748b' }}>System Time: {new Date().toLocaleDateString()}</p>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ padding: '8px 16px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '30px', fontSize: '0.85rem', fontWeight: 700 }}><i className="fas fa-circle-check"></i> System Online</span>
          </div>
        </div>

        {/* Tab Contents (Scrollable Area) */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>

          {/* =================================================== */}
          {/* TAB 1: INVENTORY DASHBOARD (Data Grid) */}
          {/* =================================================== */}
          {activeTab === 'dashboard' && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '35px' }}>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '5px solid #4f46e5', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>Total SKUs</p>
                  <h3 style={{ margin: '10px 0 0', fontSize: '2rem', color: '#0f172a' }}>{products.length}</h3>
                </div>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '5px solid #10b981', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>Total Assets Value</p>
                  <h3 style={{ margin: '10px 0 0', fontSize: '2rem', color: '#0f172a' }}>₹{products.reduce((acc, p) => acc + (p.price * p.quantity), 0).toLocaleString()}</h3>
                </div>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '5px solid #f59e0b', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>Low Stock Warnings</p>
                  <h3 style={{ margin: '10px 0 0', fontSize: '2rem', color: '#0f172a' }}>{products.filter(p => p.quantity < 10).length}</h3>
                </div>
                <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', borderLeft: '5px solid #8b5cf6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>Total Units Logged</p>
                  <h3 style={{ margin: '10px 0 0', fontSize: '2rem', color: '#0f172a' }}>{products.reduce((acc, p) => acc + p.quantity, 0)}</h3>
                </div>
              </div>

              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '350px' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                    <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by Entity Name or SKU..." style={{ width: '100%', boxSizing: 'border-box', height: '48px', paddingLeft: '45px', border: '1px solid #cbd5e1', borderRadius: '10px', outline: 'none', backgroundColor: '#f8fafc' }} />
                  </div>
                  <select value={posCategory} onChange={(e) => setPosCategory(e.target.value)} style={{ height: '48px', padding: '0 20px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', outline: 'none', fontWeight: 600 }}>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {isAdmin && (
                  <button onClick={openAddModal} style={{ backgroundColor: '#4f46e5', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', height: '48px' }}>
                    <i className="fas fa-plus"></i> Initialize SKU
                  </button>
                )}
              </div>

              {/* Data Table */}
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Visual / Entity</th>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>SKU Code</th>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Classification</th>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Volume</th>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Valuation</th>
                      {isAdmin && <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No entities match current parameters.</td></tr>
                    ) : (
                      currentProducts.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {p.image_url ? (
                              <img src={p.image_url.startsWith('http') ? p.image_url : `${API_BASE.replace('/api', '')}${p.image_url}`} style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }} alt="Product" />
                            ) : (
                              <div style={{ width: '50px', height: '50px', borderRadius: '10px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><i className="fas fa-image"></i></div>
                            )}
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</span>
                          </td>
                          <td style={{ padding: '15px 20px', fontFamily: 'monospace', color: '#64748b' }}>{p.sku}</td>
                          <td style={{ padding: '15px 20px' }}><span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{p.category}</span></td>
                          <td style={{ padding: '15px 20px' }}><span style={{ backgroundColor: p.quantity < 10 ? '#fee2e2' : '#dcfce7', color: p.quantity < 10 ? '#ef4444' : '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{p.quantity} Units</span></td>
                          <td style={{ padding: '15px 20px', fontWeight: 800 }}>₹{p.price.toLocaleString()}</td>
                          {isAdmin && (
                            <td style={{ padding: '15px 20px', textAlign: 'right' }}>
                              <button onClick={() => openEditModal(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9', color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}><i className="fas fa-edit"></i></button>
                              <button onClick={() => deleteProduct(p.id)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', backgroundColor: '#fee2e2', color: '#ef4444', cursor: 'pointer' }}><i className="fas fa-trash"></i></button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} entries</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                    <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p=>p+1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
                  </div>
                </div>
              </div>

              {/* Data Mutation Modal */}
              <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modify Existing Entity" : "Initialize New SKU"}>
                <form onSubmit={handleInventorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Entity Designation (Name)</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '48px', padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>SKU Reference</label>
                      <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '48px', padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Classification / Category</label>
                    <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '48px', padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Initial Volume (Stock)</label>
                      <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '48px', padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Unit Valuation (₹)</label>
                      <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '48px', padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: '8px', outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem' }}>Visual Asset (Image)</label>
                    <div style={{ border: '2px dashed #cbd5e1', padding: '30px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                      <input type="file" id="fileUpload" onChange={e => setFormData({...formData, image: e.target.files[0]})} style={{ display: 'none' }} />
                      <label htmlFor="fileUpload" style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 800 }}>
                        <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                        {formData.image ? formData.image.name : "Click to select or drag file here"}
                      </label>
                    </div>
                  </div>
                  <button type="submit" style={{ width: '100%', height: '54px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', marginTop: '10px' }}>
                    {editingId ? 'Authorize Update' : 'Commit New Entry'}
                  </button>
                </form>
              </Modal>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 2: SMART POS TERMINAL */}
          {/* =================================================== */}
          {activeTab === 'sales' && (
            <div style={{ display: 'flex', gap: '30px', height: 'calc(100vh - 160px)', animation: 'fadeIn 0.5s ease' }}>
              
              {/* Product Grid Panel */}
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '20px' }}>
                  <form onSubmit={handleBarcodeScan} style={{ flex: 1, position: 'relative' }}>
                    <i className="fas fa-barcode" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', color: '#4f46e5' }}></i>
                    <input autoFocus value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} placeholder="Hardware Scanner Ready. Focus here to scan..." style={{ width: '100%', boxSizing: 'border-box', height: '60px', paddingLeft: '60px', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 700, outline: 'none' }} onFocus={(e)=>e.target.style.borderColor='#4f46e5'} onBlur={(e)=>e.target.style.borderColor='#e2e8f0'} />
                  </form>
                  <select value={posCategory} onChange={(e) => setPosCategory(e.target.value)} style={{ width: '200px', padding: '0 20px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: 700, outline: 'none' }}>
                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', paddingBottom: '20px', paddingRight: '10px' }}>
                  {filteredProducts.filter(p => p.quantity > 0).map(p => (
                    <div key={p.id} onClick={() => addToCart(p)} style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'; }}>
                      {p.image_url ? (
                        <img src={p.image_url.startsWith('http') ? p.image_url : `${API_BASE.replace('/api', '')}${p.image_url}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', marginBottom: '15px' }} alt="" />
                      ) : (
                        <div style={{ width: '100px', height: '100px', backgroundColor: '#f1f5f9', borderRadius: '12px', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#cbd5e1' }}><i className="fas fa-box"></i></div>
                      )}
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#0f172a' }}>{p.name}</h4>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 900, color: '#10b981', fontSize: '1.2rem' }}>₹{p.price.toLocaleString()}</p>
                      <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontWeight: 700 }}>Stock: {p.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart / Checkout Panel */}
              <div style={{ flex: 1, backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '25px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-shopping-cart" style={{ color: '#4f46e5', marginRight: '10px' }}></i> Active Session</h3>
                  <span style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '5px 15px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>{cart.length} ITEMS</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  {cart.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
                      <i className="fas fa-receipt" style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.5 }}></i>
                      <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Queue is empty. Scan to begin.</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{item.name}</h4>
                          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800 }}>₹{item.price} / unit</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <button onClick={()=>updateCartQty(item.id, -1)} style={{ width: '32px', height: '32px', border: 'none', background: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}>-</button>
                            <span style={{ width: '30px', textAlign: 'center', fontWeight: 800 }}>{item.cartQty}</span>
                            <button onClick={()=>updateCartQty(item.id, 1)} style={{ width: '32px', height: '32px', border: 'none', background: 'none', color: '#10b981', fontWeight: 800, cursor: 'pointer' }}>+</button>
                          </div>
                          <div style={{ width: '80px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem' }}>
                            ₹{(item.price * item.cartQty).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ padding: '30px', borderTop: '2px dashed #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontWeight: 600 }}>
                    <span>Subtotal</span>
                    <span>₹{cart.reduce((s,i)=>s+(i.price*i.cartQty),0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: '#64748b', fontWeight: 600 }}>
                    <span>Tax (Inclusive 18%)</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Net Payable</span>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>₹{cart.reduce((s,i)=>s+(i.price*i.cartQty),0).toLocaleString()}</span>
                  </div>
                  <button onClick={checkout} disabled={cart.length === 0 || isCheckingOut} style={{ width: '100%', height: '60px', backgroundColor: cart.length === 0 ? '#cbd5e1' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 800, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', transition: '0.3s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                    {isCheckingOut ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-print"></i> Generate Invoice & Sync</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 3: BUSINESS ANALYTICS (BI HUB) */}
          {/* =================================================== */}
          {activeTab === 'analytics' && isManager && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
                 {/* Trend Chart */}
                 <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem' }}><i className="fas fa-chart-area" style={{ color: '#4f46e5', marginRight: '10px' }}></i> Revenue Trajectory (7 Days)</h3>
                    <div style={{ height: '300px' }}>
                      <Line 
                        data={{
                          labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
                          datasets: [{
                            label: 'Daily Revenue',
                            data: analyticsData.salesTrend.map(d => d.daily_revenue),
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            fill: true,
                            tension: 0.4
                          }]
                        }}
                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                      />
                    </div>
                 </div>

                 {/* Doughnut Chart */}
                 <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem' }}><i className="fas fa-chart-pie" style={{ color: '#f59e0b', marginRight: '10px' }}></i> Category Spread</h3>
                    <div style={{ height: '300px' }}>
                      <Doughnut 
                        data={{
                          labels: analyticsData.categorySales.map(c => c.category),
                          datasets: [{
                            data: analyticsData.categorySales.map(c => c.revenue),
                            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
                          }]
                        }}
                        options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }}
                      />
                    </div>
                 </div>
               </div>

               {/* Top Performers Table */}
               <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-trophy" style={{ color: '#eab308', marginRight: '10px' }}></i> High-Performance Entities</h3>
                   <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-download"></i> Export Data</button>
                 </div>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead style={{ backgroundColor: '#f8fafc' }}>
                     <tr>
                       <th style={{ padding: '15px', color: '#475569' }}>Rank</th>
                       <th style={{ padding: '15px', color: '#475569' }}>Entity Name</th>
                       <th style={{ padding: '15px', color: '#475569' }}>Units Cleared</th>
                       <th style={{ padding: '15px', color: '#475569', textAlign: 'right' }}>Capital Yield</th>
                     </tr>
                   </thead>
                   <tbody>
                     {analyticsData.topProducts.map((p, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                         <td style={{ padding: '15px' }}><div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: i === 0 ? '#fef08a' : '#f1f5f9', color: i === 0 ? '#ca8a04' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</div></td>
                         <td style={{ padding: '15px', fontWeight: 800 }}>{p.name}</td>
                         <td style={{ padding: '15px' }}><span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{p.total_sold} units</span></td>
                         <td style={{ padding: '15px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 4: AUDIT LEDGER */}
          {/* =================================================== */}
          {activeTab === 'ledger' && isManager && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.5s ease', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '25px 30px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-list-check" style={{ color: '#38bdf8', marginRight: '10px' }}></i> Immutable Transaction Ledger</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Timestamp</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Node / Entity</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Operation</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Delta</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Audit logs are empty.</td></tr>
                  ) : (
                    ledgerData.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 30px', color: '#64748b', fontSize: '0.9rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ padding: '20px 30px', fontWeight: 800 }}>{log.product_name}</td>
                        <td style={{ padding: '20px 30px' }}><span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>{log.transaction_type}</span></td>
                        <td style={{ padding: '20px 30px', fontWeight: 900, color: log.quantity_changed > 0 ? '#10b981' : '#ef4444' }}>{log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}</td>
                        <td style={{ padding: '20px 30px', fontWeight: 800 }}>{log.running_balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 5: ACCESS CONTROL (USERS) */}
          {/* =================================================== */}
          {activeTab === 'users' && isAdmin && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.5s ease', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '25px 30px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-user-shield" style={{ color: '#ef4444', marginRight: '10px' }}></i> Network Access Control (RBAC)</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>UID</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Identity</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Clearance Level</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem' }}>Modify Rights</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px 30px', fontFamily: 'monospace', color: '#94a3b8' }}>#{u.id}</td>
                      <td style={{ padding: '20px 30px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{u.username.charAt(0).toUpperCase()}</div>
                        {u.username}
                        {u.username === auth.currentUser && <span style={{ fontSize: '0.6rem', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', marginLeft: '10px' }}>YOU</span>}
                      </td>
                      <td style={{ padding: '20px 30px' }}>
                        <span style={{ backgroundColor: u.role === 'admin' ? '#fee2e2' : u.role === 'manager' ? '#e0f2fe' : '#f1f5f9', color: u.role === 'admin' ? '#991b1b' : u.role === 'manager' ? '#075985' : '#475569', padding: '6px 15px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '20px 30px' }}>
                        <select 
                          value={u.role} 
                          disabled={u.username === auth.currentUser}
                          onChange={(e) => {
                            axios.put(`${API_BASE}/users/${u.id}/role`, { role: e.target.value })
                              .then(() => { fetchAdminData(); showToast(`Role updated for ${u.username}`, "success"); })
                              .catch(() => showToast("Failed to update role", "error"));
                          }}
                          style={{ width: '200px', height: '40px', padding: '0 15px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 600, cursor: u.username === auth.currentUser ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="staff">Staff (Terminal Only)</option>
                          <option value="manager">Manager (Terminal + Audit)</option>
                          <option value="admin">Admin (Full Access)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;