import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

// ============================================================================
// 1. ENTERPRISE ENGINE REGISTRATION (VISUALIZATION & DOCUMENTS)
// ============================================================================
import { 
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, 
  PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, 
  LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

/**
 * INV-PRO ENTERPRISE BUSINESS SUITE v4.0
 * Logic: Industrial-Grade Synchronization & Analytics
 */
function App() {
  // ==========================================================================
  // 2. MASTER STATE ARCHITECTURE (ZERO-DATA LOSS CONFIG)
  // ==========================================================================
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]); 
  const [usersList, setUsersList] = useState([]); 
  const [ledgerData, setLedgerData] = useState([]); 
  
  // BI DEEP ANALYTICS DATA BUCKETS
  const [analyticsData, setAnalyticsData] = useState({
    topProducts: [],
    categorySales: [],
    salesTrend: [],
    lowStock: [],
    revenueTotal: 0
  });
  
  // UI & NAVIGATION CONTROL
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // GLOBAL FORM DATA (SYNCED WITH CLOUDINARY)
  const [formData, setFormData] = useState({ 
    name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' 
  });
  
  // AUTHENTICATION & PORTAL SECURITY
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  const [loginType, setLoginType] = useState('admin');
  const [authError, setAuthError] = useState('');

  // SMART POS DATA
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // CONSTANTS
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';
  const barcodeRef = useRef(null);

  // ==========================================================================
  // 3. CORE SYSTEM SYNCHRONIZATION (REST API LAYER)
  // ==========================================================================
  
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) { console.error("Catalog Sync Error", err); }
    finally { setIsLoading(false); }
  };

  const fetchSales = () => {
    axios.get(`${API_BASE}/sales`).then(res => setSales(res.data));
  };

  const fetchUsersList = () => {
    axios.get(`${API_BASE}/users`).then(res => setUsersList(res.data));
  };

  const fetchLedger = () => {
    axios.get(`${API_BASE}/ledger`).then(res => setLedgerData(res.data));
  };

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
        salesTrend: trend.data,
        lowStock: products.filter(p => p.quantity < 15),
        revenueTotal: trend.data.reduce((a,b) => a + parseFloat(b.daily_revenue), 0)
      });
    } catch (e) { console.error("BI Engine Sync Error", e); }
  };

  // SESSION & BOOT LOGIC
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); 
    if (token) {
      setIsLoggedIn(true);
      setCurrentUser(localStorage.getItem('username'));
      setUserRole(role || 'staff');
      syncMasterData();
    }
  }, []);

  const syncMasterData = () => {
    fetchProducts(); fetchSales();
    if (userRole === 'admin' || userRole === 'manager') {
      fetchLedger(); fetchAnalytics();
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && userRole === 'admin') fetchUsersList();
    if (activeTab === 'ledger' && (userRole === 'admin' || userRole === 'manager')) fetchLedger();
    if (activeTab === 'analytics' && (userRole === 'admin' || userRole === 'manager')) fetchAnalytics();
    if (activeTab === 'sales') {
        fetchProducts();
        setTimeout(() => barcodeRef.current?.focus(), 500);
    }
  }, [activeTab, userRole]);

  // ==========================================================================
  // 4. AUTHENTICATION MODULE (SECURITY GATEWAY)
  // ==========================================================================
  
  const handleAuthChange = (e) => {
    setAuthError('');
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = showSignup ? 'register' : 'login';
    
    axios.post(`${API_BASE}/${endpoint}`, showSignup ? { ...authData, role: 'staff' } : authData)
      .then(res => {
        if (!showSignup) {
          const role = res.data.role || 'staff';
          if (role !== loginType) {
            setAuthError(`🛑 Access Denied: Incorrect portal for role '${role}'`);
            setIsLoading(false);
            return;
          }
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('username', res.data.username);
          localStorage.setItem('role', role); 
          setIsLoggedIn(true); setCurrentUser(res.data.username); setUserRole(role);
          syncMasterData();
        } else {
          alert("✅ Success! Registered as Staff."); setShowSignup(false); setLoginType('staff');
        }
      })
      .catch(err => setAuthError(`❌ Error: ${err.response?.data?.error || "Desync"}`))
      .finally(() => setIsLoading(false));
  };

  const handleLogout = () => {
    if(window.confirm("Terminate Session?")) {
        localStorage.clear(); window.location.reload();
    }
  };

  // ==========================================================================
  // 5. INVENTORY & POS SYSTEM (INDUSTRIAL LOGIC)
  // ==========================================================================
  
  const handleInventoryMutation = (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert("Admin Required.");

    const data = new FormData();
    Object.keys(formData).forEach(k => data.append(k, formData[k]));
    if (!(formData.image instanceof File)) data.append('image_url', formData.image_url || '');

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    const request = editingId ? axios.put(`${API_BASE}/products/${editingId}`, data, config) : axios.post(`${API_BASE}/products`, data, config);

    request.then(() => { fetchProducts(); resetForm(); alert("✅ Catalog Updated."); });
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) return alert("Depleted!");
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      if (existing.cartQty >= product.quantity) return alert("Limit!");
      setCart(cart.map(i => i.id === product.id ? { ...i, cartQty: i.cartQty + 1 } : i));
    } else setCart([...cart, { ...product, cartQty: 1 }]);
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const p = products.find(x => x.sku.toLowerCase() === barcodeInput.toLowerCase().trim());
    if (p) { addToCart(p); setBarcodeInput(''); }
    else { alert("Unknown SKU"); setBarcodeInput(''); }
  };

  const finalizeSale = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      await Promise.all(cart.map(i => axios.post(`${API_BASE}/sales`, { product_id: i.id, quantity_sold: i.cartQty })));
      const doc = new jsPDF();
      doc.text("INV-PRO FISCAL INVOICE", 105, 20, {align: 'center'});
      autoTable(doc, { startY: 30, head: [['Item', 'Qty', 'Total']], body: cart.map(x => [x.name, x.cartQty, `Rs.${x.price * x.cartQty}`]) });
      doc.save(`INV_${Date.now()}.pdf`);
      setCart([]); syncMasterData(); alert("✅ Invoice Generated.");
    } catch (e) { alert("Sync Failed"); }
    finally { setIsCheckingOut(false); }
  };

  // ==========================================================================
  // 6. MASTER UI DISPATCHER (PREMIUM LAYOUT)
  // ==========================================================================
  
  const canExport = userRole === 'admin' || userRole === 'manager';
  const isAdmin = userRole === 'admin';

  if (!isLoggedIn) {
    return (
      <div className="ent-auth-viewport">
        <div className="ent-auth-branding">
          <div className="branding-container">
            <div className="ent-badge">ENTERPRISE CLOUD v4.0</div>
            <h1 className="ent-main-title">INV-PRO <br/><span>Business Suite</span></h1>
            <p className="ent-sub-title">Zero-Latency POS & Advanced Stock Intelligence.</p>
            <div className="ent-features-row">
              <div className="feat-item"><h3>99.9%</h3><p>Uptime</p></div>
              <div className="feat-item"><h3>SHA-512</h3><p>Security</p></div>
            </div>
          </div>
        </div>

        <div className="ent-auth-form-side">
          <div className="ent-login-card">
            {!showSignup && (
              <div className="ent-portal-tabs">
                {['admin', 'manager', 'staff'].map(p => (
                  <button key={p} onClick={() => setLoginType(p)} className={loginType === p ? 'active' : ''}>{p.toUpperCase()}</button>
                ))}
              </div>
            )}
            <div className="ent-card-head">
              <div className="ent-icon-circle"><i className={`fas ${showSignup ? 'fa-user-plus' : 'fa-lock-shield'}`}></i></div>
              <h2>{showSignup ? "Account Setup" : `${loginType.toUpperCase()} PORTAL`}</h2>
            </div>

            {authError && <div className="ent-auth-alert">{authError}</div>}

            <form onSubmit={handleAuthSubmit} className="ent-master-form">
              <div className="ent-input-group">
                <label>NETWORK IDENTITY</label>
                <div className="ent-input-wrapper">
                  <i className="fas fa-fingerprint"></i>
                  <input name="username" placeholder="Access ID" onChange={handleAuthChange} required />
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
                {isLoading ? "VERIFYING..." : "INITIATE SESSION"}
              </button>
            </form>
            <p className="ent-toggle-text" onClick={() => setShowSignup(!showSignup)}>
              {showSignup ? "← Back to Login" : "Request Network Access?"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ent-app-layout">
      {/* SIDEBAR NAVIGATION */}
      <div className="ent-sidebar">
        <div className="ent-logo-section">
          <div className="ent-logo-icon"><i className="fas fa-cube"></i></div>
          <div className="ent-logo-text">INV-PRO <span>SUITE</span></div>
        </div>
        <div className="ent-sidebar-content">
          <div className="ent-nav-label">Operations</div>
          <div className={`ent-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-chart-pie"></i> <span>Dashboard</span></div>
          <div className={`ent-nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><i className="fas fa-cash-register"></i> <span>POS Terminal</span></div>
          {canExport && <div className={`ent-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><i className="fas fa-chart-line"></i> <span>BI Analytics</span></div>}
          <div className="ent-nav-label" style={{marginTop:'25px'}}>Audit & Access</div>
          {isAdmin && <div className={`ent-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><i className="fas fa-user-shield"></i> <span>Identities</span></div>}
          {canExport && <div className={`ent-nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}><i className="fas fa-book"></i> <span>Stock Ledger</span></div>}
        </div>
        <div className="ent-sidebar-footer" onClick={handleLogout}><i className="fas fa-power-off"></i> <span>TERMINATE SESSION</span></div>
      </div>

      {/* MAIN VIEWPORT */}
      <div className="ent-main-content">
        <header className="ent-page-header">
          <div className="header-info"><h1>{activeTab.toUpperCase()} MODULE</h1><p>Status: Operational ●</p></div>
          <div className="header-profile">
            <div className="profile-details"><div className="profile-name">{currentUser}</div><div className={`profile-role role-${userRole}`}>{userRole}</div></div>
            <div className="profile-avatar">{currentUser.charAt(0).toUpperCase()}</div>
          </div>
        </header>

        {/* --- DYNAMIC MODULE RENDERING --- */}
        
        {/* DASHBOARD MOD */}
        {activeTab === 'dashboard' && (
          <div className="fade-in">
            <div className="ent-kpi-row">
              <div className="ent-kpi-card"><div className="kpi-icon"><i className="fas fa-boxes"></i></div><div className="kpi-data"><h3>{products.length}</h3><p>Global SKUs</p></div></div>
              <div className="ent-kpi-card success"><div className="kpi-icon"><i className="fas fa-coins"></i></div><div className="kpi-data"><h3>₹{products.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}</h3><p>Assets Value</p></div></div>
              <div className="ent-kpi-card warning"><div className="kpi-icon"><i className="fas fa-bell"></i></div><div className="kpi-data"><h3>{analyticsData.lowStock.length}</h3><p>Stock Alerts</p></div></div>
            </div>

            <div className="ent-dashboard-grid">
              <div className="ent-table-panel">
                <div className="panel-header"><div className="panel-search"><i className="fas fa-search"></i><input placeholder="Search SKU or Name..." onChange={(e)=>setSearchTerm(e.target.value)} /></div></div>
                <table className="ent-master-table">
                  <thead><tr><th>ENTITY IDENTITY</th><th>SKU REFERENCE</th><th>STOCK</th><th>UNIT VALUE</th>{isAdmin && <th>OPS</th>}</tr></thead>
                  <tbody>
                    {products.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <tr key={p.id}>
                        <td className="entity-cell">
                          {p.image_url ? (
                            <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} alt="" />
                          ) : <div className="entity-placeholder">N/A</div>}
                          <div className="entity-name">{p.name}</div>
                        </td>
                        <td className="sku-cell">{p.sku}</td>
                        <td className="stock-cell"><span className={`ent-badge ${p.quantity < 20 ? 'danger' : 'success'}`}>{p.quantity} Units</span></td>
                        <td className="price-cell">₹{p.price}</td>
                        {isAdmin && (
                          <td className="ops-cell">
                            <button className="btn-op edit" onClick={()=> { setFormData({...p, image: null}); setEditingId(p.id); }}><i className="fas fa-pen"></i></button>
                            <button className="btn-op delete" onClick={()=> axios.delete(`${API_BASE}/products/${p.id}`).then(()=>fetchProducts())}><i className="fas fa-trash"></i></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="ent-form-panel">
                  <h3>{editingId ? 'MODIFY NODE' : 'INIT NEW SKU'}</h3>
                  <form className="ent-crud-form" onSubmit={handleInventoryMutation}>
                    <input className="pro-input" placeholder="Product Name" value={formData.name} onChange={(e)=>setFormData({...formData, name:e.target.value})} required />
                    <input className="pro-input" placeholder="SKU String" value={formData.sku} onChange={(e)=>setFormData({...formData, sku:e.target.value})} required />
                    <div className="field-row">
                      <input className="pro-input" type="number" placeholder="Qty" value={formData.quantity} onChange={(e)=>setFormData({...formData, quantity:e.target.value})} required />
                      <input className="pro-input" type="number" placeholder="Price" value={formData.price} onChange={(e)=>setFormData({...formData, price:e.target.value})} required />
                    </div>
                    <div className="upload-zone"><label><i className="fas fa-image"></i> {formData.image ? formData.image.name : "PHOTO"}<input type="file" onChange={(e)=>setFormData({...formData, image:e.target.files[0]})} style={{display:'none'}}/></label></div>
                    <button type="submit" className="btn-commit">{editingId ? 'UPDATE' : 'COMMIT'}</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS MOD */}
        {activeTab === 'analytics' && (
          <div className="ent-bi-dashboard fade-in">
            <div className="bi-stats-row">
              <div className="bi-card"><div className="label">TOTAL REVENUE</div><div className="value">₹{analyticsData.revenueTotal.toLocaleString()}</div></div>
              <div className="bi-card"><div className="label">ACTIVE SKUs</div><div className="value">{products.length}</div></div>
            </div>
            <div className="bi-charts-row">
              <div className="bi-chart-panel main"><div className="panel-head">SALES TREND</div><div className="chart-container"><Line data={{ labels: analyticsData.salesTrend.map(d=>d.date), datasets: [{ label:'Revenue', data: analyticsData.salesTrend.map(d=>d.daily_revenue), borderColor:'#4f46e5', fill:true }] }} options={{maintainAspectRatio:false}} /></div></div>
              <div className="bi-chart-panel side"><div className="panel-head">MARKET SHARE</div><div className="chart-container"><Doughnut data={{ labels: analyticsData.categorySales.map(c=>c.category), datasets: [{ data: analyticsData.categorySales.map(c=>c.revenue), backgroundColor:['#4f46e5','#10b981','#f59e0b','#ef4444'] }] }} options={{maintainAspectRatio:false}} /></div></div>
            </div>
          </div>
        )}

        {/* POS MOD */}
        {activeTab === 'sales' && (
          <div className="ent-pos-viewport fade-in">
            <div className="ent-pos-catalog">
              <div className="pos-scanner-box"><i className="fas fa-barcode"></i><form onSubmit={handleBarcodeSubmit} style={{flex:1}}><input ref={barcodeRef} placeholder="SCAN READY..." value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} /></form></div>
              <div className="pos-items-grid">
                {products.filter(p=>p.quantity>0).map(p=>(
                  <div key={p.id} className="pos-sku-card" onClick={()=>addToCart(p)}>
                    <div className="sku-image-box">
                      {p.image_url && <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} alt=""/>}
                    </div>
                    <h4>{p.name}</h4><div className="sku-price">₹{p.price}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ent-pos-cart">
              <div className="cart-head"><h3>ACTIVE QUEUE</h3><span>{cart.length} ITEMS</span></div>
              <div className="cart-list">
                {cart.map(i => (
                  <div key={i.id} className="cart-item-row">
                    <div className="item-info"><div>{i.name}</div><small>₹{i.price}</small></div>
                    <div className="item-ops"><button onClick={()=>setCart(cart.filter(x=>x.id!==i.id))}>×</button><span>{i.cartQty}</span><div className="total-val">₹{i.price*i.cartQty}</div></div>
                  </div>
                ))}
              </div>
              <div className="cart-summary-section">
                <div className="summary-row grand"><span>TOTAL</span><span>₹{cart.reduce((a,b)=>a+(b.price*b.cartQty),0)}</span></div>
                <button onClick={finalizeSale} disabled={isCheckingOut || cart.length===0} className="btn-finalize">{isCheckingOut ? "SYNCING..." : "GENERATE BILL"}</button>
              </div>
            </div>
          </div>
        )}

        {/* LEDGER MOD */}
        {activeTab === 'ledger' && (
          <div className="ent-audit-viewport fade-in">
            <div className="ent-table-panel full">
              <div className="panel-header"><h3>AUDIT LOG</h3></div>
              <table className="ent-master-table">
                <thead><tr><th>TIMESTAMP</th><th>ITEM</th><th>TYPE</th><th>DELTA</th><th>NOTES</th></tr></thead>
                <tbody>
                  {ledgerData.map(l=>(
                    <tr key={l.id}><td>{new Date(l.created_at).toLocaleString()}</td><td style={{fontWeight:800}}>{l.product_name}</td><td>{l.transaction_type}</td><td style={{color:l.quantity_changed>0?'green':'red'}}>{l.quantity_changed}</td><td>{l.notes}</td></tr>
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

export default App;