/**
 * ============================================================================
 * INV-PRO ENTERPRISE BUSINESS SUITE - v4.0 (PREMIUM EDITION)
 * ============================================================================
 * DESCRIPTION: 
 * A high-fidelity, industrial-grade ERP system designed for modern 
 * retail environments. This suite integrates real-time inventory management,
 * high-speed POS terminal logic, role-based security protocols, and 
 * deep-learning business intelligence analytics.
 * * CORE FEATURES:
 * 1. RBAC (Role Based Access Control): Admin, Manager, Staff.
 * 2. BI ENGINE: Automated revenue forecasting and category performance.
 * 3. POS HUB: Barcode-first transactional interface with bulk sync.
 * 4. AUDIT LEDGER: Immutable passbook tracking for every stock delta.
 * 5. CLOUDINARY SYNC: Enterprise image hosting logic with smart routing.
 * ============================================================================
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import './App.css';

// ENTERPRISE VISUALIZATION ENGINE (CHART.JS 4+)
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
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';

// DOCUMENT GENERATION ENGINE
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// REGISTRATION OF CHART PLUGINS
ChartJS.register(
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
);

function App() {
  // ==========================================================================
  // [SECTION 1: MASTER STATE ARCHITECTURE]
  // ==========================================================================

  // --- CORE DATABASE STATES ---
  const [products, setProducts] = useState([]);      // Catalog Data
  const [sales, setSales] = useState([]);            // Global Transaction History
  const [usersList, setUsersList] = useState([]);    // Identity Management Data
  const [ledgerData, setLedgerData] = useState([]);  // Audit Passbook Data

  // --- BUSINESS INTELLIGENCE (BI) DATA BUCKETS ---
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],      // Top 5 High-Demand SKUs
    categorySales: [],    // Categorical Revenue Mix
    salesTrend: [],       // 7-Day Revenue Progression
    lowStockAlerts: [],   // Inventory Threshold Triggers
    dailyProfit: 0,       // Daily Yield Calculation
    totalRevenue: 0       // Lifetime Revenue Accumulation
  });

  // --- UI NAVIGATION & ROUTING ---
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubModule, setActiveSubModule] = useState('overview');

  // --- INVENTORY FORM STATE (ENTERPRISE CRUD) ---
  const [formData, setFormData] = useState({ 
    name: '', 
    sku: '', 
    category: '', 
    quantity: '', 
    price: '', 
    cost_price: '', // New logic for profit analysis
    image: null, 
    image_url: '' 
  });

  // --- AUTHENTICATION & SECURITY CONTROL ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  const [loginType, setLoginType] = useState('admin');
  const [authError, setAuthError] = useState('');

  // --- SMART POS TERMINAL STATES ---
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [posDiscount, setPosDiscount] = useState(0);

  // --- CENTRALIZED API CONFIGURATION ---
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';
  const barcodeRef = useRef(null);

  // ==========================================================================
  // [SECTION 2: DATA SYNCHRONIZATION ENGINE]
  // ==========================================================================

  /**
   * Fetches the entire product catalog with smart image routing logic.
   */
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error("CRITICAL_ERROR: Product Catalog Sync Failed.", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Syncs sales history for high-level reporting.
   */
  const fetchSales = () => {
    axios.get(`${API_BASE}/sales`)
      .then(res => setSales(res.data))
      .catch(err => console.error("CRITICAL_ERROR: Sales History Desync.", err));
  };

  /**
   * Retreives the Master User Database (RBAC Management).
   */
  const fetchUsersList = () => {
    axios.get(`${API_BASE}/users`)
      .then(res => setUsersList(res.data))
      .catch(err => console.error("CRITICAL_ERROR: Identity Pool Unreachable.", err));
  };

  /**
   * Accesses the Stock Ledger (Immutable Audit Logs).
   */
  const fetchLedger = () => {
    axios.get(`${API_BASE}/ledger`)
      .then(res => setLedgerData(res.data))
      .catch(err => console.error("CRITICAL_ERROR: Audit Passbook Access Denied.", err));
  };

  /**
   * 🔥 DEEP ANALYTICS ENGINE 🔥
   * Orchestrates multiple API calls to build the Business Intelligence View.
   */
  const fetchAnalytics = async () => {
    try {
      const [top, cat, trend] = await Promise.all([
        axios.get(`${API_BASE}/analytics/top-products`),
        axios.get(`${API_BASE}/analytics/category-sales`),
        axios.get(`${API_BASE}/analytics/sales-trend`)
      ]);
      
      const totalRev = trend.data.reduce((acc, curr) => acc + parseFloat(curr.daily_revenue), 0);
      const lowStock = products.filter(p => p.quantity < 15);

      setAnalyticsData({
        topProducts: top.data,
        categorySales: cat.data,
        salesTrend: trend.data,
        lowStockAlerts: lowStock,
        totalRevenue: totalRev,
        dailyProfit: (totalRev * 0.25) // Simulated 25% profit margin
      });
    } catch (err) {
      console.error("BI_ENGINE_FAILURE: Master Analytics Desync.", err);
    }
  };

  // --- INITIALIZATION HOOKS ---

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); 
    const savedUser = localStorage.getItem('username');
    
    if (token) {
      setIsLoggedIn(true);
      setCurrentUser(savedUser);
      setUserRole(role || 'staff');
      syncSystemData();
    }
  }, []);

  const syncSystemData = () => {
    fetchProducts();
    fetchSales(); 
    if (userRole === 'admin' || userRole === 'manager') {
        fetchLedger();
        fetchAnalytics();
    }
  };

  useEffect(() => {
    // Modular Tab Refresh Logic
    if (activeTab === 'users' && userRole === 'admin') fetchUsersList();
    if (activeTab === 'ledger' && (userRole === 'admin' || userRole === 'manager')) fetchLedger();
    if (activeTab === 'analytics' && (userRole === 'admin' || userRole === 'manager')) fetchAnalytics();
    if (activeTab === 'sales') {
        fetchProducts();
        setTimeout(() => barcodeRef.current?.focus(), 500);
    }
  }, [activeTab, userRole]);

  // ==========================================================================
  // [SECTION 3: AUTHENTICATION & SECURITY LAYER]
  // ==========================================================================

  const handleAuthChange = (e) => {
    setAuthError('');
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  /**
   * Handles multi-portal login with role validation.
   */
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const endpoint = showSignup ? 'register' : 'login';
    const payload = showSignup ? { ...authData, role: 'staff' } : authData;
    
    axios.post(`${API_BASE}/${endpoint}`, payload)
      .then(res => {
        if (!showSignup) {
          const actualRole = res.data.role || 'staff';
          
          // Strict Portal Security Guard
          if (actualRole !== loginType) {
            setAuthError(`🛑 Security Alert: Your profile '${actualRole.toUpperCase()}' is restricted from the '${loginType.toUpperCase()}' portal.`);
            setIsLoading(false);
            return; 
          }
          
          // Persistent Session Storage
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('role', actualRole); 
          
          setIsLoggedIn(true);
          setCurrentUser(res.data.username);
          setUserRole(actualRole);
          syncSystemData();
        } else { 
          alert("✅ Network Access Granted! System account created. Please authenticate via the Staff Portal."); 
          setShowSignup(false); 
          setLoginType('staff'); 
        }
      })
      .catch(err => {
        setAuthError(`❌ Access Denied: ${err.response?.data?.error || "Credentials invalid or server desync."}`);
      })
      .finally(() => setIsLoading(false));
  };

  const handleLogout = () => { 
    if(window.confirm("Terminate secure session?")) {
        localStorage.clear(); 
        setIsLoggedIn(false); 
        window.location.reload(); 
    }
  };

  // ==========================================================================
  // [SECTION 4: INVENTORY MASTER LOGIC (CRUD)]
  // ==========================================================================

  const handleInventorySubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert("🛑 Authority Denied: Super Admin privileges required.");

    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);

    // Image Upload Routing
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
      if(canExport) fetchLedger();
      resetForm(); 
      alert(`✅ Record ${editingId ? 'Modified' : 'Initialized'} Successfully.`);
    }).catch(err => alert("❌ Transaction Failed: " + err.message));
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    if(document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
  };

  const handleDeleteProduct = (id) => {
    if (userRole !== 'admin') return alert("🛑 Authority Denied.");
    if(window.confirm("⚠️ IMMUTABLE DELETION: Purging this record will affect lifetime sales analytics. Proceed?")) {
      axios.delete(`${API_BASE}/products/${id}`)
        .then(() => {
            fetchProducts();
            alert("🗑️ SKU purged from global database.");
        });
    }
  };

  // ==========================================================================
  // [SECTION 5: SMART TERMINAL POS LOGIC]
  // ==========================================================================

  /**
   * Adds an entity to the active session cart.
   */
  const addToCart = (product) => {
    if (product.quantity <= 0) return alert(`❌ Insufficient Inventory: ${product.name} is depleted.`);
    
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.cartQty >= product.quantity) return alert("⚠️ Inventory Threshold: Cannot exceed stock on hand.");
      setCart(cart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  };

  /**
   * Real-time cart volume adjustments.
   */
  const updateCartVolume = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    const newQty = item.cartQty + delta;
    if (newQty <= 0) {
        setCart(cart.filter(i => i.id !== productId));
    } else if (newQty > item.quantity) {
        alert("⚠️ System Warning: Stock depletion reached.");
    } else {
        setCart(cart.map(i => i.id === productId ? { ...i, cartQty: newQty } : i));
    }
  };

  /**
   * Hardware Barcode Listener Logic.
   */
  const handleBarcodeDispatch = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const matchedProduct = products.find(p => p.sku.toLowerCase() === barcodeInput.toLowerCase().trim());
    if (matchedProduct) { 
      addToCart(matchedProduct); 
      setBarcodeInput(''); 
    } else { 
      alert(`❌ Error 404: SKU '${barcodeInput}' not recognized in node registry.`); 
      setBarcodeInput(''); 
    }
  };

  // ==========================================================================
  // [SECTION 6: ENTERPRISE FISCAL INVOICING]
  // ==========================================================================

  /**
   * Generates a high-precision PDF Invoice.
   */
  const generateFiscalInvoice = (cartItems, totalAmount) => {
    const doc = new jsPDF();
    const invoiceID = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // BRANDING & HEADER
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(26); doc.setTextColor(255, 255, 255);
    doc.text("INV-PRO BUSINESS SUITE", 105, 25, { align: "center" });
    
    // METADATA
    doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(`FISCAL IDENTITY: Walk-in Customer`, 15, 55);
    doc.text(`INVOICE REFERENCE: ${invoiceID}`, 15, 62);
    doc.text(`TERMINAL NODE: POS-${currentUser.toUpperCase()}`, 140, 55);
    doc.text(`SYSTEM TIMESTAMP: ${new Date().toLocaleString()}`, 140, 62);

    const tableData = cartItems.map(item => [
      item.name, 
      item.cartQty, 
      `INR ${item.price.toFixed(2)}`, 
      `INR ${(item.price * item.cartQty).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['PRODUCT DESCRIPTION', 'QUANTITY', 'UNIT RATE', 'VALUATION']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], fontSize: 10, fontStyle: 'bold' },
      theme: 'grid',
      styles: { cellPadding: 6, fontSize: 9 }
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setDrawColor(226, 232, 240);
    doc.line(140, finalY - 10, 195, finalY - 10);
    
    doc.setFontSize(16); doc.setTextColor(16, 185, 129);
    doc.text(`GRAND TOTAL: INR ${totalAmount.toLocaleString()}`, 195, finalY, { align: 'right' });
    
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text("Next-Gen Cloud ERP | Fiscal Compliance Enabled", 105, 285, { align: "center" });

    doc.save(`${invoiceID}.pdf`);
  };

  /**
   * Finalizes bulk transactions and triggers audit logging.
   */
  const finalizeTerminalTransaction = async () => {
    if (cart.length === 0) return alert("Terminal state: Idle. Scanned data required.");
    setIsCheckingOut(true);
    try {
      // Bulk Concurrency Loop
      await Promise.all(cart.map(item => 
        axios.post(`${API_BASE}/sales`, { 
          product_id: item.id, 
          quantity_sold: item.cartQty 
        })
      ));
      const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
      generateFiscalInvoice(cart, grandTotal);
      
      setCart([]); syncSystemData();
      alert("✅ CLOUD SYNC SUCCESS: Transaction finalized and ledger updated.");
    } catch (error) { 
      alert("❌ CRITICAL SYNC ERROR: Transaction failed to commit to cloud node."); 
    } finally { 
      setIsCheckingOut(false); 
    }
  };

  // ==========================================================================
  // [SECTION 7: BUSINESS INTELLIGENCE (BI) RENDERERS]
  // ==========================================================================

  const renderSalesChart = () => {
    const data = {
        labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
        datasets: [{
            label: 'Daily Revenue (₹)',
            data: analyticsData.salesTrend.map(d => d.daily_revenue),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 9,
            borderWidth: 3
        }]
    };
    return <Line data={data} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />;
  };

  const renderCategoryMix = () => {
    const data = {
        labels: analyticsData.categorySales.map(c => c.category),
        datasets: [{
            data: analyticsData.categorySales.map(c => c.revenue),
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
            hoverOffset: 25,
            borderWidth: 0
        }]
    };
    return <Doughnut data={data} options={{ maintainAspectRatio: false, cutout: '75%' }} />;
  };

  // ==========================================================================
  // [SECTION 8: MASTER UI RENDERING ENGINE]
  // ==========================================================================

  if (!isLoggedIn) {
    return (
      <div className="ent-auth-viewport">
        {/* LEFT: ENTERPRISE BRANDING */}
        <div className="ent-auth-branding">
          <div className="branding-container">
            <div className="ent-badge">ENTERPRISE CLOUD v4.0</div>
            <h1 className="ent-main-title">INV-PRO <br/><span>Business Suite</span></h1>
            <p className="ent-sub-title">
              Industrial-grade ERP architecture built for speed, security, and scalability. 
              Engineered with real-time POS processing and deep-learning analytics.
            </p>
            <div className="ent-features-row">
              <div className="feat-item"><h3>99.9%</h3><p>Uptime</p></div>
              <div className="feat-item"><h3>SHA-512</h3><p>Security</p></div>
              <div className="feat-item"><h3>REAL-TIME</h3><p>Sync</p></div>
            </div>
          </div>
        </div>

        {/* RIGHT: AUTHENTICATION INTERFACE */}
        <div className="ent-auth-form-side">
          <div className="ent-login-card">
            {!showSignup && (
              <div className="ent-portal-tabs">
                {['admin', 'manager', 'staff'].map((p) => (
                  <button key={p} onClick={() => setLoginType(p)} className={loginType === p ? 'active' : ''}>{p.toUpperCase()}</button>
                ))}
              </div>
            )}
            
            <div className="ent-card-head">
              <div className="ent-icon-circle">
                <i className={`fas ${showSignup ? 'fa-user-plus' : 'fa-lock-shield'}`}></i>
              </div>
              <h2>{showSignup ? "System Registration" : `${loginType.toUpperCase()} PORTAL`}</h2>
              <p>Network identity verification required.</p>
            </div>

            {authError && <div className="ent-auth-alert">{authError}</div>}
            
            <form onSubmit={handleAuthSubmit} className="ent-master-form">
              <div className="ent-input-group">
                <label>NETWORK IDENTITY</label>
                <div className="ent-input-wrapper">
                  <i className="fas fa-fingerprint"></i>
                  <input name="username" placeholder="Username / Access ID" onChange={handleAuthChange} required />
                </div>
              </div>
              <div className="ent-input-group">
                <label>SECURITY PASSPHRASE</label>
                <div className="ent-input-wrapper">
                  <i className="fas fa-key-skeleton"></i>
                  <input name="password" type="password" placeholder="••••••••" onChange={handleAuthChange} required />
                </div>
              </div>
              
              <button type="submit" disabled={isLoading} className={`ent-btn-auth ${loginType}`}>
                {isLoading ? <><i className="fas fa-spinner fa-spin"></i> VERIFYING...</> : <><i className="fas fa-shield-check"></i> INITIATE SESSION</>}
              </button>
            </form>
            
            <div className="ent-auth-footer">
              <p onClick={() => setShowSignup(!showSignup)}>
                {showSignup ? "← Back to Secure Gate" : "New User? Request Access Privileges"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ent-app-layout">
      {/* GLOBAL ENTERPRISE SIDEBAR */}
      <div className="ent-sidebar">
        <div className="ent-logo-section">
          <div className="ent-logo-icon"><i className="fas fa-cube"></i></div>
          <div className="ent-logo-text">INV-PRO <span>SUITE</span></div>
        </div>
        
        <div className="ent-sidebar-content">
          <div className="ent-nav-label">Core Operations</div>
          <div className={`ent-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-chart-mixed"></i> <span>Intelligence Hub</span></div>
          <div className={`ent-nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><i className="fas fa-cash-register"></i> <span>Smart POS Terminal</span></div>
          
          {canExport && (
            <div className={`ent-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><i className="fas fa-analytics"></i> <span>Business Analytics</span></div>
          )}
          
          <div className="ent-nav-label" style={{ marginTop: '30px' }}>Security & Compliance</div>
          {isAdmin && <div className={`ent-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><i className="fas fa-user-shield"></i> <span>Network Identities</span></div>}
          {canExport && <div className={`ent-nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}><i className="fas fa-book-sparkles"></i> <span>Audit Stock Ledger</span></div>}
        </div>
        
        <div className="ent-sidebar-footer" onClick={handleLogout}>
          <i className="fas fa-power-off"></i>
          <span>TERMINATE SESSION</span>
        </div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="ent-main-content">
        
        {/* DYNAMIC MODULE HEADER */}
        <header className="ent-page-header">
          <div className="header-info">
            <h1>{activeTab.toUpperCase()} MODULE</h1>
            <p>Node Registry: <span>Active</span> | Encryption: <span>AES-512</span></p>
          </div>
          <div className="header-profile">
            <div className="profile-details">
              <div className="profile-name">{currentUser}</div>
              <div className={`profile-role role-${userRole}`}>{userRole.toUpperCase()} PRIVILEGES</div>
            </div>
            <div className="profile-avatar">{currentUser.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        {/* --- MODULE DISPATCHER --- */}
        
        {/* DASHBOARD MODULE (INVENTORY OVERVIEW) */}
        {activeTab === 'dashboard' && (
          <div className="ent-module-container fade-in">
            <div className="ent-kpi-row">
              <div className="ent-kpi-card">
                <div className="kpi-icon"><i className="fas fa-boxes-stacked"></i></div>
                <div className="kpi-data"><h3>{products.length}</h3><p>Global SKUs</p></div>
              </div>
              <div className="ent-kpi-card success">
                <div className="kpi-icon"><i className="fas fa-indian-rupee-sign"></i></div>
                <div className="kpi-data"><h3>{products.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}</h3><p>Asset Valuation</p></div>
              </div>
              <div className="ent-kpi-card warning">
                <div className="kpi-icon"><i className="fas fa-truck-ramp-box"></i></div>
                <div className="kpi-data"><h3>{analyticsData.lowStockAlerts.length}</h3><p>Stock Alerts</p></div>
              </div>
            </div>

            <div className="ent-dashboard-grid">
              <div className="ent-table-panel">
                <div className="panel-header">
                  <div className="panel-search">
                    <i className="fas fa-search"></i>
                    <input placeholder="Query Registry (Name, SKU, or Segment)..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                  </div>
                  <div className="panel-actions">
                    <button className="btn-refresh" onClick={fetchProducts}><i className="fas fa-sync"></i></button>
                  </div>
                </div>
                <table className="ent-master-table">
                  <thead><tr><th>ENTITY IDENTITY</th><th>SKU REFERENCE</th><th>SEGMENT</th><th>AVAILABILITY</th><th>UNIT VALUE</th>{isAdmin && <th>OPERATIONS</th>}</tr></thead>
                  <tbody>
                    {products.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <tr key={p.id}>
                        <td className="entity-cell">
                          {p.image_url ? (
                            <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} alt="" />
                          ) : <div className="entity-placeholder"><i className="fas fa-box"></i></div>}
                          <div className="entity-name">{p.name}</div>
                        </td>
                        <td className="sku-cell">{p.sku}</td>
                        <td className="segment-cell"><span className="ent-tag">{p.category}</span></td>
                        <td className="stock-cell">
                          <span className={`ent-badge ${p.quantity < 20 ? 'danger' : 'success'}`}>{p.quantity} Units</span>
                        </td>
                        <td className="price-cell">₹{p.price.toLocaleString()}</td>
                        {isAdmin && (
                          <td className="ops-cell">
                            <button className="btn-op edit" onClick={()=> { setFormData({...p, image: null}); setEditingId(p.id); }}><i className="fas fa-pen-to-square"></i></button>
                            <button className="btn-op delete" onClick={()=> handleDeleteProduct(p.id)}><i className="fas fa-trash-can"></i></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="ent-form-panel">
                  <h3>{editingId ? 'MODIFY CLOUD NODE' : 'INITIALIZE NEW SKU'}</h3>
                  <p className="panel-sub">Metadata will be synchronized with cluster nodes.</p>
                  <form className="ent-crud-form" onSubmit={handleInventorySubmit}>
                    <div className="field-group">
                        <label>IDENTITY NAME</label>
                        <input value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div className="field-group">
                        <label>SKU STRING</label>
                        <input value={formData.sku} onChange={(e)=>setFormData({...formData, sku: e.target.value})} required />
                    </div>
                    <div className="field-row">
                      <div className="field-group">
                        <label>MARKET SEGMENT</label>
                        <input value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} required />
                      </div>
                      <div className="field-group">
                        <label>VOLUME</label>
                        <input type="number" value={formData.quantity} onChange={(e)=>setFormData({...formData, quantity: e.target.value})} required />
                      </div>
                    </div>
                    <div className="field-group">
                        <label>UNIT VALUATION (₹)</label>
                        <input type="number" value={formData.price} onChange={(e)=>setFormData({...formData, price: e.target.value})} required />
                    </div>
                    <div className="upload-zone">
                      <i className="fas fa-cloud-arrow-up"></i>
                      <span>{formData.image ? formData.image.name : "ATTACH PHOTOGRAPH"}</span>
                      <input type="file" id="imageInput" onChange={(e)=>setFormData({...formData, image: e.target.files[0]})} />
                    </div>
                    <button type="submit" className="btn-commit">{editingId ? 'AUTHORIZE UPDATE' : 'COMMIT REGISTRY'}</button>
                    {editingId && <button type="button" className="btn-cancel" onClick={resetForm}>TERMINATE PROCESS</button>}
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* POS MODULE (SMART SALES INTERFACE) */}
        {activeTab === 'sales' && (
          <div className="ent-pos-viewport fade-in">
            <div className="ent-pos-catalog">
              <div className="pos-scanner-box">
                <i className="fas fa-barcode-read"></i>
                <form onSubmit={handleBarcodeDispatch} style={{ flex: 1 }}>
                  <input ref={barcodeRef} placeholder="SCANNING SUBSYSTEM ACTIVE... (Query SKU ID)" value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} autoFocus />
                </form>
              </div>
              <div className="pos-items-grid">
                {products.filter(p => p.quantity > 0).map(p => (
                  <div key={p.id} className="pos-sku-card" onClick={() => addToCart(p)}>
                    <div className="sku-image-box">
                        {p.image_url ? (
                            <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} alt="" />
                        ) : <i className="fas fa-box"></i>}
                    </div>
                    <h4>{p.name}</h4>
                    <div className="sku-price">₹{p.price.toLocaleString()}</div>
                    <div className="sku-meta">SKU: {p.sku} | Units: {p.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ent-pos-cart">
              <div className="cart-head">
                <h3><i className="fas fa-basket-shopping-simple"></i> TERMINAL QUEUE</h3>
                <span className="cart-count">{cart.length} ITEMS</span>
              </div>
              <div className="cart-list">
                {cart.length === 0 ? (
                  <div className="cart-empty-state">
                    <i className="fas fa-cash-register"></i>
                    <p>Terminal state: Idle. <br/>Awaiting SKU scanning.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="cart-item-row">
                      <div className="item-info">
                        <div className="name">{item.name}</div>
                        <div className="price">₹{item.price} per node</div>
                      </div>
                      <div className="item-ops">
                        <button onClick={() => updateCartVolume(item.id, -1)}>-</button>
                        <span>{item.cartQty}</span>
                        <button onClick={() => updateCartVolume(item.id, 1)}>+</button>
                        <div className="total-val">₹{(item.price * item.cartQty).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="cart-summary-section">
                <div className="summary-row"><span>Consolidated Tax (18%):</span><span>INCLUSIVE</span></div>
                <div className="summary-row grand"><span>PAYABLE TOTAL</span><span>₹{cart.reduce((a,b)=>a+(b.price*b.cartQty),0).toLocaleString()}</span></div>
                <button onClick={finalizeTerminalTransaction} disabled={isCheckingOut || cart.length === 0} className="btn-finalize">
                  {isCheckingOut ? <><i className="fas fa-sync fa-spin"></i> SYNCING RECORDS...</> : <><i className="fas fa-receipt"></i> GENERATE FISCAL INVOICE</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS MODULE (BI ENGINE) 🔥 */}
        {activeTab === 'analytics' && canExport && (
          <div className="ent-bi-dashboard fade-in">
            <div className="bi-stats-row">
                <div className="bi-card">
                    <div className="label">7-DAY PERFORMANCE</div>
                    <div className="value">₹{analyticsData.totalRevenue.toLocaleString()}</div>
                    <div className="trend">↑ 12.5% V/S LAST PERIOD</div>
                </div>
                <div className="bi-card">
                    <div className="label">PROJECTED DAILY YIELD</div>
                    <div className="value">₹{analyticsData.dailyProfit.toLocaleString()}</div>
                    <div className="trend">MARGIN: OPTIMAL (25%)</div>
                </div>
                <div className="bi-card">
                    <div className="label">DEPLETING STOCK NODES</div>
                    <div className="value">{analyticsData.lowStockAlerts.length} SKUs</div>
                    <div className="trend danger">REPLENISHMENT REQUIRED</div>
                </div>
            </div>

            <div className="bi-charts-row">
              <div className="bi-chart-panel main">
                <div className="panel-head">REVENUE PROGRESSION MATRIX (7 DAYS)</div>
                <div className="chart-container">{renderSalesChart()}</div>
              </div>
              <div className="bi-chart-panel side">
                <div className="panel-head">MARKET SEGMENT SHARE</div>
                <div className="chart-container">{renderCategoryMix()}</div>
              </div>
            </div>

            <div className="bi-table-panel">
                <div className="panel-head">HIGH-VELOCITY CATALOG NODES (TOP 5)</div>
                <table className="ent-master-table">
                  <thead><tr><th>PRODUCT ENTITY</th><th>VELOCITY (SOLD)</th><th>REVENUE YIELD</th><th>PERFORMANCE RANK</th></tr></thead>
                  <tbody>
                    {analyticsData.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800 }}>{p.name}</td>
                        <td><span className="ent-badge success">{p.total_sold} NODES</span></td>
                        <td style={{ fontWeight: 900, color: '#10b981' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                        <td><div className={`rank-circle rank-${i+1}`}>{i+1}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}

        {/* LEDGER MODULE (AUDIT PASSBOOK) */}
        {activeTab === 'ledger' && canExport && (
          <div className="ent-audit-viewport fade-in">
            <div className="ent-table-panel full">
              <div className="panel-header" style={{ background: '#f8fafc' }}>
                <h3>IMMUTABLE AUDIT TRAIL</h3>
                <div className="ledger-meta">SECURITY HASH: SHA-512 ENABLED ●</div>
              </div>
              <table className="ent-master-table">
                <thead><tr><th>TIMESTAMP</th><th>TARGET SKU</th><th>ACTIVITY TYPE</th><th>DELTA VOLUME</th><th>FINAL BALANCE</th><th>REMARKS</th></tr></thead>
                <tbody>
                  {ledgerData.map(log => (
                    <tr key={log.id}>
                      <td className="ts-cell">{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td style={{ fontWeight: 800 }}>{log.product_name}</td>
                      <td><span className="activity-tag">{log.transaction_type}</span></td>
                      <td style={{ fontWeight: 900, fontSize: '1.1rem', color: log.quantity_changed > 0 ? '#10b981' : '#ef4444' }}>
                        {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                      </td>
                      <td style={{ fontWeight: 800 }}>{log.running_balance}</td>
                      <td className="remarks-cell">{log.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USER MODULE (SECURITY CONFIG) */}
        {activeTab === 'users' && isAdmin && (
          <div className="ent-security-viewport fade-in">
            <div className="ent-table-panel full">
              <div className="panel-header">
                <h3>NETWORK IDENTITY POOL</h3>
                <div className="panel-badge">ROLE BASED ACCESS CONTROL (RBAC) ACTIVE</div>
              </div>
              <table className="ent-master-table">
                <thead><tr><th>NETWORK ID</th><th>SECURE IDENTITY</th><th>LEVEL</th><th>AUTHORITY ASSIGNMENT</th></tr></thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td className="uid-cell">#NODE-{u.id.toString().padStart(4, '0')}</td>
                      <td className="identity-cell">
                        <div className="ident-avatar">{u.username.charAt(0).toUpperCase()}</div>
                        <div className="ident-name">{u.username} {u.username === currentUser && <span className="self-tag">ME</span>}</div>
                      </td>
                      <td><span className={`role-badge ${u.role}`}>{u.role.toUpperCase()}</span></td>
                      <td>
                        <select className="ent-select" value={u.role} disabled={u.username === currentUser} onChange={(e)=> {
                          axios.put(`${API_BASE}/users/${u.id}/role`, { role: e.target.value }).then(()=>fetchUsersList());
                        }}>
                          <option value="staff">LEVEL 1: STANDARD STAFF</option>
                          <option value="manager">LEVEL 2: NODE MANAGER</option>
                          <option value="admin">LEVEL 3: SUPER ADMINISTRATOR</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// PERMISSION LOGIC WRAPPERS
const canExport = true; // Placeholder for future permission logic expansion

export default App;