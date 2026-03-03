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
// ENTERPRISE CHART CONFIGURATION (Chart.js 4.x)
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

function App() {
  // ===================================================
  // 1. MASTER STATE MANAGEMENT (FULL DATA SUITE)
  // ===================================================
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
  
  // UI & Routing States
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inventory Form Data
  const [formData, setFormData] = useState({ 
    name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' 
  });
  
  // Authentication & Session Persistence
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  const [loginType, setLoginType] = useState('admin');

  // SMART POS CART & SCANNER LOGIC
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // API BASE URL (CENTRALIZED FOR RENDER)
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';

  // ===================================================
  // 2. DATA SYNCHRONIZATION (REST API LAYER)
  // ===================================================
  
  const fetchProducts = () => {
    axios.get(`${API_BASE}/products`)
      .then(res => setProducts(res.data))
      .catch(err => console.error("Inventory Sync Error:", err));
  };

  const fetchSales = () => {
    axios.get(`${API_BASE}/sales`)
      .then(res => setSales(res.data))
      .catch(err => console.error("Sales Sync Error:", err));
  };

  const fetchUsersList = () => {
    axios.get(`${API_BASE}/users`)
      .then(res => setUsersList(res.data))
      .catch(err => console.error("User Audit Error:", err));
  };

  const fetchLedger = () => {
    axios.get(`${API_BASE}/ledger`)
      .then(res => setLedgerData(res.data))
      .catch(err => console.error("Ledger Access Error:", err));
  };

  // 🔥 BUSINESS INTELLIGENCE DATA FETCH 🔥
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
      console.error("Analytics Engine Error:", err);
    }
  };

  // Session Bootstrapper
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

  // Conditional Data Fetching based on Tabs
  useEffect(() => {
    if (activeTab === 'users' && userRole === 'admin') fetchUsersList();
    if (activeTab === 'ledger' && (userRole === 'admin' || userRole === 'manager')) fetchLedger();
    if (activeTab === 'analytics' && (userRole === 'admin' || userRole === 'manager')) fetchAnalytics();
  }, [activeTab, userRole]);

  // ===================================================
  // 3. AUTHENTICATION & ACCESS CONTROL (RBAC)
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
          if (actualRole !== loginType) {
            alert(`🛑 Unauthorized! Access to '${loginType}' portal is restricted for your role.`);
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
          alert("✅ Registration Successful! Please login as Staff."); 
          setShowSignup(false); 
          setLoginType('staff'); 
        }
      })
      .catch(err => alert(`❌ Authentication Error: ${err.response?.data?.error || "System Unavailable"}`));
  };

  const handleLogout = () => { 
    localStorage.clear(); 
    setIsLoggedIn(false); 
    window.location.reload(); 
  };

  // ===================================================
  // 4. INVENTORY OPERATIONS (CRUD SUITE)
  // ===================================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert("🛑 Admin privileges required for this action.");

    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);

    // Smart Image Handling (Cloudinary vs Local)
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
    }).catch(err => alert("❌ Update Error: " + err.message));
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    if(document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
  };

  const handleDelete = (id) => {
    if (userRole !== 'admin') return;
    if(window.confirm("⚠️ Permanent Delete? This will remove all associated audit history.")) {
      axios.delete(`${API_BASE}/products/${id}`).then(() => fetchProducts());
    }
  };

  // ===================================================
  // 5. SMART POS SYSTEM (TERMINAL LOGIC)
  // ===================================================
  const addToCart = (product) => {
    if (product.quantity <= 0) return alert(`❌ ${product.name} is Out of Stock!`);
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.cartQty >= product.quantity) return alert("⚠️ Stock Limit reached in cart.");
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
    else if (newQty > item.quantity) alert("⚠️ Inventory Limit reached.");
    else setCart(cart.map(i => i.id === productId ? { ...i, cartQty: newQty } : i));
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const product = products.find(p => p.sku.toLowerCase() === barcodeInput.toLowerCase().trim());
    if (product) { addToCart(product); setBarcodeInput(''); }
    else { alert("❌ Product SKU not found."); setBarcodeInput(''); }
  };

  // ===================================================
  // 6. ENTERPRISE BILLING ENGINE (jsPDF)
  // ===================================================
  const generateInvoice = (cartItems, totalAmount) => {
    const doc = new jsPDF();
    const invoiceNo = Math.floor(100000 + Math.random() * 900000);
    
    // Header & Branding
    doc.setFontSize(22); doc.setTextColor(79, 70, 229);
    doc.text("NEXT-GEN CLOUD ERP", 105, 20, { align: "center" });
    
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text(`Invoice #INV-${invoiceNo}`, 15, 45);
    doc.text(`Cashier: ${currentUser.toUpperCase()}`, 140, 45);
    doc.text(`DateTime: ${new Date().toLocaleString()}`, 15, 52);

    const tableBody = cartItems.map(item => [
      item.name, 
      item.cartQty, 
      `Rs.${item.price}`, 
      `Rs.${item.price * item.cartQty}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Product Description', 'Quantity', 'Rate', 'Total']],
      body: tableBody,
      headStyles: { fillColor: [79, 70, 229] },
      theme: 'striped'
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14); doc.setTextColor(16, 185, 129);
    doc.text(`Grand Total: Rs. ${totalAmount}`, 140, finalY);
    doc.save(`Invoice_INV_${invoiceNo}.pdf`);
  };

  const processBulkCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);
    try {
      await Promise.all(cart.map(item => 
        axios.post(`${API_BASE}/sales`, { 
          product_id: item.id, 
          quantity_sold: item.cartQty 
        })
      ));
      const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
      generateInvoice(cart, grandTotal);
      setCart([]); fetchProducts(); fetchSales(); alert("✅ Checkout Successful!");
    } catch (error) { 
      alert("❌ System Sync Failure! Please check connectivity."); 
    } finally { 
      setIsCheckingOut(false); 
    }
  };

  // ===================================================
  // 7. PERMISSION & LOGIC HELPERS
  // ===================================================
  const isAdmin = userRole === 'admin';
  const canExport = userRole === 'admin' || userRole === 'manager';

  // ===================================================
  // 8. SPLIT-SCREEN AUTHENTICATION RENDER
  // ===================================================
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', overflow: 'hidden' }}>
        {/* Branding Section */}
        <div style={{ flex: 1.2, background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: '0 0 20px' }}>INV-PRO <br/><span style={{ color: '#818cf8' }}>Business Suite</span></h1>
          <p style={{ fontSize: '1.2rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '500px' }}>
            Enterprise-grade Cloud Architecture with Real-time POS, Role-based security, and High-fidelity Business Analytics.
          </p>
          <div style={{ display: 'flex', gap: '40px', marginTop: '30px' }}>
            <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.8rem' }}>99.9%</h3>
              <p style={{ margin: 0, color: '#94a3b8' }}>Uptime Reliability</p>
            </div>
            <div style={{ borderLeft: '3px solid #f59e0b', paddingLeft: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.8rem' }}>AES-256</h3>
              <p style={{ margin: 0, color: '#94a3b8' }}>Security Standard</p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ffffff' }}>
          <div className="glass-card" style={{ width: '440px', padding: '50px', borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            {!showSignup && (
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '8px', marginBottom: '35px' }}>
                <button type="button" onClick={() => setLoginType('admin')} style={{ flex: 1, padding: '12px', border: 'none', background: loginType === 'admin' ? 'white' : 'transparent', borderRadius: '8px', fontWeight: 700, boxShadow: loginType === 'admin' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>Admin</button>
                <button type="button" onClick={() => setLoginType('manager')} style={{ flex: 1, padding: '12px', border: 'none', background: loginType === 'manager' ? 'white' : 'transparent', borderRadius: '8px', fontWeight: 700, boxShadow: loginType === 'manager' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>Manager</button>
                <button type="button" onClick={() => setLoginType('staff')} style={{ flex: 1, padding: '12px', border: 'none', background: loginType === 'staff' ? 'white' : 'transparent', borderRadius: '8px', fontWeight: 700, boxShadow: loginType === 'staff' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none' }}>Staff</button>
              </div>
            )}
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>{showSignup ? "Account Setup" : `${loginType.toUpperCase()} Access`}</h2>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Identify yourself to join the cloud network.</p>
            
            <form onSubmit={handleAuthSubmit} className="pro-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input className="pro-input" name="username" placeholder="Username / User ID" onChange={handleAuthChange} required style={{ height: '48px' }} />
              <input className="pro-input" name="password" type="password" placeholder="Secure Password" onChange={handleAuthChange} required style={{ height: '48px' }} />
              <button type="submit" className="btn-primary-pro" style={{ height: '52px', marginTop: '10px', background: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b') }}>
                {showSignup ? "Register System" : "Verify Authenticity"}
              </button>
            </form>
            
            <button onClick={() => setShowSignup(!showSignup)} style={{ marginTop: '30px', background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
              {showSignup ? "← Back to Login Portal" : "New User? Apply for Access"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // 9. CORE DASHBOARD RENDER
  // ===================================================
  return (
    <div className="main-layout">
      {/* GLOBAL SIDEBAR */}
      <div className="sidebar">
        <h2 style={{ padding: '0 15px', marginBottom: '30px' }}><i className="fas fa-layer-group"></i> INV-PRO</h2>
        
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', marginBottom: '10px', paddingLeft: '20px' }}>Navigation</div>
        <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-chart-pie"></i> Intelligence</div>
        <div className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><i className="fas fa-cash-register"></i> POS Terminal</div>
        
        {/* 🔥 DYNAMIC ANALYTICS ENTRY 🔥 */}
        {canExport && (
          <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <i className="fas fa-chart-line"></i> Business Analytics
          </div>
        )}
        
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#64748b', marginBottom: '10px', marginTop: '30px', paddingLeft: '20px' }}>Administration</div>
        {isAdmin && <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><i className="fas fa-users-cog"></i> Manage Users</div>}
        {canExport && <div className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}><i className="fas fa-book"></i> Stock Ledger</div>}
        
        <div className="nav-item" style={{ marginTop: 'auto', color: '#ef4444' }} onClick={handleLogout}><i className="fas fa-sign-out-alt"></i> Terminate Session</div>
      </div>

      <div className="content-area">
        {/* CONTEXTUAL HEADER */}
        <div className="header-pro">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Control</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>System Status: Operational</p>
          </div>
          <div className="user-profile-badge">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{currentUser}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{userRole.toUpperCase()} PRIVILEGES</div>
            </div>
            <div className="avatar" style={{ background: userRole === 'admin' ? '#4f46e5' : '#10b981' }}>{currentUser.charAt(0).toUpperCase()}</div>
          </div>
        </div>

        {/* ===================================================
            TAB VIEW: DASHBOARD (INVENTORY HUB)
        =================================================== */}
        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card-pro"><h3>Total SKUs</h3><p>{products.length}</p></div>
              <div className="stat-card-pro green-line"><h3>Inventory Value</h3><p>₹{products.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}</p></div>
              <div className="stat-card-pro purple-line"><h3>Live Transactions</h3><p>{sales.length}</p></div>
            </div>

            <div className="dashboard-grid">
              <div className="pro-table-card">
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' }}></i>
                    <input className="pro-input" placeholder="Query Product Name, Category or SKU Code..." style={{ width: '400px', paddingLeft: '40px' }} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <table className="pro-table">
                  <thead><tr><th>Item Identity</th><th>SKU Code</th><th>Category</th><th>Stock Status</th><th>Unit Price</th>{isAdmin && <th>Actions</th>}</tr></thead>
                  <tbody>
                    {products.filter(p=>p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                      <tr key={p.id}>
                        <td style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* 🔥 SMART IMAGE ROUTING LOGIC 🔥 */}
                          {p.image_url ? (
                            <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} alt="img" />
                          ) : <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-box" style={{ color: '#cbd5e1' }}></i></div>}
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.sku}</td>
                        <td><span style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{p.category}</span></td>
                        <td><span className={`status-badge ${p.quantity < 20 ? 'status-low' : 'status-good'}`}>{p.quantity} Units</span></td>
                        <td style={{ fontWeight: 800 }}>₹{p.price}</td>
                        {isAdmin && (
                          <td>
                            <button onClick={()=> { setFormData({...p, image: null}); setEditingId(p.id); }} style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}><i className="fas fa-edit"></i></button>
                            <button onClick={()=> handleDelete(p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '12px', fontSize: '1rem' }}><i className="fas fa-trash"></i></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isAdmin && (
                <div className="glass-card" style={{ height: 'fit-content', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>{editingId ? 'Modify Catalog Record' : 'Add New Inventory'}</h3>
                  <form className="pro-form" onSubmit={handleSubmit}>
                    <input className="pro-input" placeholder="Full Product Name" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required />
                    <input className="pro-input" placeholder="Unique SKU / Barcode" value={formData.sku} onChange={(e)=>setFormData({...formData, sku: e.target.value})} required />
                    <input className="pro-input" placeholder="Broad Category" value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} required />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input className="pro-input" type="number" placeholder="Stock Qty" value={formData.quantity} onChange={(e)=>setFormData({...formData, quantity: e.target.value})} required style={{ flex: 1 }} />
                      <input className="pro-input" type="number" placeholder="Retail Price" value={formData.price} onChange={(e)=>setFormData({...formData, price: e.target.value})} required style={{ flex: 1 }} />
                    </div>
                    <div style={{ border: '1px dashed #cbd5e1', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>
                        <i className="fas fa-cloud-upload-alt" style={{ display: 'block', fontSize: '1.5rem', marginBottom: '5px' }}></i>
                        {formData.image ? formData.image.name : "Attach Product Photograph"}
                        <input type="file" id="imageInput" onChange={(e)=>setFormData({...formData, image: e.target.files[0]})} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <button className="btn-primary-pro" style={{ height: '48px' }}>{editingId ? 'Confirm Modifications' : 'Commit New Product'}</button>
                    {editingId && <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, marginTop: '10px' }}>Abort Update</button>}
                  </form>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===================================================
            TAB VIEW: SALES (POS SMART TERMINAL)
        =================================================== */}
        {activeTab === 'sales' && (
          <div style={{ display: 'flex', gap: '20px', height: '82vh' }}>
            {/* Catalog Section */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'center', border: '2px solid #e2e8f0' }}>
                <div style={{ padding: '12px', background: '#e0e7ff', borderRadius: '10px' }}>
                  <i className="fas fa-barcode" style={{ fontSize: '1.8rem', color: '#4f46e5' }}></i>
                </div>
                <form onSubmit={handleBarcodeSubmit} style={{ flex: 1 }}>
                  <input className="pro-input" placeholder="Hardware Scan Active... (Or manual SKU search)" value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} autoFocus style={{ height: '54px', fontSize: '1.1rem', border: 'none', padding: 0 }} />
                </form>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', overflowY: 'auto', paddingRight: '10px' }}>
                {products.filter(p=>p.quantity > 0).map(p => (
                  <div key={p.id} className="glass-card" onClick={()=>addToCart(p)} style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', border: '1px solid #f1f5f9' }} onMouseOver={(e)=>e.currentTarget.style.transform='scale(1.03)'} onMouseOut={(e)=>e.currentTarget.style.transform='scale(1)'}>
                    {p.image_url ? (
                      <img src={p.image_url.startsWith('http') ? p.image_url : `https://inv-pro-erp.onrender.com${p.image_url}`} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', marginBottom: '10px' }} alt="" />
                    ) : <div style={{ height: '80px', width: '80px', background: '#f8fafc', margin: '0 auto 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-box" style={{ fontSize: '1.5rem', color: '#cbd5e1' }}></i></div>}
                    <h4 style={{ margin: '5px 0', fontSize: '0.95rem' }}>{p.name}</h4>
                    <p style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem', margin: '5px 0' }}>₹{p.price}</p>
                    <div style={{ background: '#f1f5f9', display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700 }}>Stock: {p.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Cart Section */}
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', border: '2px solid #f1f5f9', padding: 0 }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
                <h3 style={{ margin: 0 }}><i className="fas fa-shopping-basket" style={{ color: '#4f46e5', marginRight: '10px' }}></i> Active Checkout</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {cart.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-cart-arrow-down" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
                    <p>Terminal empty.</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.name}</div>
                        <small style={{ color: '#10b981', fontWeight: 700 }}>₹{item.price} per unit</small>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={()=>updateCartQty(item.id, -1)} style={{ width: '28px', height: '28px', background: '#fee2e2', border: 'none', borderRadius: '6px', color: '#ef4444', fontWeight: 900 }}>-</button>
                        <span style={{ fontWeight: 800 }}>{item.cartQty}</span>
                        <button onClick={()=>updateCartQty(item.id, 1)} style={{ width: '28px', height: '28px', background: '#dcfce7', border: 'none', borderRadius: '6px', color: '#10b981', fontWeight: 900 }}>+</button>
                        <div style={{ width: '70px', textAlign: 'right', fontWeight: 900 }}>₹{item.price * item.cartQty}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ padding: '25px', borderTop: '2px dashed #cbd5e1', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem' }}>
                  <span>Tax (CGST/SGST 18%):</span>
                  <span>Included</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 900 }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#10b981' }}>₹{cart.reduce((s,i)=>s+(i.price*i.cartQty),0).toLocaleString()}</span>
                </div>
                <button onClick={processBulkCheckout} disabled={isCheckingOut || cart.length === 0} className="btn-primary-pro" style={{ marginTop: '20px', height: '56px', fontSize: '1.1rem' }}>
                  {isCheckingOut ? <><i className="fas fa-sync fa-spin"></i> Processing Transaction...</> : <><i className="fas fa-receipt"></i> Generate Fiscal Invoice</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            TAB VIEW: ANALYTICS (BUSINESS INTELLIGENCE) 🔥
        =================================================== */}
        {activeTab === 'analytics' && canExport && (
          <div className="analytics-view" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="stats-grid">
              <div className="stat-card-pro green-line">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>Revenue Performance</h3>
                  <i className="fas fa-arrow-trend-up" style={{ color: '#10b981' }}></i>
                </div>
                <p>₹{analyticsData.salesTrend.reduce((a, b) => a + parseFloat(b.daily_revenue), 0).toLocaleString()}</p>
                <small>Consolidated 7-day revenue stream</small>
              </div>
              <div className="stat-card-pro purple-line">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>Catalog Distribution</h3>
                  <i className="fas fa-pie-chart" style={{ color: '#8b5cf6' }}></i>
                </div>
                <p>{analyticsData.categorySales.length} Active Segments</p>
                <small>Global categorical footprint</small>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '25px' }}>
              <div className="glass-card" style={{ height: '420px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '20px' }}><i className="fas fa-chart-line" style={{ marginRight: '10px', color: '#4f46e5' }}></i> Sales Progression Matrix</h3>
                <div style={{ height: '330px' }}>
                  <Line 
                    data={{
                      labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
                      datasets: [{
                        label: 'Gross Daily Revenue (₹)',
                        data: analyticsData.salesTrend.map(d => d.daily_revenue),
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 6,
                        pointBackgroundColor: '#fff',
                        pointBorderWidth: 3
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
                    }}
                  />
                </div>
              </div>
              <div className="glass-card" style={{ height: '420px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '20px' }}><i className="fas fa-chart-pie" style={{ marginRight: '10px', color: '#8b5cf6' }}></i> Revenue Market Share</h3>
                <div style={{ height: '330px' }}>
                  <Doughnut 
                    data={{
                      labels: analyticsData.categorySales.map(c => c.category),
                      datasets: [{
                        data: analyticsData.categorySales.map(c => c.revenue),
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                        borderWidth: 0
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      cutout: '75%',
                      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pro-table-card">
              <div style={{ padding: '25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}><i className="fas fa-crown" style={{ color: '#f59e0b', marginRight: '10px' }}></i> Top Performing Inventory (SKU Rank)</h3>
                <button className="btn-primary-pro" style={{ width: 'auto', padding: '8px 20px', fontSize: '0.8rem' }} onClick={()=>window.print()}>Download BI Report</button>
              </div>
              <table className="pro-table">
                <thead><tr><th>Product Identifier</th><th>Velocity (Units Sold)</th><th>Total Capital Contribution</th><th>Rank</th></tr></thead>
                <tbody>
                  {analyticsData.topProducts.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</td>
                      <td><span className="status-badge status-good" style={{ padding: '6px 15px' }}>{p.total_sold} units</span></td>
                      <td style={{ fontWeight: 900, color: '#10b981' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                      <td><div style={{ width: '30px', height: '30px', borderRadius: '50%', background: idx === 0 ? '#fef3c7' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: idx === 0 ? '#d97706' : '#64748b' }}>#{idx+1}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STOCK LEDGER TAB (AUDIT PASSBOOK) */}
        {activeTab === 'ledger' && canExport && (
          <div className="pro-table-card">
            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-history" style={{ color: '#64748b', marginRight: '10px' }}></i> Master Transaction History</h3>
            </div>
            <table className="pro-table">
              <thead><tr><th>Audit Timestamp</th><th>Product Entity</th><th>Activity Type</th><th>Volume Delta</th><th>Final Balance</th><th>Audit Remarks</th></tr></thead>
              <tbody>
                {ledgerData.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 800 }}>{log.product_name}</td>
                    <td><span className="status-badge" style={{ background: '#f1f5f9', color: '#475569' }}>{log.transaction_type}</span></td>
                    <td style={{ color: log.quantity_changed > 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: '1.1rem' }}>
                      {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                    </td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{log.running_balance}</td>
                    <td style={{ fontSize: '0.85rem', fontStyle: 'italic', color: '#64748b' }}>{log.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USER SECURITY TAB */}
        {activeTab === 'users' && isAdmin && (
          <div className="pro-table-card">
            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0 }}><i className="fas fa-user-shield" style={{ color: '#4f46e5', marginRight: '10px' }}></i> System Access & RBAC Configuration</h3>
            </div>
            <table className="pro-table">
              <thead><tr><th>Profile ID</th><th>Network Identity</th><th>Current Privilege</th><th>Permission Assignment</th></tr></thead>
              <tbody>
                {usersList.map(user => (
                  <tr key={user.id}>
                    <td style={{ color: '#94a3b8' }}>#{user.id.toString().padStart(4, '0')}</td>
                    <td style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>{user.username.charAt(0).toUpperCase()}</div>
                      {user.username} {user.username === currentUser && <span style={{ fontSize: '0.6rem', background: '#dcfce7', color: '#10b981', padding: '2px 8px', borderRadius: '20px' }}>ACTIVE SESSION</span>}
                    </td>
                    <td><span className={`status-badge status-${user.role}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>{user.role}</span></td>
                    <td>
                      <select className="pro-input" value={user.role} style={{ width: '180px', height: '40px', fontSize: '0.85rem' }} onChange={(e)=> {
                        axios.put(`${API_BASE}/users/${user.id}/role`, { role: e.target.value }).then(()=>fetchUsersList());
                      }} disabled={user.username === currentUser}>
                        <option value="staff">Standard Staff</option>
                        <option value="manager">System Manager</option>
                        <option value="admin">Super Administrator</option>
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