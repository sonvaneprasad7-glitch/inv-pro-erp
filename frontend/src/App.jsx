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
  // 1. ALL STATES (No Shortcuts)
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
  
  const [saleForm, setSaleForm] = useState({ 
    product_id: '', 
    quantity_sold: '' 
  }); 
  
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [currentUser, setCurrentUser] = useState('');
  const [userRole, setUserRole] = useState('staff'); 
  
  // NAYA STATE: VIP role selection tabs ke liye
  const [loginType, setLoginType] = useState('admin');

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
  // 3. AUTHENTICATION LOGIC (🔥 STRICT PORTAL CHECK)
  // ==========================================
  const handleAuthChange = (e) => {
    setAuthData({ ...authData, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = showSignup ? 'register' : 'login';
    
    // Naya user hamesha 'staff' banega
    const payload = showSignup ? { ...authData, role: 'staff' } : authData;
    
    axios.post(`https://inv-pro-erp.onrender.com/api/${endpoint}`, payload)
      .then(res => {
        if (!showSignup) {
          // Backend se pata lagao user ki asli aukaat (role) kya hai
          const actualRole = res.data.role || 'staff';
          
          // 🔥 STRICT DOOR CHECK LOGIC 🔥
          // Agar user ka asli role, uske select kiye hue tab se match nahi karta...
          if (actualRole !== loginType) {
            // Toh usko error do aur andar mat aane do!
            alert(`🛑 Access Denied! Aapka account '${actualRole}' ka hai, par aap '${loginType}' portal se login karne ki koshish kar rahe hain. Kripya sahi tab chunein.`);
            return; // Code yahin ruk jayega, aage nahi badhega!
          }

          // Agar darwaza (tab) aur role dono match kar gaye, tabhi login hone do
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
          alert("Account Created! You have been registered as 'Staff' for security reasons. Please login from the Staff tab."); 
          setShowSignup(false); 
          setLoginType('staff'); // Signup ke baad automatically Staff tab select kar do
        }
      })
      .catch(err => {
        const errorMessage = err.response?.data?.error || "Authentication failed. Check details.";
        alert(`Error: ${errorMessage}`);
      });
  };
  // ==========================================
  // 4. INVENTORY CRUD LOGIC 
  // ==========================================
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (userRole !== 'admin') {
      return alert("Permission Denied: You do not have access to perform this action.");
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('sku', formData.sku);
    data.append('category', formData.category);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);

    if (formData.image instanceof File) {
      data.append('image', formData.image);
    } else {
      data.append('image_url', formData.image_url || '');
    }

    const config = { headers: { 'Content-Type': 'multipart/form-data' } };

    if (editingId) {
      axios.put(`https://inv-pro-erp.onrender.com/api/products/${editingId}`, data, config)
        .then(() => { 
          fetchProducts(); 
          if(userRole === 'admin' || userRole === 'manager') fetchLedger();
          resetForm(); 
        });
    } else {
      axios.post('https://inv-pro-erp.onrender.com/api/products', data, config)
        .then(() => { 
          fetchProducts(); 
          if(userRole === 'admin' || userRole === 'manager') fetchLedger();
          resetForm(); 
        });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', image: null, image_url: '' });
    setEditingId(null);
    if(document.getElementById("imageInput")) document.getElementById("imageInput").value = "";
  };

  const handleDelete = (id) => {
    if (userRole !== 'admin') return alert("Permission Denied!");
    if(window.confirm("Are you sure you want to permanently delete this item?")) {
      axios.delete(`https://inv-pro-erp.onrender.com/api/products/${id}`)
        .then(() => fetchProducts());
    }
  };

  // ==========================================
  // 5. INVOICE GENERATOR FUNCTION
  // ==========================================
  const generateInvoice = (saleId, productName, qty, unitPrice, totalAmount) => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text("INV-PRO BILLING", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Tax Invoice / Cash Receipt", 105, 28, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 35, 195, 35);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Invoice No: #INV-${saleId.toString().padStart(4, '0')}`, 15, 45);
    doc.text(`Date & Time: ${new Date().toLocaleString()}`, 15, 52);
    doc.text(`Billed To: Walk-in Customer`, 15, 59);

    autoTable(doc, {
      startY: 65,
      head: [['Description', 'Quantity', 'Unit Price (Rs)', 'Total (Rs)']],
      body: [[productName, qty, unitPrice, totalAmount]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const finalY = doc.lastAutoTable.finalY || 80;
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text(`Grand Total: Rs. ${totalAmount}`, 140, finalY + 15);

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for your business!", 105, finalY + 35, { align: "center" });

    doc.save(`Invoice_INV-${saleId.toString().padStart(4, '0')}.pdf`);
  };

  // ==========================================
  // 6. SALES LOGIC
  // ==========================================
  const handleSaleSubmit = (e) => {
    e.preventDefault();
    const selectedProduct = products.find(p => p.id === parseInt(saleForm.product_id));

    axios.post('https://inv-pro-erp.onrender.com/api/sales', saleForm)
      .then(res => {
        alert("🎉 Item Sold Successfully! Generating Bill...");
        const newSale = res.data.sale;
        generateInvoice(newSale.id, selectedProduct.name, saleForm.quantity_sold, selectedProduct.price, newSale.total_price);

        fetchProducts(); 
        fetchSales(); 
        if(userRole === 'admin' || userRole === 'manager') fetchLedger();
        setSaleForm({ product_id: '', quantity_sold: '' });
      })
      .catch(err => {
        alert(err.response?.data?.error || "Error processing sale!");
      });
  };

  // ==========================================
  // 7. ROLE MANAGEMENT LOGIC
  // ==========================================
  const handleRoleChange = (userId, newRole) => {
    axios.put(`https://inv-pro-erp.onrender.com/api/users/${userId}/role`, { role: newRole })
      .then(() => { alert("User Role Updated Successfully!"); fetchUsersList(); })
      .catch(() => alert("Error updating role"));
  };

  // ==========================================
  // 8. EXPORT TO PDF
  // ==========================================
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

  // ==========================================
  // 9. RBAC PERMISSIONS VARIABLES
  // ==========================================
  const isAdmin = userRole === 'admin';
  const canEdit = userRole === 'admin';
  const canExport = userRole === 'admin' || userRole === 'manager';

  // ==========================================
  // 10. ANALYTICS DATA CALCULATION
  // ==========================================
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
  // RENDER: VIP AUTHENTICATION SCREEN
  // ==========================================
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}>
        <div className="glass-card" style={{ width: '400px', textAlign: 'center', padding: '40px' }}>
          
          {/* VIP ROLE SELECTION TABS */}
          {!showSignup && (
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px', marginBottom: '25px' }}>
              <button 
                type="button"
                onClick={() => setLoginType('admin')} 
                style={{ flex: 1, padding: '8px', border: 'none', background: loginType === 'admin' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'admin' ? 700 : 500, color: loginType === 'admin' ? '#4f46e5' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'admin' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.3s' }}>
                Admin
              </button>
              <button 
                type="button"
                onClick={() => setLoginType('manager')} 
                style={{ flex: 1, padding: '8px', border: 'none', background: loginType === 'manager' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'manager' ? 700 : 500, color: loginType === 'manager' ? '#10b981' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'manager' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.3s' }}>
                Manager
              </button>
              <button 
                type="button"
                onClick={() => setLoginType('staff')} 
                style={{ flex: 1, padding: '8px', border: 'none', background: loginType === 'staff' ? '#ffffff' : 'transparent', borderRadius: '6px', fontWeight: loginType === 'staff' ? 700 : 500, color: loginType === 'staff' ? '#f59e0b' : '#64748b', cursor: 'pointer', boxShadow: loginType === 'staff' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.3s' }}>
                Staff
              </button>
            </div>
          )}

          {/* DYNAMIC ICONS & COLORS */}
          <div style={{ 
            background: showSignup ? '#e0e7ff' : (loginType === 'admin' ? '#e0e7ff' : loginType === 'manager' ? '#dcfce7' : '#fef3c7'), 
            width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', transition: 'all 0.3s' 
          }}>
            <i className={`fas ${showSignup ? 'fa-user-plus' : (loginType === 'admin' ? 'fa-user-shield' : loginType === 'manager' ? 'fa-user-tie' : 'fa-user')}`} 
               style={{
                 color: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b'), 
                 fontSize:'24px'
               }}>
            </i>
          </div>
          
          <h2 style={{margin:'0 0 5px', color:'#0f172a'}}>
            {showSignup ? "Create New Account" : 
             loginType === 'admin' ? "Admin Portal" : 
             loginType === 'manager' ? "Manager Access" : "Staff Login"}
          </h2>
          <p style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '25px'}}>
            {showSignup ? "Register to join the system" : `Please enter your ${loginType} credentials`}
          </p>
          
          <form onSubmit={handleAuthSubmit} className="pro-form">
            <input className="pro-input" name="username" placeholder={`${loginType.charAt(0).toUpperCase() + loginType.slice(1)} Username`} onChange={handleAuthChange} required />
            <input className="pro-input" name="password" type="password" placeholder="Password" onChange={handleAuthChange} required />
            <button type="submit" className="btn-primary-pro" style={{
              marginTop:'10px',
              background: showSignup ? '#4f46e5' : (loginType === 'admin' ? '#4f46e5' : loginType === 'manager' ? '#10b981' : '#f59e0b'),
              transition: 'background 0.3s'
            }}>
              {showSignup ? "Create Account" : `Login as ${loginType.charAt(0).toUpperCase() + loginType.slice(1)}`} <i className="fas fa-arrow-right"></i>
            </button>
          </form>
          
          <button type="button" onClick={() => setShowSignup(!showSignup)} style={{ marginTop: '25px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            {showSignup ? "Back to Login Portal" : "New User? Request an account"}
          </button>
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
          
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <i className="fas fa-chart-pie"></i> Dashboard
          </div>
          
          <div className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
            <i className="fas fa-store"></i> Point of Sale
          </div>
        </div>

        <div style={{marginBottom: '25px'}}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '8px', marginLeft: '10px' }}>
            Administration
          </div>
          
          {isAdmin && (
            <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
              <i className="fas fa-users-cog"></i> Manage Users
            </div>
          )}

          {canExport && (
            <div className={`nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>
              <i className="fas fa-book"></i> Stock Ledger
            </div>
          )}
          
          {canExport && (
            <div className="nav-item" onClick={exportToPDF}>
              <i className="fas fa-file-pdf"></i> Export PDF
            </div>
          )}
        </div>

        <div className="nav-item" style={{marginTop: 'auto', color: '#ef4444'}} onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout System
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="content-area">
        
        {/* HEADER */}
        <div className="header-pro">
          <h1>
            {activeTab === 'dashboard' ? 'Business Intelligence' : 
             activeTab === 'sales' ? 'Sales Management' : 
             activeTab === 'users' ? 'System Users' : 'Audit Trail (Ledger)'}
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
                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{userRole} Account</div>
              </div>
              <div className="avatar">{currentUser.charAt(0).toUpperCase()}</div>
            </div>
          </div>
        </div>

        {/* STATS GRID */}
        {(activeTab === 'dashboard' || activeTab === 'sales') && (
          <div className="stats-grid">
            <div className="stat-card-pro">
              <h3>Total Products</h3><p>{products.length}</p>
            </div>
            <div className="stat-card-pro green-line">
              <h3>Total Stock Value</h3><p>₹{products.reduce((t,i) => t + (i.price * i.quantity), 0).toLocaleString()}</p>
            </div>
            <div className="stat-card-pro purple-line">
              <h3>Total Revenue</h3><p>₹{sales.reduce((t,s) => t + parseFloat(s.total_price), 0).toLocaleString()}</p>
            </div>
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
            TAB 2: SALES VIEW
        ========================================== */}
        {activeTab === 'sales' && (
          <div style={{display: 'flex', gap: '20px', flexDirection: 'column'}}>
            <div className="glass-card" style={{maxWidth: '500px'}}>
              <h3 style={{margin: '0 0 16px 0', fontSize: '1rem', color: '#0f172a'}}><i className="fas fa-shopping-basket" style={{color: '#4f46e5', marginRight: '8px'}}></i> Process New Sale & Bill</h3>
              <form className="pro-form" onSubmit={handleSaleSubmit}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569'}}>Select Item</label>
                  <select className="pro-input" value={saleForm.product_id} onChange={(e) => setSaleForm({...saleForm, product_id: e.target.value})} required>
                    <option value="">-- Choose from Available Stock --</option>
                    {products.filter(p => p.quantity > 0).map(p => (<option key={p.id} value={p.id}>{p.name} (Avail: {p.quantity} | ₹{p.price})</option>))}
                  </select>
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <label style={{fontSize: '0.8rem', fontWeight: 600, color: '#475569'}}>Qty Sold</label>
                  <input className="pro-input" type="number" value={saleForm.quantity_sold} onChange={(e) => setSaleForm({...saleForm, quantity_sold: e.target.value})} min="1" required />
                </div>
                <button className="btn-primary-pro" style={{backgroundColor: '#10b981', marginTop: '8px', padding: '10px'}}>
                  <i className="fas fa-file-invoice-dollar"></i> Complete Sale & Print Bill
                </button>
              </form>
            </div>
            
            <div className="pro-table-card">
              <h3 style={{padding: '20px 20px 0 20px', margin: 0, fontSize: '1rem'}}>Recent Transactions</h3>
              <table className="pro-table" style={{marginTop: '10px'}}>
                <thead><tr><th>Invoice ID</th><th>Product Name</th><th>Qty Sold</th><th>Total Revenue</th><th>Timestamp</th></tr></thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id}>
                      <td style={{fontFamily: 'monospace', color: '#64748b'}}>#INV-{s.id.toString().padStart(4, '0')}</td>
                      <td style={{fontWeight: 600, color: '#0f172a'}}>{s.name}</td>
                      <td><span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>{s.quantity_sold} Units</span></td>
                      <td style={{fontWeight: 800, color: '#10b981'}}>₹{s.total_price}</td>
                      <td style={{color: '#64748b', fontSize: '0.8rem'}}>{new Date(s.sale_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <th>Date & Time</th>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Transaction Type</th>
                  <th>Qty Changed</th>
                  <th>Final Balance</th>
                  <th>System Notes</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.map(log => (
                  <tr key={log.id}>
                    <td style={{color: '#64748b', fontSize: '0.85rem'}}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{fontWeight: 600, color: '#0f172a'}}>{log.product_name}</td>
                    <td style={{fontFamily: 'monospace', color: '#64748b'}}>{log.sku}</td>
                    <td>
                      <span style={{
                        background: '#f8fafc', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        color: '#475569', 
                        fontWeight: 700,
                        border: '1px solid #e2e8f0'
                      }}>
                        {log.transaction_type}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        color: log.quantity_changed > 0 ? '#10b981' : '#ef4444',
                        fontWeight: 800
                      }}>
                        {log.quantity_changed > 0 ? '+' : ''}{log.quantity_changed}
                      </span>
                    </td>
                    <td style={{fontWeight: 800, color: '#0f172a'}}>{log.running_balance}</td>
                    <td style={{color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic'}}>{log.notes}</td>
                  </tr>
                ))}
                {ledgerData.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#64748b'}}>
                      No transactions recorded yet. Add a product or make a sale!
                    </td>
                  </tr>
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