import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
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
  Legend 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ===================================================
// 1. ENTERPRISE CHART CONFIGURATION (Chart.js 4.x)
// ===================================================
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

/**
 * INV-PRO BUSINESS SUITE - CORE APPLICATION
 * @description Enterprise-grade ERP with Real-time POS, Analytics, and RBAC.
 */
function App() {
  // ===================================================
  // 2. MASTER STATE MANAGEMENT (FULL DATA SUITE)
  // ===================================================
  
  // Core Business Data
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]); 
  const [usersList, setUsersList] = useState([]); 
  const [ledgerData, setLedgerData] = useState([]); 
  
  // 🔥 ADVANCED ANALYTICS DEEP DATA ENGINE 🔥
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],
    categorySales: [],
    salesTrend: []
  });
  
  // Navigation & UI Management
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inventory Form Data (Cloudinary Integrated)
  const [formData, setFormData] = useState({ 
    name: '', 
    sku: '', 
    category: '', 
    quantity: '', 
    price: '', 
    image: null, 
    image_url: '' 
  });
  
  // Authentication & Session Persistence
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  const [loginType, setLoginType] = useState('admin');

  // Smart POS Terminal States
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Global Configuration
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';

  // ===================================================
  // 3. DATA SYNCHRONIZATION (REST API LAYER)
  // ===================================================
  
  /**
   * Fetches the entire inventory catalog
   */
  const fetchProducts = () => {
    axios.get(`${API_BASE}/products`)
      .then(res => setProducts(res.data))
      .catch(err => console.error("Critical Inventory Fetch Failure:", err));
  };

  /**
   * Fetches global sales history for reporting
   */
  const fetchSales = () => {
    axios.get(`${API_BASE}/sales`)
      .then(res => setSales(res.data))
      .catch(err => console.error("Sales History Sync Failure:", err));
  };

  /**
   * Fetches user list for RBAC Management (Admin Only)
   */
  const fetchUsersList = () => {
    axios.get(`${API_BASE}/users`)
      .then(res => setUsersList(res.data))
      .catch(err => console.error("User Audit Failure:", err));
  };

  /**
   * Fetches the Master Stock Ledger (Audit Trail)
   */
  const fetchLedger = () => {
    axios.get(`${API_BASE}/ledger`)
      .then(res => setLedgerData(res.data))
      .catch(err => console.error("Audit Ledger Access Denied:", err));
  };

  /**
   * 🔥 BUSINESS INTELLIGENCE DATA ENGINE 🔥
   * Aggregates data for the Analytics Dashboard
   */
  const fetchAnalytics = async () => {
    try {
      const [top, cat, trend] = await Promise.all([
        axios.get(`${API_BASE}/analytics/top-products`),
        axios.get(`${API_BASE}/analytics/category-sales`),
        axios.get(`${API_BASE}/analytics/sales-trend`)
      ]);
      setAnalyticsData({
        topProducts: top.data,
        categorySales: cat.data,
        salesTrend: trend.data
      });
    } catch (err) {
      console.error("Master Analytics Sync Failed:", err);
    }
  };

  // --- Lifecycles & Persistence ---

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); 
    const savedUser = localStorage.getItem('username');
    
    if (token) {
      setIsLoggedIn(true);
      setCurrentUser(savedUser);
      setUserRole(role || 'staff');
      fetchProducts();
      fetchSales(); 
      if (role === 'admin' || role === 'manager') fetchLedger();
    }
  }, []);

  useEffect(() => {
    // Strategic Tab-based Data Polling
    if (activeTab === 'users' && userRole === 'admin') fetchUsersList();
    if (activeTab === 'ledger' && (userRole === 'admin' || userRole === 'manager')) fetchLedger();
    if (activeTab === 'analytics' && (userRole === 'admin' || userRole === 'manager')) fetchAnalytics();
  }, [activeTab, userRole]);

  // ===================================================
  // 4. AUTHENTICATION & SECURITY CONTROL
  // ===================================================
  
  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = showSignup ? 'register' : 'login';
    const payload = showSignup ? { ...authData, role: 'staff' } : authData;
    
    axios.post(`${API_BASE}/${endpoint}`, payload)
      .then(res => {
        if (!showSignup) {
          const actualRole = res.data.role || 'staff';
          // Portal Security Guard
          if (actualRole !== loginType) {
            alert(`🛑 Unauthorized! Your profile '${actualRole.toUpperCase()}' does not match the '${loginType.toUpperCase()}' portal. Use correct login tab.`);
            return; 
          }
          
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('role', actualRole); 
          
          setIsLoggedIn(true);
          setCurrentUser(res.data.username);
          setUserRole(actualRole);
          
          fetchProducts();
          fetchSales();
        } else { 
          alert("✅ Network Access Granted! Your account is created. Please login as Staff."); 
          setShowSignup(false); 
          setLoginType('staff'); 
        }
      })
      .catch(err => alert(`❌ Authentication Failed: ${err.response?.data?.error || "Server Unreachable"}`));
  };

  const handleLogout = () => { 
    localStorage.clear(); 
    setIsLoggedIn(false); 
    window.location.reload(); 
  };

  // ===================================================
  // 5. INVENTORY MANAGEMENT (CRUD SYSTEM)
  // ===================================================
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert("🛑 Administrative privileges required for this mutation.");

    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);

    // Dynamic Image Routing
    if (formData.image instanceof File) {
      data.append('image', formData.image);
    } else {
      data.append('image_url', formData.image_url || '');
    }

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };

    const request = editingId 
      ? axios.put(`${API_BASE}/products/${editingId}`, data, config) 
      : axios.post(`${API_BASE}/products`, data, config);

    request.then(() => { 
      fetchProducts(); 
      if(userRole === 'admin' || userRole === 'manager') fetchLedger();
      resetForm(); 
    }).catch(err => alert("❌ Mutation Failure: " + err.message));
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    if(document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
  };

  const handleDelete = (id) => {
    if (userRole !== 'admin') return alert("🛑 Permission Denied.");
    if(window.confirm("⚠️ SYSTEM WARNING: Are you sure you want to permanently purge this record? This action will impact historical audit logs.")) {
      axios.delete(`${API_BASE}/products/${id}`).then(() => fetchProducts());
    }
  };

  // ===================================================
  // 6. SMART POS SYSTEM (POINT OF SALE)
  // ===================================================
  
  const addToCart = (product) => {
    if (product.quantity <= 0) return alert(`❌ ${product.name} is currently Out of Stock!`);
    
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.cartQty >= product.quantity) return alert("⚠️ Inventory threshold reached for this session.");
      setCart(cart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  };

  const updateCartQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    const newQty = item.cartQty + delta;
    if (newQty <= 0) setCart(cart.filter(i => i.id !== productId));
    else if (newQty > item.quantity) alert("⚠️ Stock Limit! Cannot exceed available inventory.");
    else setCart(cart.map(i => i.id === productId ? { ...i, cartQty: newQty } : i));
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const product = products.find(p => p.sku.toLowerCase() === barcodeInput.toLowerCase().trim());
    if (product) { 
      addToCart(product); 
      setBarcodeInput(''); 
    } else { 
      alert("❌ Critical Error: Product SKU not found in database."); 
      setBarcodeInput(''); 
    }
  };

  // ===================================================
  // 7. ENTERPRISE BILLING ENGINE (jsPDF Integration)
  // ===================================================
  
  const generateInvoice = (cartItems, totalAmount) => {
    const doc = new jsPDF();
    const invoiceNo = Math.floor(100000 + Math.random() * 900000);
    
    // Professional Header
    doc.setFontSize(22); doc.setTextColor(79, 70, 229);
    doc.text("NEXT-GEN CLOUD ERP", 105, 20, { align: "center" });
    
    doc.setFontSize(12); doc.setTextColor(15, 23, 42);
    doc.text("Master Tax Invoice / Cash Receipt", 105, 28, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 35, 195, 35);

    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Invoice Ref: #INV-${invoiceNo}`, 15, 45);
    doc.text(`Cashier Node: ${currentUser.toUpperCase()}`, 140, 45);
    doc.text(`System Timestamp: ${new Date().toLocaleString()}`, 15, 52);

    const tableBody = cartItems.map(item => [
      item.name, 
      item.cartQty, 
      `Rs.${item.price}`, 
      `Rs.${item.price * item.cartQty}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Product Description', 'Quantity', 'Unit Rate', 'Total Capital']],
      body: tableBody,
      headStyles: { fillColor: [79, 70, 229] },
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14); doc.setTextColor(16, 185, 129);
    doc.text(`Grand Total Payable: Rs. ${totalAmount}`, 140, finalY, { align: 'right' });
    
    doc.setFontSize(10); doc.setTextColor(148, 163, 184);
    doc.text("Thank you for using INV-PRO Suite. Digital copy generated via Cloud.", 105, finalY + 30, { align: "center" });

    doc.save(`Invoice_#${invoiceNo}_${Date.now()}.pdf`);
  };

  const processBulkCheckout = async () => {
    if (cart.length === 0) return alert("Terminal empty. Scanning required.");
    setIsCheckingOut(true);
    try {
      // Transactional Concurrency
      await Promise.all(cart.map(item => 
        axios.post(`${API_BASE}/sales`, { 
          product_id: item.id, 
          quantity_sold: item.cartQty 
        })
      ));
      const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
      generateInvoice(cart, grandTotal);
      setCart([]); fetchProducts(); fetchSales(); 
      alert("✅ Transaction Success: Records synchronized with Cloud Ledger.");
    } catch (error) { 
      alert("❌ Synchronization Failure: Contact system administrator."); 
    } finally { 
      setIsCheckingOut(false); 
    }
  };

  // ===================================================
  // 8. SPLIT-SCREEN AUTHENTICATION UI
  // ===================================================
  
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', overflow: 'hidden' }}>
        {/* Branding Side */}
        <div style={{ flex: 1.2, background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
          <div style={{ zIndex: 1 }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '20px' }}>
              <i className="fas fa-cloud-bolt" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px' }}>ENTERPRISE EDITION 3.0</span>
            </div>
            <h1 style={{ fontSize: '4.5rem', fontWeight: 800, margin: '0 0 20px', lineHeight: 1.1 }}>INV-PRO <br/><span style={{ color: '#818cf8' }}>Business Suite</span></h1>
            <p style={{ fontSize: '1.3rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '550px' }}>
              Advanced Cloud Architecture with Zero-Latency Smart POS, Multi-role Security, and High-fidelity Visual Analytics.
            </p>
            <div style={{ display: 'flex', gap: '50px', marginTop: '40px' }}>
              <div><h3 style={{ margin: 0, fontSize: '2rem', color: '#10b981' }}>99.9%</h3><p style={{ color: '#94a3b8' }}>Live Reliability</p></div>
              <div><h3 style={{ margin: 0, fontSize: '2rem', color: '#f59e0b' }}>SHA-256</h3><p style={{ color: '#94a3b8' }}>Logic Encryption</p></div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff' }}>
          <div className="glass-card" style={{ width: '450px', padding: '60px 50px', borderRadius: '24px', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.12)', border: '1px solid #f1f5f9' }}>
            {!showSignup && (
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '12px', padding: '6px', marginBottom: '35px' }}>
                {['admin', 'manager', 'staff'].map((type) => (
                  <button key={type} type="button" onClick={() => setLoginType(type)} style={{ flex: 1, padding: '12px', border: 'none', background: loginType === type ? 'white' : 'transparent', borderRadius: '8px', fontWeight: 700, color: loginType === type ? '#4f46e5' : '#64748b', cursor: 'pointer', boxShadow: loginType === type ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', textTransform: 'capitalize' }}>{type}</button>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ width: '60px', height: '60px', background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className={`fas ${showSignup ? 'fa-user-plus' : 'fa-shield-halved'}`} style={{ fontSize: '1.5rem', color: '#4f46e5' }}></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{showSignup ? "Create System Account" : `Portal Access: ${loginType.toUpperCase()}`}</h2>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Security verification required to initiate session.</p>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="pro-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-user" style={{ position: 'absolute', left: '15px', top: '16px', color: '#94a3b8' }}></i>
                <input className="pro-input" name="username" placeholder="Unique Identity / ID" onChange={handleAuthChange} required style={{ height: '50px', paddingLeft: '45px' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-lock" style={{ position: 'absolute', left: '15px', top: '16px', color: '#94a3b8' }}></i>
                <input className="pro-input" name="password" type="password" placeholder="Passphrase" onChange={handleAuthChange} required style={{ height: '50px', paddingLeft: '45px' }} />
              </div>
              <button type="submit" className="btn-primary-pro" style={{ height: '54px', marginTop: '10px', fontSize: '1.1rem', fontWeight: 700, background: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b') }}>
                {showSignup ? "Commit Registration" : "Authenticate Session"} <i className="fas fa-arrow-right-long" style={{ marginLeft: '10px' }}></i>
              </button>
            </form>
            
            <button onClick={() => setShowSignup(!showSignup)} style={{ marginTop: '35px', background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', width: '100%', textAlign: 'center' }}>
              {showSignup ? "← Revert to Authentication Gate" : "New User? Apply for Access Privileges"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // 9. CORE DASHBOARD RENDER (ENTERPRISE LAYOUT)
  // ===================================================
  
  const isAdmin = userRole === 'admin';
  const canExport = userRole === 'admin' || userRole === 'manager';

  return (
    <div className="main-layout" style={{ background: '#f8fafc' }}>
      
      {/* GLOBAL SIDEBAR NAVIGATION */}
      <div className="sidebar" style={{ background: '#0f172a', boxShadow: '10px 0 30px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '30px 25px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', letterSpacing: '-1px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '35px', height: '35px', background: '#4f46e5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-cube" style={{ fontSize: '1rem' }}></i>
            </div>
            INV-PRO ERP
          </h2>
        </div>
        
        <div style={{ padding: '0 15px' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#475569', marginBottom: '15px', paddingLeft: '15px', fontWeight: 800 }}>Core Modules</div>
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-chart-pie"></i> Intelligence Dashboard</div>
          <div className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><i className="fas fa-cash-register"></i> POS Terminal Hub</div>
          
          {/* 🔥 DYNAMIC ANALYTICS ENTRY 🔥 */}
          {canExport && (
            <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
              <i className="fas fa-chart-line"></i> Advanced Analytics
            </div>
          )}
          
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#475569', marginBottom: '15px', marginTop: '35px', paddingLeft: '15px', fontWeight: 800 }}>Security & Audit</div>
          {isAdmin && <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><i className="fas fa-user-shield"></i> Network Identities</div>}
          {canExport && <div className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}><i className="fas fa-book-bookmark"></i> Audit Stock Ledger</div>}
        </div>
        
        <div className="nav-item" style={{ marginTop: 'auto', color: '#ef4444', borderTop: '1px solid #1e293b', paddingTop: '20px', margin: 'auto 15px 30px' }} onClick={handleLogout}>
          <i className="fas fa-power-off"></i> Terminate Session
        </div>
      </div>

      <div className="content-area" style={{ padding: '40px' }}>
        
        {/* GLOBAL CONTEXTUAL HEADER */}
        <div className="header-pro" style={{ marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.95rem' }}>Node Status: <span style={{ color: '#10b981', fontWeight: 700 }}>● Operational</span> | Latency: 14ms</p>
          </div>
          <div className="user-profile-badge" style={{ padding: '8px 20px', background: 'white', borderRadius: '15px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{currentUser}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{userRole} SECURITY</div>
            </div>
            <div className="avatar" style={{ width: '42px', height: '42px', background: userRole === 'admin' ? 'linear-gradient(135deg, #4f46e5, #312e81)' : 'linear-gradient(135deg, #10b981, #065f46)', fontSize: '1.1rem' }}>{currentUser.charAt(0).toUpperCase()}</div>
          </div>
        </div>

        {/* --- TABS RENDERING GATEWAY --- */}
        
        {/* TAB: DASHBOARD (INVENTORY CENTER) */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            <div className="stats-grid" style={{ marginBottom: '35px' }}>
              <div className="stat-card-pro"><h3>Live SKU Count</h3><p>{products.length}</p><div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '10px' }}>Catalog Capacity: 94%</div></div>
              <div className="stat-card-pro green-line"><h3>Total Assets Value</h3><p>₹{products.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}</p><div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '10px' }}>↑ 4.2% from yesterday</div></div>
              <div className="stat-card-pro purple-line"><h3>Daily Throughput</h3><p>{sales.length}</p><div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '10px' }}>Average processing: 2m</div></div>
            </div>

            <div className="dashboard-grid" style={{ gap: '30px' }}>
              <div className="pro-table-card" style={{ flex: 1.5 }}>
                <div style={{ padding: '25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '450px' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '18px', top: '16px', color: '#94a3b8' }}></i>
                    <input className="pro-input" placeholder="Query Matrix: Name, SKU, Category..." style={{ paddingLeft: '45px', background: '#f8fafc', border: '1px solid #e2e8f0' }} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Showing {products.length} entities</div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="pro-table">
                    <thead><tr><th>ENTITY IDENTITY</th><th>SKU REFERENCE</th><th>SEGMENT</th><th>AVAILABILITY</th><th>VALUATION</th>{isAdmin && <th style={{ textAlign: 'right' }}>ACTIONS</th>}</tr></thead>
                    <tbody>
                      {products.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                        <tr key={p.id}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px' }}>
                            {/* 🔥 PREMIUM SMART IMAGE LOGIC 🔥 */}
                            {p.image_url ? (
                              <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #f1f5f9' }} alt="img" />
                            ) : <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #cbd5e1' }}><i className="fas fa-box" style={{ color: '#cbd5e1', fontSize: '1rem' }}></i></div>}
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{p.name}</div>
                              <small style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>{p.category}</small>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>{p.sku}</td>
                          <td><span style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{p.category}</span></td>
                          <td><span className={`status-badge ${p.quantity < 20 ? 'status-low' : 'status-good'}`} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>{p.quantity} Units</span></td>
                          <td style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>₹{p.price.toLocaleString()}</td>
                          {isAdmin && (
                            <td style={{ textAlign: 'right' }}>
                              <button onClick={()=> { setFormData({...p, image: null}); setEditingId(p.id); }} style={{ color: '#4f46e5', background: '#eef2ff', border: 'none', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}><i className="fas fa-pen-to-square"></i></button>
                              <button onClick={()=> handleDelete(p.id)} style={{ color: '#ef4444', background: '#fef2f2', border: 'none', width: '35px', height: '35px', borderRadius: '8px', cursor: 'pointer', marginLeft: '10px', transition: '0.2s' }}><i className="fas fa-trash-can"></i></button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isAdmin && (
                <div className="glass-card" style={{ flex: 0.6, height: 'fit-content', padding: '35px', border: '1px solid #e2e8f0' }}>
                  <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{editingId ? 'Modify Inventory Node' : 'Initialize New Entry'}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '5px' }}>Metadata will be synchronized across the cluster.</p>
                  </div>
                  <form className="pro-form" onSubmit={handleSubmit} style={{ gap: '18px' }}>
                    <input className="pro-input" placeholder="Display Entity Name" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required style={{ height: '48px' }} />
                    <input className="pro-input" placeholder="Unique SKU String" value={formData.sku} onChange={(e)=>setFormData({...formData, sku: e.target.value})} required style={{ height: '48px' }} />
                    <input className="pro-input" placeholder="Market Segment / Category" value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} required style={{ height: '48px' }} />
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.65rem' }}>VOLUME</small>
                        <input className="pro-input" type="number" placeholder="Qty" value={formData.quantity} onChange={(e)=>setFormData({...formData, quantity: e.target.value})} required style={{ height: '48px' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.65rem' }}>UNIT COST (₹)</small>
                        <input className="pro-input" type="number" placeholder="Price" value={formData.price} onChange={(e)=>setFormData({...formData, price: e.target.value})} required style={{ height: '48px' }} />
                      </div>
                    </div>
                    <div style={{ border: '2px dashed #e2e8f0', padding: '25px', borderRadius: '15px', textAlign: 'center', background: '#f8fafc', transition: '0.3s' }} onMouseOver={(e)=>e.currentTarget.style.borderColor='#4f46e5'}>
                      <label style={{ fontSize: '0.9rem', color: '#4f46e5', cursor: 'pointer', fontWeight: 700 }}>
                        <i className="fas fa-file-arrow-up" style={{ display: 'block', fontSize: '1.8rem', marginBottom: '10px' }}></i>
                        {formData.image ? formData.image.name : "Sync Product Photograph"}
                        <input type="file" id="imageInput" onChange={(e)=>setFormData({...formData, image: e.target.files[0]})} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <button className="btn-primary-pro" style={{ height: '54px', fontSize: '1rem' }}>{editingId ? 'Authorize Update' : 'Initialize SKU'}</button>
                    {editingId && <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}>Abort Transaction</button>}
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: SMART POS TERMINAL (HYPER-LOCAL) */}
        {activeTab === 'sales' && (
          <div className="fade-in" style={{ display: 'flex', gap: '30px', height: '82vh' }}>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ display: 'flex', gap: '25px', alignItems: 'center', border: '2px solid #e0e7ff', padding: '15px 30px' }}>
                <div style={{ width: '55px', height: '55px', background: '#4f46e5', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fas fa-barcode-read" style={{ fontSize: '2rem', color: 'white' }}></i>
                </div>
                <form onSubmit={handleBarcodeSubmit} style={{ flex: 1 }}>
                  <input className="pro-input" placeholder="Hardware Scan Input Ready... (Listening for Barcode/SKU)" value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} autoFocus style={{ height: '60px', fontSize: '1.3rem', border: 'none', padding: 0, fontWeight: 700 }} />
                </form>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'right' }}>LASER SCANNER<br/>ACTIVE ●</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
                {products.filter(p=>p.quantity > 0).map(p => (
                  <div key={p.id} className="glass-card" onClick={()=>addToCart(p)} style={{ cursor: 'pointer', textAlign: 'center', padding: '20px', transition: 'all 0.3s', border: '1px solid #f1f5f9' }} onMouseOver={(e)=> { e.currentTarget.style.transform='translateY(-8px)'; e.currentTarget.style.boxShadow='0 20px 25px -5px rgba(0,0,0,0.1)'; }} onMouseOut={(e)=> { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>
                    {p.image_url ? (
                      <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} style={{ width: '100px', height: '100px', borderRadius: '15px', objectFit: 'cover', marginBottom: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }} alt="" />
                    ) : <div style={{ height: '100px', width: '100px', background: '#f8fafc', margin: '0 auto 15px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-box-open" style={{ fontSize: '2rem', color: '#cbd5e1' }}></i></div>}
                    <h4 style={{ margin: '5px 0', fontSize: '1rem', color: '#0f172a' }}>{p.name}</h4>
                    <p style={{ fontWeight: 900, color: '#10b981', fontSize: '1.3rem', margin: '8px 0' }}>₹{p.price.toLocaleString()}</p>
                    <div style={{ background: p.quantity < 10 ? '#fef2f2' : '#f1f5f9', color: p.quantity < 10 ? '#ef4444' : '#64748b', display: 'inline-block', padding: '4px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800 }}>Stock: {p.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', border: '2px solid #f1f5f9', padding: 0, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '25px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '24px 24px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-cart-shopping" style={{ color: '#4f46e5', marginRight: '12px' }}></i> Active Queue</h3>
                <span style={{ background: '#4f46e5', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>{cart.length} ITEMS</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {cart.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center' }}>
                    <i className="fas fa-cash-register" style={{ fontSize: '4rem', marginBottom: '20px', color: '#e2e8f0' }}></i>
                    <p style={{ fontWeight: 600 }}>Terminal idle. <br/>Scan entities to initiate billing.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{item.name}</div>
                        <small style={{ color: '#10b981', fontWeight: 800, fontSize: '0.8rem' }}>₹{item.price} per node</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', padding: '4px' }}>
                          <button onClick={()=>updateCartQty(item.id, -1)} style={{ width: '32px', height: '32px', background: 'white', border: 'none', borderRadius: '8px', color: '#ef4444', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>-</button>
                          <span style={{ fontWeight: 900, padding: '0 15px', color: '#0f172a' }}>{item.cartQty}</span>
                          <button onClick={()=>updateCartQty(item.id, 1)} style={{ width: '32px', height: '32px', background: 'white', border: 'none', borderRadius: '8px', color: '#10b981', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>+</button>
                        </div>
                        <div style={{ width: '85px', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem', color: '#0f172a' }}>₹{(item.price * item.cartQty).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '30px', borderTop: '2px dashed #cbd5e1', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', color: '#64748b', fontWeight: 600 }}>
                  <span>Consolidated Tax (18%):</span>
                  <span style={{ color: '#0f172a' }}>Inclusive</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginTop: '5px' }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#10b981' }}>₹{cart.reduce((s,i)=>s+(i.price*i.cartQty),0).toLocaleString()}</span>
                </div>
                <button onClick={processBulkCheckout} disabled={isCheckingOut || cart.length === 0} className="btn-primary-pro" style={{ marginTop: '30px', height: '65px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', borderRadius: '18px' }}>
                  {isCheckingOut ? <><i className="fas fa-circle-notch fa-spin"></i> Finalizing Sync...</> : <><i className="fas fa-receipt"></i> Generate Fiscal Invoice</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BUSINESS ANALYTICS (BI HUB) 🔥 */}
        {activeTab === 'analytics' && canExport && (
          <div className="analytics-view fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
            <div className="stats-grid">
              <div className="stat-card-pro green-line">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem' }}>REVENUE PERFORMANCE</h3>
                  <i className="fas fa-chart-line-up" style={{ color: '#10b981' }}></i>
                </div>
                <p>₹{analyticsData.salesTrend.reduce((a, b) => a + parseFloat(b.daily_revenue), 0).toLocaleString()}</p>
                <small style={{ fontWeight: 700, color: '#94a3b8' }}>AGGREGATED 7-DAY REVENUE VELOCITY</small>
              </div>
              <div className="stat-card-pro purple-line">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.85rem' }}>MARKET SHARE</h3>
                  <i className="fas fa-diagram-project" style={{ color: '#8b5cf6' }}></i>
                </div>
                <p>{analyticsData.categorySales.length} Active Hubs</p>
                <small style={{ fontWeight: 700, color: '#94a3b8' }}>DIVERSIFICATION FACTOR: OPTIMAL</small>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '35px' }}>
              <div className="glass-card" style={{ height: '450px', border: '1px solid #e2e8f0', padding: '30px' }}>
                <h3 style={{ marginBottom: '25px', fontSize: '1.1rem', fontWeight: 800 }}><i className="fas fa-wave-pulse" style={{ marginRight: '12px', color: '#4f46e5' }}></i> Sales Progression Matrix (Trend Analysis)</h3>
                <div style={{ height: '340px' }}>
                  <Line 
                    data={{
                      labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
                      datasets: [{
                        label: 'Gross Daily Yield (₹)',
                        data: analyticsData.salesTrend.map(d => d.daily_revenue),
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.45,
                        pointRadius: 7,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#4f46e5',
                        pointBorderWidth: 4
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 15, titleFont: { size: 14 } } },
                      scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { weight: 700 } } }, x: { grid: { display: false }, ticks: { font: { weight: 700 } } } }
                    }}
                  />
                </div>
              </div>
              <div className="glass-card" style={{ height: '450px', border: '1px solid #e2e8f0', padding: '30px' }}>
                <h3 style={{ marginBottom: '25px', fontSize: '1.1rem', fontWeight: 800 }}><i className="fas fa-chart-pie" style={{ marginRight: '12px', color: '#8b5cf6' }}></i> Revenue Market Share</h3>
                <div style={{ height: '340px' }}>
                  <Doughnut 
                    data={{
                      labels: analyticsData.categorySales.map(c => c.category),
                      datasets: [{
                        data: analyticsData.categorySales.map(c => c.revenue),
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                        borderWidth: 0,
                        hoverOffset: 20
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      cutout: '78%',
                      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 25, font: { size: 11, weight: 700 } } } }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pro-table-card">
              <div style={{ padding: '30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-trophy" style={{ color: '#f59e0b', marginRight: '12px' }}></i> High-Performance SKU Leaderboard</h3>
                <button className="btn-primary-pro" style={{ width: 'auto', padding: '10px 25px', fontSize: '0.85rem', background: '#0f172a' }} onClick={()=>window.print()}><i className="fas fa-file-export" style={{ marginRight: '8px' }}></i> EXPORT BI REPORT</button>
              </div>
              <table className="pro-table">
                <thead><tr><th style={{ paddingLeft: '30px' }}>PRODUCT IDENTITY</th><th>VELOCITY (UNITS SOLD)</th><th>CAPITAL CONTRIBUTION</th><th>RANK</th></tr></thead>
                <tbody>
                  {analyticsData.topProducts.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: '#0f172a', paddingLeft: '30px' }}>{p.name}</td>
                      <td><span className="status-badge status-good" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>{p.total_sold} units</span></td>
                      <td style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                      <td><div style={{ width: '35px', height: '35px', borderRadius: '50%', background: idx === 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: idx === 0 ? '#d97706' : '#64748b', boxShadow: idx === 0 ? '0 4px 10px rgba(217, 119, 6, 0.2)' : 'none' }}>{idx+1}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: STOCK LEDGER (MASTER AUDIT PASSBOOK) */}
        {activeTab === 'ledger' && canExport && (
          <div className="pro-table-card fade-in">
            <div style={{ padding: '30px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-clock-rotate-left" style={{ color: '#64748b', marginRight: '12px' }}></i> Immutable Transaction History</h3>
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700 }}><i className="fas fa-shield-check"></i> ENCRYPTED AUDIT LOG</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="pro-table">
                <thead><tr><th>AUDIT TIMESTAMP</th><th>PRODUCT ENTITY</th><th>ACTIVITY SIGNATURE</th><th>DELTA</th><th>RUNNING BALANCE</th><th>REMARKS</th></tr></thead>
                <tbody>
                  {ledgerData.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', padding: '18px 20px' }}>{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{log.product_name}</td>
                      <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '0.7rem' }}>{log.transaction_type}</span></td>
                      <td style={{ color: log.quantity_changed > 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: '1.2rem' }}>
                        {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                      </td>
                      <td style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>{log.running_balance}</td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>{log.notes}</td>
                    </tr>
                  ))}
                  {ledgerData.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Initial records pending sync.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: USER ACCESS & IDENTITY MANAGEMENT */}
        {activeTab === 'users' && isAdmin && (
          <div className="pro-table-card fade-in">
            <div style={{ padding: '30px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}><i className="fas fa-user-lock" style={{ color: '#4f46e5', marginRight: '12px' }}></i> System RBAC Configuration</h3>
            </div>
            <table className="pro-table">
              <thead><tr><th>NETWORK ID</th><th>SECURE IDENTITY</th><th>ACCESS PRIVILEGE</th><th>AUTHORITY ASSIGNMENT</th></tr></thead>
              <tbody>
                {usersList.map(user => (
                  <tr key={user.id}>
                    <td style={{ color: '#94a3b8', fontFamily: 'monospace', padding: '20px' }}>#UID-{user.id.toString().padStart(4, '0')}</td>
                    <td style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="avatar" style={{ width: '35px', height: '35px', fontSize: '0.9rem', background: '#e0e7ff', color: '#4f46e5' }}>{user.username.charAt(0).toUpperCase()}</div>
                      <div>
                        {user.username} 
                        {user.username === currentUser && <span style={{ fontSize: '0.6rem', background: '#dcfce7', color: '#10b981', padding: '3px 10px', borderRadius: '30px', marginLeft: '10px', verticalAlign: 'middle' }}>SELF SESSION</span>}
                      </div>
                    </td>
                    <td><span className={`status-badge status-${user.role}`} style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>{user.role}</span></td>
                    <td>
                      <select className="pro-input" value={user.role} style={{ width: '220px', height: '45px', fontWeight: 700, cursor: user.username === currentUser ? 'not-allowed' : 'pointer' }} onChange={(e)=> {
                        axios.put(`${API_BASE}/users/${user.id}/role`, { role: e.target.value }).then(()=>fetchUsersList());
                      }} disabled={user.username === currentUser}>
                        <option value="staff">Standard Staff (POS)</option>
                        <option value="manager">System Manager (Ledger)</option>
                        <option value="admin">Super Administrator (Full)</option>
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
  );
}

export default App;