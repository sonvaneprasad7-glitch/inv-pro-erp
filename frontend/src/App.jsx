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
  // ==========================================
  // 1. ALL STATES
  // ==========================================
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]); 
  const [usersList, setUsersList] = useState([]); 
  const [ledgerData, setLedgerData] = useState([]); 
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  
  const [formData, setFormData] = useState({ 
    name: '', 
    sku: '', 
    category: '', 
    quantity: '', 
    price: '', 
    image: null, 
    image_url: '' 
  });
  
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  const [loginType, setLoginType] = useState('admin');

  // 🔥 NAYE STATES FOR SMART POS CART 🔥
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // ==========================================
  // 2. DATA FETCHING FUNCTIONS
  // ==========================================
  const fetchProducts = () => {
    axios.get('https://inv-pro-erp.onrender.com/api/products')
      .then(res => setProducts(res.data))
      .catch(err => console.error("Error fetching products:", err));
  };

  const fetchSales = () => {
    axios.get('https://inv-pro-erp.onrender.com/api/sales')
      .then(res => setSales(res.data))
      .catch(err => console.error("Error fetching sales:", err));
  };

  const fetchUsersList = () => {
    axios.get('https://inv-pro-erp.onrender.com/api/users')
      .then(res => setUsersList(res.data))
      .catch(err => console.error("Error fetching users:", err));
  };

  const fetchLedger = () => {
    axios.get('https://inv-pro-erp.onrender.com/api/ledger')
      .then(res => setLedgerData(res.data))
      .catch(err => console.error("Error fetching ledger:", err));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role'); 
    
    if (token) {
      setIsLoggedIn(true);
      setCurrentUser(localStorage.getItem('username'));
      setUserRole(role || 'staff');
      fetchProducts();
      fetchSales(); 
      if (role === 'admin' || role === 'manager') {
        fetchLedger();
      }
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && userRole === 'admin') fetchUsersList();
    if (activeTab === 'ledger' && (userRole === 'admin' || userRole === 'manager')) fetchLedger();
  }, [activeTab, userRole]);

  // ==========================================
  // 3. AUTHENTICATION LOGIC 
  // ==========================================
  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = showSignup ? 'register' : 'login';
    const payload = showSignup ? { ...authData, role: 'staff' } : authData;
    
    axios.post(`https://inv-pro-erp.onrender.com/api/${endpoint}`, payload)
      .then(res => {
        if (!showSignup) {
          const actualRole = res.data.role || 'staff';
          if (actualRole !== loginType) {
            alert(`🛑 Access Denied! Your assigned role is '${actualRole.toUpperCase()}', but you are attempting to log in via the '${loginType.toUpperCase()}' portal. Please select the correct tab.`);
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
          if (actualRole === 'admin' || actualRole === 'manager') fetchLedger();
        } else { 
          alert("✅ Account Successfully Created! For security compliance, you have been registered with 'Staff' privileges. Please log in using the Staff portal."); 
          setShowSignup(false); 
          setLoginType('staff'); 
        }
      })
      .catch(err => {
        alert(`❌ System Error: ${err.response?.data?.error || "Authentication failed."}`);
      });
  };

  const handleLogout = () => { 
    localStorage.clear(); 
    setIsLoggedIn(false); 
    window.location.reload(); 
  };

  // ==========================================
  // 4. INVENTORY CRUD LOGIC 
  // ==========================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (userRole !== 'admin') return alert("🛑 Permission Denied: Administrative privileges required.");

    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);

    if (formData.image instanceof File) data.append('image', formData.image);
    else data.append('image_url', formData.image_url || '');

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };

    if (editingId) {
      axios.put(`https://inv-pro-erp.onrender.com/api/products/${editingId}`, data, config)
        .then(() => { fetchProducts(); if(userRole === 'admin' || userRole === 'manager') fetchLedger(); resetForm(); });
    } else {
      axios.post('https://inv-pro-erp.onrender.com/api/products', data, config)
        .then(() => { fetchProducts(); if(userRole === 'admin' || userRole === 'manager') fetchLedger(); resetForm(); });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    if(document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
  };

  const handleDelete = (id) => {
    if (userRole !== 'admin') return alert("🛑 Permission Denied.");
    if(window.confirm("⚠️ System Warning: Are you sure you want to permanently delete this record?")) {
      axios.delete(`https://inv-pro-erp.onrender.com/api/products/${id}`)
        .then(() => fetchProducts());
    }
  };

  // ==========================================
  // 5. SMART POS CART LOGIC (EXPERT LEVEL) 🔥
  // ==========================================
  const addToCart = (product) => {
    if (product.quantity <= 0) return alert(`❌ ${product.name} is currently Out of Stock!`);
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.cartQty >= product.quantity) {
        return alert(`⚠️ Only ${product.quantity} units of ${product.name} available in stock.`);
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setCart([...cart, { ...product, cartQty: 1 }]);
    }
  };

  const updateCartQty = (productId, delta) => {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    
    const newQty = item.cartQty + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== productId)); // Remove if qty becomes 0
    } else if (newQty > item.quantity) {
      alert(`⚠️ Stock Limit Reached: Only ${item.quantity} units available.`);
    } else {
      setCart(cart.map(i => i.id === productId ? { ...i, cartQty: newQty } : i));
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    
    const product = products.find(p => p.sku.toLowerCase() === barcodeInput.toLowerCase().trim());
    if (product) {
      addToCart(product);
      setBarcodeInput(''); // Clear input for next scan
    } else {
      alert(`❌ Product with SKU '${barcodeInput}' not found!`);
      setBarcodeInput('');
    }
  };

  // ==========================================
  // 6. MASTER BULK CHECKOUT & INVOICE GENERATOR
  // ==========================================
  const generateMasterInvoice = (cartItems, totalAmount) => {
    const doc = new jsPDF();
    const invoiceNo = Math.floor(100000 + Math.random() * 900000); // Random 6 digit Master Invoice No

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text("NEXT-GEN CLOUD ERP", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Master Tax Invoice / Cash Receipt", 105, 28, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 35, 195, 35);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Invoice No: #INV-${invoiceNo}`, 15, 45);
    doc.text(`Date & Time: ${new Date().toLocaleString()}`, 15, 52);
    doc.text(`Billed To: Walk-in Customer`, 15, 59);
    doc.text(`Cashier: ${currentUser.toUpperCase()}`, 140, 45);

    const tableBody = cartItems.map(item => [
      item.name,
      item.cartQty,
      `Rs. ${item.price}`,
      `Rs. ${item.price * item.cartQty}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Product Description', 'Quantity', 'Unit Rate', 'Total Amount']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const finalY = doc.lastAutoTable.finalY || 80;
    
    doc.setDrawColor(226, 232, 240);
    doc.line(140, finalY + 5, 195, finalY + 5);
    
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`Grand Total: Rs. ${totalAmount}`, 140, finalY + 15);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business! Visit Again.", 105, finalY + 35, { align: "center" });

    doc.save(`Master_Invoice_INV-${invoiceNo}.pdf`);
  };

  const processBulkCheckout = async () => {
    if (cart.length === 0) return alert("⚠️ Cart is empty! Please add items to generate a bill.");
    
    setIsCheckingOut(true);
    try {
      // Loop through cart and send multiple requests concurrently (Bulk processing)
      await Promise.all(cart.map(item => 
        axios.post('https://inv-pro-erp.onrender.com/api/sales', {
          product_id: item.id,
          quantity_sold: item.cartQty
        })
      ));

      // Calculate total for invoice
      const grandTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQty), 0);
      
      // Generate PDF
      generateMasterInvoice(cart, grandTotal);

      alert("✅ Bulk Transaction Completed Successfully! Master Invoice Generated.");
      
      // Clear Cart & Refresh Data
      setCart([]);
      fetchProducts();
      fetchSales();
      if(userRole === 'admin' || userRole === 'manager') fetchLedger();

    } catch (error) {
      alert("❌ Critical Error: Failed to process some items. Please check the Stock Ledger.");
      console.error(error);
    } finally {
      setIsCheckingOut(false);
    }
  };


  // ==========================================
  // 7. ROLE & EXPORT LOGIC
  // ==========================================
  const handleRoleChange = (userId, newRole) => {
    axios.put(`https://inv-pro-erp.onrender.com/api/users/${userId}/role`, { role: newRole })
      .then(() => { alert("✅ User Role Updated Successfully!"); fetchUsersList(); })
      .catch(() => alert("❌ Server Error."));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Enterprise Inventory Report", 15, 10);
    autoTable(doc, {
      head: [["Name", "SKU", "Category", "Stock", "Price"]],
      body: products.map(p => [p.name, p.sku, p.category, p.quantity, `Rs. ${p.price}`]),
      startY: 20,
    });
    doc.save("Inventory_Report.pdf");
  };

  const isAdmin = userRole === 'admin';
  const canEdit = userRole === 'admin';
  const canExport = userRole === 'admin' || userRole === 'manager';

  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const salesByDate = sales.reduce((acc, s) => {
    const date = new Date(s.sale_date).toLocaleDateString();
    acc[date] = (acc[date] || 0) + parseFloat(s.total_price);
    return acc;
  }, {});
  const sortedDates = Object.keys(salesByDate).sort((a, b) => new Date(a) - new Date(b));

  // ==========================================
  // RENDER: SPLIT-SCREEN ENTERPRISE LOGIN UI
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', overflow: 'hidden' }}>
        <div style={{ flex: 1.2, background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }}></div>
          
          <div style={{ zIndex: 1, marginBottom: '40px' }}>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)', marginBottom: '20px', backdropFilter: 'blur(10px)' }}>
              <i className="fas fa-cloud" style={{ color: '#38bdf8', marginRight: '10px' }}></i>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px' }}>NEXT-GEN CLOUD ERP</span>
            </div>
            <h1 style={{ fontSize: '4rem', fontWeight: 800, margin: '0 0 20px 0', lineHeight: 1.1 }}>
              INV-PRO <br/><span style={{ color: '#818cf8' }}>Business Suite</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '500px' }}>
              Advanced Cloud Architecture with Zero-Latency Smart POS, Role-Based Access Control, and Master Ledger Audit Trails.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '40px', zIndex: 1, marginTop: '20px' }}>
            <div>
              <h3 style={{ fontSize: '2.5rem', margin: 0, color: '#10b981' }}>99.9%</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Server Uptime</p>
            </div>
            <div>
              <h3 style={{ fontSize: '2.5rem', margin: 0, color: '#f59e0b' }}>256-bit</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Encrypted Logic</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <div className="glass-card" style={{ width: '420px', textAlign: 'center', padding: '50px 40px', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', background: '#ffffff', borderRadius: '16px' }}>
            
            {!showSignup && (
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '6px', marginBottom: '30px' }}>
                <button type="button" onClick={() => setLoginType('admin')} style={{ flex: 1, padding: '10px', border: 'none', background: loginType === 'admin' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'admin' ? 700 : 600, color: loginType === 'admin' ? '#4f46e5' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'admin' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>Admin</button>
                <button type="button" onClick={() => setLoginType('manager')} style={{ flex: 1, padding: '10px', border: 'none', background: loginType === 'manager' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'manager' ? 700 : 600, color: loginType === 'manager' ? '#10b981' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'manager' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>Manager</button>
                <button type="button" onClick={() => setLoginType('staff')} style={{ flex: 1, padding: '10px', border: 'none', background: loginType === 'staff' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'staff' ? 700 : 600, color: loginType === 'staff' ? '#f59e0b' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'staff' ? '0 4px 6px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.3s' }}>Staff</button>
              </div>
            )}

            <div style={{ background: showSignup ? '#e0e7ff' : (loginType === 'admin' ? '#e0e7ff' : loginType === 'manager' ? '#dcfce7' : '#fef3c7'), width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', transition: 'all 0.3s' }}>
              <i className={`fas ${showSignup ? 'fa-user-plus' : (loginType === 'admin' ? 'fa-user-shield' : loginType === 'manager' ? 'fa-user-tie' : 'fa-user')}`} style={{ color: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b'), fontSize:'28px' }}></i>
            </div>
            
            <h2 style={{margin:'0 0 8px', color:'#0f172a', fontSize: '1.6rem', fontWeight: 800}}>
              {showSignup ? "Create Account" : loginType === 'admin' ? "Admin Portal" : loginType === 'manager' ? "Manager Access" : "Staff POS Login"}
            </h2>
            <p style={{fontSize: '0.9rem', color: '#64748b', marginBottom: '30px'}}>
              {showSignup ? "Securely register to the system network" : `Please authenticate with your ${loginType} credentials`}
            </p>
            
            <form onSubmit={handleAuthSubmit} className="pro-form" style={{ gap: '15px' }}>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-envelope" style={{ position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' }}></i>
                <input className="pro-input" name="username" placeholder={`${loginType.charAt(0).toUpperCase() + loginType.slice(1)} ID`} onChange={handleAuthChange} required style={{ paddingLeft: '40px', height: '45px' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <i className="fas fa-lock" style={{ position: 'absolute', left: '15px', top: '15px', color: '#94a3b8' }}></i>
                <input className="pro-input" name="password" type="password" placeholder="Secure Password" onChange={handleAuthChange} required style={{ paddingLeft: '40px', height: '45px' }} />
              </div>
              <button type="submit" className="btn-primary-pro" style={{ marginTop:'10px', height: '48px', fontSize: '1rem', background: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b'), transition: 'background 0.3s' }}>
                {showSignup ? "Register User" : `Secure Login`} <i className="fas fa-arrow-right"></i>
              </button>
            </form>
            
            <button type="button" onClick={() => setShowSignup(!showSignup)} style={{ marginTop: '30px', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
              {showSignup ? "← Back to Login Portal" : "New User? Request Access"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN DASHBOARD LAYOUT
  // ==========================================
  return (
    <div className="main-layout">
      
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <h2><i className="fas fa-layer-group"></i> INV-PRO</h2>
        
        <div style={{ marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px', marginLeft: '10px' }}>
            Main Menu
          </div>
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><i className="fas fa-chart-pie"></i> Intelligence</div>
          <div className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}><i className="fas fa-cash-register"></i> Smart POS Terminal</div>
        </div>

        <div style={{marginBottom: '25px'}}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px', marginLeft: '10px' }}>
            Administration
          </div>
          {isAdmin && <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><i className="fas fa-users-cog"></i> Manage Users</div>}
          {canExport && <div className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}><i className="fas fa-book"></i> Stock Ledger</div>}
          {canExport && <div className="nav-item" onClick={exportToPDF}><i className="fas fa-file-pdf"></i> Export Database</div>}
        </div>

        <div className="nav-item" style={{marginTop: 'auto', color: '#ef4444'}} onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout System
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="content-area" style={{ padding: activeTab === 'sales' ? '20px' : '30px' }}>
        
        {/* HEADER (Hide on Sales Tab for full-screen POS feel) */}
        {activeTab !== 'sales' && (
          <div className="header-pro">
            <h1>
              {activeTab === 'dashboard' ? 'Business Intelligence Dashboard' : 
               activeTab === 'users' ? 'System Access Control' : 'Master Audit Ledger'}
            </h1>
            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
              {activeTab === 'dashboard' && (
                <div style={{position: 'relative'}}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8', fontSize: '0.9rem' }}></i>
                  <input className="pro-input" style={{ width: '260px', paddingLeft: '32px', padding: '8px 10px 8px 32px' }} placeholder="Search Name or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              )}
              <div className="user-profile-badge">
                <div style={{textAlign: 'right'}}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>{currentUser}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{userRole}</div>
                </div>
                <div className="avatar">{currentUser.charAt(0).toUpperCase()}</div>
              </div>
            </div>
          </div>
        )}

        {/* STATS GRID */}
        {activeTab === 'dashboard' && (
          <div className="stats-grid">
            <div className="stat-card-pro"><h3>Total Products</h3><p>{products.length}</p></div>
            <div className="stat-card-pro green-line"><h3>Total Stock Value</h3><p>₹{products.reduce((t,i) => t + (i.price * i.quantity), 0).toLocaleString()}</p></div>
            <div className="stat-card-pro purple-line"><h3>Total Revenue</h3><p>₹{sales.reduce((t,s) => t + parseFloat(s.total_price), 0).toLocaleString()}</p></div>
          </div>
        )}

        {/* ==========================================
            TAB 1: DASHBOARD
        ========================================== */}
        {activeTab === 'dashboard' && (
          <>
            <div className="dashboard-grid">
              <div className="charts-column" style={{ display: canEdit ? 'grid' : 'block' }}>
                <div className="glass-card" style={{ height: '280px' }}>
                  <h3 style={{margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a'}}>Revenue Trend</h3>
                  <div style={{ flex: 1, position: 'relative' }}>
                    {sortedDates.length > 0 ? (
                      <Line data={{ labels: sortedDates, datasets: [{ label: 'Revenue (₹)', data: sortedDates.map(d => salesByDate[d]), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 }] }} options={{maintainAspectRatio: false}} />
                    ) : (
                      <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>No sales data.</div>
                    )}
                  </div>
                </div>

                <div className="bottom-charts">
                  <div className="glass-card" style={{ height: '240px' }}>
                    <h3 style={{margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a'}}>Stock Alerts</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Bar data={{ labels: products.map(p => p.name), datasets: [{ label: 'Stock Qty', data: products.map(p => p.quantity), backgroundColor: products.map(p => p.quantity < 20 ? '#ef4444' : '#4f46e5'), borderRadius: 4 }] }} options={{ maintainAspectRatio: false, plugins: {legend: {display: false}} }} />
                    </div>
                  </div>
                  
                  <div className="glass-card" style={{ height: '240px' }}>
                    <h3 style={{margin: '0 0 12px 0', fontSize: '1rem', color: '#0f172a'}}>Category Split</h3>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {Object.keys(categoryCounts).length > 0 ? (
                        <Doughnut data={{ labels: Object.keys(categoryCounts), datasets: [{ data: Object.values(categoryCounts), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'] }] }} options={{ maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: {boxWidth: 12, font: {size: 10}} } } }} />
                      ) : (
                        <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>No data.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="glass-card" style={{ height: 'fit-content' }}>
                  <h3 style={{margin: '0 0 16px 0', fontSize: '1rem', color: '#0f172a'}}>{editingId ? 'Edit Product' : 'Add Product'}</h3>
                  <form className="pro-form" onSubmit={handleSubmit}>
                    <input className="pro-input" placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    <div style={{display: 'flex', gap: '10px'}}>
                      <input className="pro-input" placeholder="SKU Code" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} required style={{flex: 1}} />
                      <input className="pro-input" placeholder="Category" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required style={{flex: 1}} />
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <input className="pro-input" type="number" placeholder="Qty" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required style={{flex: 1}} />
                      <input className="pro-input" type="number" placeholder="Price (₹)" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required style={{flex: 1}} />
                    </div>
                    <div style={{border: '1px dashed #cbd5e1', padding: '8px', borderRadius: '8px', backgroundColor: '#f8fafc'}}>
                      <input type="file" id="imageInput" onChange={(e) => setFormData({...formData, image: e.target.files[0]})} style={{fontSize: '0.8rem', color: '#64748b'}} />
                    </div>
                    <button className="btn-primary-pro" style={{padding: '10px'}}>{editingId ? <><i className="fas fa-save"></i> Save</> : <><i className="fas fa-plus"></i> Add</>}</button>
                    {editingId && <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Cancel Edit</button>}
                  </form>
                </div>
              )}
            </div>

            <div className="pro-table-card">
              <table className="pro-table">
                <thead>
                  <tr>
                    <th>Product Item</th><th>SKU</th><th>Category</th><th>Stock Status</th><th>Unit Price</th>{canEdit && <th style={{textAlign: 'right'}}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                    <tr key={p.id}>
                      <td style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        {p.image_url ? (
                          <img src={`https://inv-pro-erp.onrender.com${p.image_url}`} style={{width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover'}} alt="img" />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><i className="fas fa-image" style={{fontSize: '0.8rem'}}></i></div>
                        )}
                        <span style={{fontWeight: 600, color: '#0f172a'}}>{p.name}</span>
                      </td>
                      <td style={{color: '#64748b', fontFamily: 'monospace'}}>{p.sku}</td>
                      <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>{p.category}</span></td>
                      <td><span className={`status-badge ${p.quantity < 20 ? 'status-low' : 'status-good'}`}>{p.quantity} Units</span></td>
                      <td style={{fontWeight: 700, color: '#0f172a'}}>₹{p.price}</td>
                      {canEdit && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => { setFormData({...p, image: null}); setEditingId(p.id); }} style={{ marginRight: '10px', background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer' }} title="Edit"><i className="fas fa-edit"></i></button>
                          <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Delete"><i className="fas fa-trash-alt"></i></button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {products.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>No products found.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==========================================
            TAB 2: SMART POS UI (EXPERT LEVEL) 🔥
        ========================================== */}
        {activeTab === 'sales' && (
          <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 40px)' }}>
            
            {/* LEFT SIDE: PRODUCT CATALOG & SCANNER (65% width) */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Top Bar: Barcode Scanner */}
              <div className="glass-card" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
                  <i className="fas fa-barcode" style={{ color: '#4f46e5', marginRight: '8px' }}></i> Point of Sale
                </h2>
                <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '10px', width: '350px' }}>
                  <input 
                    type="text" 
                    className="pro-input" 
                    placeholder="Scan Barcode or Enter SKU & Press Enter" 
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    autoFocus
                    style={{ margin: 0, border: '2px solid #e2e8f0', borderRadius: '8px', padding: '10px 15px', fontWeight: 600 }}
                  />
                  <button type="submit" className="btn-primary-pro" style={{ width: 'auto', padding: '0 20px' }}>Add</button>
                </form>
              </div>

              {/* Product Grid (Tap & Add) */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px', paddingRight: '5px' }}>
                {products.filter(p => p.quantity > 0).map(p => (
                  <div 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    style={{ 
                      background: '#fff', borderRadius: '12px', padding: '15px', cursor: 'pointer', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0',
                      transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)'}
                  >
                    {p.image_url ? (
                      <img src={`https://inv-pro-erp.onrender.com${p.image_url}`} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} alt={p.name} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '8px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <i className="fas fa-box" style={{ fontSize: '24px' }}></i>
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', lineHeight: '1.2' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '8px' }}>{p.sku}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>₹{p.price}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: p.quantity < 10 ? '#ef4444' : '#64748b', marginTop: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '10px' }}>
                      Stock: {p.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SIDE: SMART CART (35% width) */}
            <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', height: '100%', border: '1px solid #e2e8f0' }}>
              
              {/* Cart Header */}
              <div style={{ background: '#f8fafc', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}><i className="fas fa-shopping-cart" style={{ color: '#4f46e5' }}></i> Current Order</h3>
                <span style={{ background: '#4f46e5', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{cart.length} Items</span>
              </div>

              {/* Cart Items Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
                {cart.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-box-open" style={{ fontSize: '40px', marginBottom: '15px', color: '#cbd5e1' }}></i>
                    <p>Cart is empty. Scan barcode or tap products to add.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {cart.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{item.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>₹{item.price}</div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button onClick={() => updateCartQty(item.id, -1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: '#f1f5f9', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, width: '20px', textAlign: 'center' }}>{item.cartQty}</span>
                          <button onClick={() => updateCartQty(item.id, 1)} style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: '#f1f5f9', color: '#10b981', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                        </div>
                        
                        <div style={{ width: '70px', textAlign: 'right', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{item.price * item.cartQty}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer (Totals & Checkout) */}
              <div style={{ background: '#f8fafc', padding: '20px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#64748b', fontSize: '0.9rem' }}>
                  <span>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>₹{cart.reduce((sum, i) => sum + (i.price * i.cartQty), 0)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontSize: '0.9rem' }}>
                  <span>CGST/SGST:</span>
                  <span style={{ fontWeight: 600 }}>Included</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '10px 0', borderTop: '2px dashed #cbd5e1' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Grand Total:</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>
                    ₹{cart.reduce((sum, i) => sum + (i.price * i.cartQty), 0)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setCart([])} disabled={cart.length === 0 || isCheckingOut} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.95rem' }}>
                    Clear
                  </button>
                  <button onClick={processBulkCheckout} disabled={cart.length === 0 || isCheckingOut} style={{ flex: 2, padding: '15px', borderRadius: '8px', border: 'none', background: cart.length === 0 ? '#cbd5e1' : '#4f46e5', color: '#fff', fontWeight: 700, cursor: cart.length === 0 ? 'not-allowed' : 'pointer', fontSize: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background 0.3s' }}>
                    {isCheckingOut ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : <><i className="fas fa-receipt"></i> Generate Bill</>}
                  </button>
                </div>
              </div>
              
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 3: USER MANAGEMENT
        ========================================== */}
        {activeTab === 'users' && isAdmin && (
          <div className="pro-table-card">
            <h3 style={{padding: '20px 20px 0 20px', margin: 0, fontSize: '1rem'}}>System Access Control</h3>
            <table className="pro-table" style={{marginTop: '10px'}}>
              <thead><tr><th>User ID</th><th>Username</th><th>Access Level</th><th style={{textAlign: 'right'}}>Role Assignment</th></tr></thead>
              <tbody>
                {usersList.map(user => (
                  <tr key={user.id}>
                    <td style={{color: '#64748b'}}>#{user.id}</td>
                    <td style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '0.8rem', background: user.username === currentUser ? '#10b981' : '#cbd5e1' }}>{user.username.charAt(0).toUpperCase()}</div>
                      {user.username} {user.username === currentUser && <span style={{ fontSize: '0.65rem', color: '#10b981', background: '#dcfce7', padding: '2px 6px', borderRadius: '10px' }}>You</span>}
                    </td>
                    <td><span className={`status-badge status-${user.role}`}>{user.role}</span></td>
                    <td style={{textAlign: 'right'}}>
                      <select className="pro-input" value={user.role} onChange={(e) => handleRoleChange(user.id, e.target.value)} disabled={user.username === currentUser} style={{ width: '150px', padding: '6px 10px', background: user.username === currentUser ? '#f8fafc' : '#ffffff', cursor: user.username === currentUser ? 'not-allowed' : 'pointer' }}>
                        <option value="staff">Staff (View/Sell)</option>
                        <option value="manager">Manager (+Reports)</option>
                        <option value="admin">Admin (Full Access)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ==========================================
            TAB 4: STOCK LEDGER (PASSBOOK)
        ========================================== */}
        {activeTab === 'ledger' && canExport && (
          <div className="pro-table-card" style={{marginTop: '0'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0 20px'}}>
              <h3 style={{margin: 0, fontSize: '1rem'}}>Stock Audit Trail (Passbook)</h3>
              <div style={{fontSize: '0.8rem', color: '#64748b'}}><i className="fas fa-lock" style={{color: '#10b981'}}></i> Highly Secure Transaction Log</div>
            </div>
            
            <table className="pro-table" style={{marginTop: '16px'}}>
              <thead>
                <tr>
                  <th>Date & Time</th><th>Product Name</th><th>SKU</th><th>Transaction Type</th><th>Qty Changed</th><th>Final Balance</th><th>System Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.map(log => (
                  <tr key={log.id}>
                    <td style={{color: '#64748b', fontSize: '0.85rem'}}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{fontWeight: 600, color: '#0f172a'}}>{log.product_name}</td>
                    <td style={{fontFamily: 'monospace', color: '#64748b'}}>{log.sku}</td>
                    <td><span style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#475569', fontWeight: 700, border: '1px solid #e2e8f0' }}>{log.transaction_type}</span></td>
                    <td><span style={{ color: log.quantity_changed > 0 ? '#10b981' : '#ef4444', fontWeight: 800 }}>{log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed}</span></td>
                    <td style={{fontWeight: 800, color: '#0f172a'}}>{log.running_balance}</td>
                    <td style={{color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic'}}>{log.notes}</td>
                  </tr>
                ))}
                {ledgerData.length === 0 && (
                  <tr><td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>No transactions recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;