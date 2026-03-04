/**
 * ============================================================================
 * INV-PRO ENTERPRISE BUSINESS SUITE - v5.0 (ULTIMATE EDITION)
 * ============================================================================
 * WARNING: DO NOT COMPRESS OR MINIFY.
 * * DESCRIPTION: 
 * A high-fidelity, industrial-grade ERP system designed for modern retail.
 * This suite integrates:
 * 1. Master Inventory Management with Pagination & Cloudinary Sync.
 * 2. High-speed POS Terminal with Hardware Barcode integration.
 * 3. B2B Supply Chain: Suppliers & Automated Purchase Orders.
 * 4. Deep-learning Business Intelligence & Analytics.
 * 5. Immutable Audit Passbook (Ledger).
 * 6. Role-Based Access Control (RBAC).
 * ============================================================================
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';

// ============================================================================
// 1. ENTERPRISE CHART & PDF ENGINE CONFIGURATION
// ============================================================================
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

// ============================================================================
// 2. PREMIUM UI COMPONENTS (MODALS & TOASTS)
// ============================================================================

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyle = () => {
    switch(type) {
      case 'success': return { bg: '#10b981', icon: 'fa-check-circle' };
      case 'error': return { bg: '#ef4444', icon: 'fa-exclamation-triangle' };
      case 'warning': return { bg: '#f59e0b', icon: 'fa-engine-warning' };
      default: return { bg: '#3b82f6', icon: 'fa-info-circle' };
    }
  };

  const style = getStyle();

  return (
    <div style={{
      position: 'fixed', bottom: '30px', right: '30px', backgroundColor: style.bg,
      color: '#fff', padding: '18px 30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
      zIndex: 99999, display: 'flex', alignItems: 'center', gap: '15px', fontWeight: 800, 
      fontSize: '1rem', letterSpacing: '0.5px', animation: 'slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <i className={`fas ${style.icon}`} style={{ fontSize: '1.4rem' }}></i>
      {message}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, width = '700px' }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(10px)', 
      zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', 
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: '#fff', width: '100%', maxWidth: width, borderRadius: '24px',
        boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)', overflow: 'hidden', display: 'flex', 
        flexDirection: 'column', maxHeight: '90vh', border: '1px solid #e2e8f0'
      }}>
        <div style={{ 
          padding: '25px 35px', borderBottom: '1px solid #f1f5f9', display: 'flex', 
          justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' 
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: 900, letterSpacing: '-0.5px' }}>{title}</h2>
          <button onClick={onClose} style={{ 
            background: '#e2e8f0', border: 'none', width: '45px', height: '45px', 
            borderRadius: '50%', fontSize: '1.4rem', color: '#475569', cursor: 'pointer', 
            display: 'grid', placeItems: 'center', transition: '0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#cbd5e1'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}>
            &times;
          </button>
        </div>
        <div style={{ padding: '35px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. MASTER APPLICATION ARCHITECTURE
// ============================================================================
function App() {
  const API_BASE = 'https://inv-pro-erp.onrender.com/api';

  // --------------------------------------------------------------------------
  // A. STATE MANAGEMENT (CENTRAL CLUSTER)
  // --------------------------------------------------------------------------
  
  // App Core States
  const [appState, setAppState] = useState({ isLoading: true, isSidebarOpen: true });
  const [toasts, setToasts] = useState([]);
  
  // Primary Database States
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [ledgerData, setLedgerData] = useState([]);
  
  // BI Analytics States
  const [analyticsData, setAnalyticsData] = useState({ 
    topProducts: [], 
    categorySales: [], 
    salesTrend: [] 
  });
  
  // B2B Supply Chain States (NEW & EXPANDED)
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  
  // UI & Navigation States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [posCategory, setPosCategory] = useState('All');
  
  // Pagination State (Restored from old code)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Master Form Data State (Expanded with cost & supplier)
  const [formData, setFormData] = useState({ 
    name: '', sku: '', category: '', quantity: '', price: '', 
    min_threshold: 15, cost_price: '', supplier_id: '', image: null, image_url: '' 
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact_person: '', phone: '', email: '', category: ''
  });
  
  // Authentication & Security Control
  const [auth, setAuth] = useState({ 
    isLoggedIn: false, showSignup: false, loginType: 'admin', 
    username: '', password: '', currentUser: '', userRole: '' 
  });

  // Smart POS States
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const barcodeRef = useRef(null);

  // --------------------------------------------------------------------------
  // B. HELPER UTILITIES
  // --------------------------------------------------------------------------
  
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // --------------------------------------------------------------------------
  // C. DATA SYNCHRONIZATION (API FETCHERS)
  // --------------------------------------------------------------------------

  const fetchInventory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setProducts(res.data);
    } catch (err) { 
      showToast("Critical: Inventory Catalog Desync", "error"); 
    }
  }, []);

  const fetchSalesData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/sales`);
      setSales(res.data);
    } catch (err) { 
      console.error("Sales fetch error", err); 
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/suppliers`);
      setSuppliers(res.data);
    } catch (err) { 
      console.error("Suppliers fetch error", err); 
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/purchase-orders`);
      setPurchaseOrders(res.data);
    } catch (err) { 
      console.error("PO fetch error", err); 
    }
  }, []);

  const fetchAdminModules = useCallback(async () => {
    if (auth.userRole !== 'admin' && auth.userRole !== 'manager') return;
    try {
      if (auth.userRole === 'admin') {
        const u = await axios.get(`${API_BASE}/users`);
        setUsersList(u.data);
      }
      const [l, t, s, c] = await Promise.all([
        axios.get(`${API_BASE}/ledger`),
        axios.get(`${API_BASE}/analytics/top-products`),
        axios.get(`${API_BASE}/analytics/sales-trend`),
        axios.get(`${API_BASE}/analytics/category-sales`)
      ]);
      setLedgerData(l.data);
      setAnalyticsData({ topProducts: t.data, salesTrend: s.data, categorySales: c.data });
    } catch (err) { 
      showToast("Advanced modules synchronization failed.", "warning"); 
    }
  }, [auth.userRole]);

  // --------------------------------------------------------------------------
  // D. LIFECYCLE MANAGEMENT
  // --------------------------------------------------------------------------
  
  useEffect(() => {
    const bootstrapSystem = async () => {
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');
      const user = localStorage.getItem('username');
      
      if (token && user) {
        setAuth(prev => ({ ...prev, isLoggedIn: true, currentUser: user, userRole: role || 'staff' }));
        await fetchInventory();
        await fetchSalesData();
        if(role === 'admin' || role === 'manager') {
            await fetchSuppliers();
            await fetchPurchaseOrders();
            await fetchAdminModules();
        }
      }
      setAppState(prev => ({ ...prev, isLoading: false }));
    };
    bootstrapSystem();
  }, [fetchInventory, fetchSalesData, fetchSuppliers, fetchPurchaseOrders, fetchAdminModules]);

  useEffect(() => {
    if (auth.isLoggedIn) {
      if (activeTab === 'users' && auth.userRole === 'admin') fetchAdminModules();
      if (activeTab === 'ledger' && (auth.userRole === 'admin' || auth.userRole === 'manager')) fetchAdminModules();
      if (activeTab === 'analytics' && (auth.userRole === 'admin' || auth.userRole === 'manager')) fetchAdminModules();
      if (activeTab === 'suppliers') fetchSuppliers();
      if (activeTab === 'orders') fetchPurchaseOrders();
      if (activeTab === 'sales') {
          fetchInventory();
          setTimeout(() => barcodeRef.current?.focus(), 500);
      }
    }
  }, [activeTab, auth.isLoggedIn, auth.userRole, fetchAdminModules, fetchInventory, fetchSuppliers, fetchPurchaseOrders]);

  // --------------------------------------------------------------------------
  // E. AUTHENTICATION ENGINE (STRICT RBAC)
  // --------------------------------------------------------------------------
  
  const handleAuthInput = (e) => {
    setAuthError('');
    setAuth({ ...auth, [e.target.name]: e.target.value });
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAppState(prev => ({ ...prev, isLoading: true }));
    const endpoint = auth.showSignup ? 'register' : 'login';
    const payload = auth.showSignup 
        ? { username: auth.username, password: auth.password, role: 'staff' } 
        : { username: auth.username, password: auth.password };
    
    try {
      const res = await axios.post(`${API_BASE}/${endpoint}`, payload);
      
      if (!auth.showSignup) {
        const actualRole = res.data.role || 'staff';
        if (actualRole !== auth.loginType) {
          showToast(`Security Alert: Role '${actualRole.toUpperCase()}' cannot access ${auth.loginType.toUpperCase()} portal.`, "error");
          setAppState(prev => ({ ...prev, isLoading: false }));
          return;
        }
        
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        localStorage.setItem('role', actualRole);
        
        setAuth(prev => ({ 
            ...prev, isLoggedIn: true, currentUser: res.data.username, 
            userRole: actualRole, password: '' 
        }));
        
        showToast(`Encrypted Session Established for ${res.data.username}`, "success");
        fetchInventory(); fetchSalesData();
        if(actualRole === 'admin' || actualRole === 'manager') {
            fetchSuppliers(); fetchPurchaseOrders(); fetchAdminModules();
        }
      } else {
        showToast("Network Identity Registered. Please Authenticate.", "success");
        setAuth(prev => ({ ...prev, showSignup: false, loginType: 'staff', password: '' }));
      }
    } catch (err) { 
      showToast(err.response?.data?.error || "Authentication Server Unreachable", "error"); 
    } finally { 
      setAppState(prev => ({ ...prev, isLoading: false })); 
    }
  };

  const handleLogout = () => {
    if(window.confirm("WARNING: Are you sure you want to terminate this secure session?")) {
        localStorage.clear(); 
        window.location.reload();
    }
  };

  // --------------------------------------------------------------------------
  // F. INVENTORY MANAGEMENT (CRUD & CLOUDINARY)
  // --------------------------------------------------------------------------
  
  const openAddModal = () => {
    setFormData({ name: '', sku: '', category: '', quantity: '', price: '', min_threshold: 15, cost_price: '', supplier_id: '', image: null, image_url: '' });
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
    if (auth.userRole !== 'admin') return showToast("Authority Denied. Super Admin required.", "error");

    const data = new FormData();
    Object.keys(formData).forEach(k => {
        if (k === 'image' && formData[k] instanceof File) data.append(k, formData[k]);
        else if (k !== 'image') data.append(k, formData[k]);
    });

    try {
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
        if (editingId && editingId !== 'po-view' && editingId !== 'add-supplier') {
            await axios.put(`${API_BASE}/products/${editingId}`, data, config);
            showToast("Entity modified successfully in Cloud Node.", "success");
        } else {
            await axios.post(`${API_BASE}/products`, data, config);
            showToast("New Entity injected into Cloud Registry.", "success");
        }
        setIsModalOpen(false);
        fetchInventory();
        fetchAdminModules();
    } catch (err) { 
        showToast("Mutation failed: " + err.message, "error"); 
    }
  };

  const deleteProduct = async (id) => {
    if (auth.userRole !== 'admin') return showToast("Permission Denied.", "error");
    if(window.confirm("CRITICAL WARNING: Purging this SKU will permanently alter historical audit logs. Proceed?")) {
      try {
        await axios.delete(`${API_BASE}/products/${id}`);
        showToast("Entity purged from global database.", "success");
        fetchInventory();
        fetchAdminModules();
      } catch (err) { showToast("Purge failed.", "error"); }
    }
  };

  // --------------------------------------------------------------------------
  // G. B2B SUPPLY CHAIN LOGIC (NEW)
  // --------------------------------------------------------------------------

  const handleAddSupplier = async (e) => {
      e.preventDefault();
      try {
          await axios.post(`${API_BASE}/suppliers`, supplierForm);
          showToast("Supplier Network Updated", "success");
          setIsModalOpen(false);
          fetchSuppliers();
      } catch(err) { showToast("Failed to add supplier", "error"); }
  };

  const handleReceiveOrder = async (poId) => {
    if(!window.confirm("Verify physical stock receipt against PO before committing to ledger?")) return;
    try {
        await axios.put(`${API_BASE}/purchase-orders/${poId}/receive`);
        showToast("✅ Inventory updated & Audit Ledger synced via PO", "success");
        fetchInventory();
        fetchPurchaseOrders();
        fetchAdminModules();
    } catch (err) { showToast("Stock receipt failed", "error"); }
  };

  const openPOItems = async (poId) => {
    try {
        const res = await axios.get(`${API_BASE}/purchase-orders/${poId}/items`);
        setSelectedPOItems(res.data);
        setEditingId('po-view');
        setIsModalOpen(true);
    } catch (err) { showToast("Failed to retrieve order breakdown", "error"); }
  };

  // --------------------------------------------------------------------------
  // H. SMART POS TERMINAL & CHECKOUT
  // --------------------------------------------------------------------------
  
  const addToCart = (product) => {
    if (product.quantity <= 0) return showToast(`❌ Depletion Error: ${product.name} is out of stock.`, "error");
    setCart(prev => {
        const existing = prev.find(x => x.id === product.id);
        if (existing) {
            if(existing.cartQty >= product.quantity) { 
                showToast(`⚠️ Inventory Limit Reached for ${product.name}`, "warning"); 
                return prev; 
            }
            return prev.map(x => x.id === product.id ? { ...x, cartQty: x.cartQty + 1 } : x);
        }
        return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.cartQty + delta;
        if (newQty > item.quantity) { 
            showToast("⚠️ Cannot exceed available stock limit!", "warning"); 
            return item; 
        }
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
      showToast(`Scanned & Queued: ${found.name}`, "success");
    } else {
      showToast(`❌ Error 404: SKU '${scanned}' not found in registry.`, "error");
    }
    setBarcodeInput('');
  };

  const processCheckout = async () => {
    if(cart.length === 0) return showToast("Terminal queue is empty.", "warning");
    setIsCheckingOut(true);
    try {
        // Bulk Sync to Database
        await Promise.all(cart.map(i => axios.post(`${API_BASE}/sales`, { product_id: i.id, quantity_sold: i.cartQty })));
        
        const total = cart.reduce((a,b) => a + (b.price * b.cartQty), 0);
        
        // Generate High-Fidelity PDF Invoice
        const doc = new jsPDF();
        const invNo = `INV-${Date.now()}-${Math.floor(1000+Math.random()*9000)}`;
        
        // Header
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(24); doc.setTextColor(255, 255, 255);
        doc.text("INV-PRO BUSINESS SUITE", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text("Master Fiscal Invoice", 105, 28, { align: "center" });
        
        // Meta
        doc.setFontSize(10); doc.setTextColor(15, 23, 42);
        doc.text(`Reference: ${invNo}`, 15, 55);
        doc.text(`Cashier Node: ${auth.currentUser.toUpperCase()}`, 140, 55);
        doc.text(`Timestamp: ${new Date().toLocaleString()}`, 140, 62);
        
        // Table
        autoTable(doc, {
            startY: 75,
            head: [['SKU Code', 'Product Entity', 'Qty', 'Unit Rate', 'Subtotal']],
            body: cart.map(i => [i.sku, i.name, i.cartQty, `Rs.${i.price}`, `Rs.${i.price * i.cartQty}`]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 10, cellPadding: 5 }
        });
        
        // Footer
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14); doc.setTextColor(16, 185, 129);
        doc.text(`GRAND TOTAL: Rs. ${total.toLocaleString()}`, 195, finalY, { align: 'right' });
        doc.save(`${invNo}.pdf`);
        
        setCart([]);
        showToast("✅ Transaction Completed. Ledger Synchronized.", "success");
        fetchInventory(); fetchSalesData(); fetchAdminModules(); fetchPurchaseOrders();
    } catch (err) { 
        showToast("❌ System Synchronization Failed.", "error"); 
    } finally { 
        setIsCheckingOut(false); 
    }
  };

  // --------------------------------------------------------------------------
  // I. DATA FILTERING & PAGINATION COMPUTATION
  // --------------------------------------------------------------------------
  
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (posCategory === 'All' || p.category === posCategory)
    );
  }, [products, searchTerm, posCategory]);

  const uniqueCategories = ['All', ...new Set(products.map(p => p.category))];
  
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // ==========================================================================
  // 4. MASTER UI DISPATCHER & RENDERING ENGINE
  // ==========================================================================

  const isAdmin = auth.userRole === 'admin';
  const isManager = auth.userRole === 'manager' || auth.userRole === 'admin';

  // --- BOOTSTRAP LOADER ---
  if (appState.isLoading && !auth.isLoggedIn) {
    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: '#fff' }}>
            <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '3rem', color: '#4f46e5', marginBottom: '20px' }}></i>
            <h2 style={{ letterSpacing: '2px', fontWeight: 900 }}>INITIALIZING CLOUD NODES...</h2>
        </div>
    );
  }

  // --- AUTHENTICATION VIEWPORT ---
  if (!auth.isLoggedIn) {
    return (
      <div className="ent-auth-viewport">
        {/* Left Branding */}
        <div className="ent-auth-branding">
            <div className="branding-container">
                <div className="ent-badge">ENTERPRISE EDITION v5.0</div>
                <h1 className="ent-main-title">INV-PRO <br/><span>Business Suite</span></h1>
                <p className="ent-sub-title">
                    The ultimate architecture for retail supremacy. Engineered with zero-latency POS, B2B supply chain automation, and deep business intelligence.
                </p>
                <div style={{ display: 'flex', gap: '50px', marginTop: '40px' }}>
                    <div style={{ borderLeft: '4px solid #10b981', paddingLeft: '15px' }}><h3 style={{ margin: 0, fontSize: '2.2rem', color: '#10b981', lineHeight: 1 }}>99.9%</h3><p style={{ margin: '5px 0 0', color: '#94a3b8', fontWeight: 700 }}>Node Uptime</p></div>
                    <div style={{ borderLeft: '4px solid #f59e0b', paddingLeft: '15px' }}><h3 style={{ margin: 0, fontSize: '2.2rem', color: '#f59e0b', lineHeight: 1 }}>SHA-512</h3><p style={{ margin: '5px 0 0', color: '#94a3b8', fontWeight: 700 }}>Encrypted Logic</p></div>
                    <div style={{ borderLeft: '4px solid #3b82f6', paddingLeft: '15px' }}><h3 style={{ margin: 0, fontSize: '2.2rem', color: '#3b82f6', lineHeight: 1 }}>REAL-TIME</h3><p style={{ margin: '5px 0 0', color: '#94a3b8', fontWeight: 700 }}>Data Sync</p></div>
                </div>
            </div>
        </div>

        {/* Right Form */}
        <div className="ent-auth-form-side">
            {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
            <div className="ent-login-card">
                {!auth.showSignup && (
                    <div className="ent-portal-tabs">
                        {['admin', 'manager', 'staff'].map(role => (
                            <button key={role} onClick={() => setAuth({...auth, loginType: role})} className={auth.loginType === role ? 'active' : ''}>
                                {role.toUpperCase()} PORTAL
                            </button>
                        ))}
                    </div>
                )}
                
                <div className="ent-card-head">
                    <div className="ent-icon-circle">
                        <i className={`fas ${auth.showSignup ? 'fa-user-plus' : 'fa-fingerprint'}`}></i>
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0' }}>{auth.showSignup ? 'Network Registration' : 'Authenticate Session'}</h2>
                    <p style={{ color: '#64748b', margin: 0, fontWeight: 500 }}>Secure connection required to access {auth.loginType.toUpperCase()} node.</p>
                </div>

                <form onSubmit={handleAuthSubmit} className="ent-master-form">
                    <div className="ent-input-group">
                        <label>NETWORK IDENTITY (USERNAME)</label>
                        <div className="ent-input-wrapper">
                            <i className="fas fa-user-shield"></i>
                            <input required name="username" value={auth.username} onChange={handleAuthInput} placeholder="Enter your assigned ID" />
                        </div>
                    </div>
                    <div className="ent-input-group">
                        <label>SECURITY PASSPHRASE</label>
                        <div className="ent-input-wrapper">
                            <i className="fas fa-key"></i>
                            <input required type="password" name="password" value={auth.password} onChange={handleAuthInput} placeholder="••••••••" />
                        </div>
                    </div>
                    <button type="submit" disabled={appState.isLoading} className={`ent-btn-auth ${auth.loginType}`}>
                        {appState.isLoading ? <><i className="fas fa-circle-notch fa-spin"></i> ESTABLISHING CONNECTION...</> : <><i className="fas fa-lock-open"></i> INITIATE SECURE SESSION</>}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '35px' }}>
                    <button onClick={() => setAuth({...auth, showSignup: !auth.showSignup})} style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: '0.3s' }}>
                        {auth.showSignup ? "← Back to Authentication Gate" : "New Operator? Request Network Access"}
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- CORE ENTERPRISE LAYOUT ---
  return (
    <div className="ent-app-layout">
      {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
      
      {/* --------------------------------------------------------------------- */}
      {/* SIDEBAR NAVIGATION MODULE */}
      {/* --------------------------------------------------------------------- */}
      <div className="ent-sidebar" style={{ width: appState.isSidebarOpen ? '280px' : '85px' }}>
        <div className="ent-logo-section">
            <div className="ent-logo-icon"><i className="fas fa-cube"></i></div>
            {appState.isSidebarOpen && <div className="ent-logo-text">INV-PRO <span>SUITE</span></div>}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            {appState.isSidebarOpen && <div className="ent-nav-label">Core Operations</div>}
            <div className={`ent-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} title="Inventory Hub">
                <i className="fas fa-layer-group"></i> {appState.isSidebarOpen && <span>Inventory Hub</span>}
            </div>
            <div className={`ent-nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')} title="POS Terminal">
                <i className="fas fa-cash-register"></i> {appState.isSidebarOpen && <span>Smart POS</span>}
            </div>

            {isManager && (
                <>
                    {appState.isSidebarOpen && <div className="ent-nav-label" style={{ marginTop: '30px' }}>Supply Chain (B2B)</div>}
                    <div className={`ent-nav-item ${activeTab === 'suppliers' ? 'active' : ''}`} onClick={() => setActiveTab('suppliers')} title="Supplier Network">
                        <i className="fas fa-truck-ramp-box"></i> {appState.isSidebarOpen && <span>Vendor Network</span>}
                    </div>
                    <div className={`ent-nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')} title="Purchase Orders">
                        <i className="fas fa-file-invoice-dollar"></i> {appState.isSidebarOpen && <span>Purchase Orders</span>}
                    </div>
                    
                    {appState.isSidebarOpen && <div className="ent-nav-label" style={{ marginTop: '30px' }}>Intelligence & Audit</div>}
                    <div className={`ent-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} title="Business Analytics">
                        <i className="fas fa-chart-pie"></i> {appState.isSidebarOpen && <span>BI Analytics</span>}
                    </div>
                    <div className={`ent-nav-item ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')} title="Stock Ledger">
                        <i className="fas fa-book-journal-whills"></i> {appState.isSidebarOpen && <span>Audit Ledger</span>}
                    </div>
                </>
            )}

            {isAdmin && (
                <>
                    {appState.isSidebarOpen && <div className="ent-nav-label" style={{ marginTop: '30px' }}>Administration</div>}
                    <div className={`ent-nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} title="Access Control">
                        <i className="fas fa-user-shield"></i> {appState.isSidebarOpen && <span>Access Control</span>}
                    </div>
                </>
            )}
        </div>
        
        <div className="ent-sidebar-footer" onClick={handleLogout} title="Logout">
            <i className="fas fa-power-off"></i> {appState.isSidebarOpen && <span>TERMINATE SESSION</span>}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT */}
      {/* --------------------------------------------------------------------- */}
      <div className="ent-main-content">
        
        <header className="ent-page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button onClick={() => setAppState({...appState, isSidebarOpen: !appState.isSidebarOpen})} style={{ background: '#fff', border: '1px solid #e2e8f0', width: '45px', height: '45px', borderRadius: '12px', fontSize: '1.2rem', color: '#0f172a', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <i className={`fas fa-${appState.isSidebarOpen ? 'angle-left' : 'bars'}`}></i>
                </button>
                <div className="header-info">
                    <h1 style={{ textTransform: 'capitalize' }}>{activeTab.replace('-', ' ')} Module</h1>
                    <p>Status: <span style={{ color: '#10b981', fontWeight: 700 }}>● Active Node</span> | AES-512 Secured</p>
                </div>
            </div>
            
            <div className="header-profile">
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>{auth.currentUser}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: auth.userRole === 'admin' ? '#ef4444' : auth.userRole === 'manager' ? '#3b82f6' : '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{auth.userRole} PRIVILEGE</div>
                </div>
                <div className="avatar">{auth.currentUser.charAt(0).toUpperCase()}</div>
            </div>
        </header>

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 1: INVENTORY DASHBOARD (EXPANDED WITH PAGINATION) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
            <div className="fade-in">
                <div className="ent-kpi-row">
                    <div className="ent-kpi-card">
                        <div className="kpi-icon"><i className="fas fa-cubes"></i></div>
                        <div className="kpi-data"><h3>{products.length}</h3><p>Global SKUs Cataloged</p></div>
                    </div>
                    <div className="ent-kpi-card success">
                        <div className="kpi-icon"><i className="fas fa-vault"></i></div>
                        <div className="kpi-data"><h3>₹{products.reduce((a,b)=>a+(b.price*b.quantity),0).toLocaleString()}</h3><p>Net Asset Valuation</p></div>
                    </div>
                    <div className="ent-kpi-card warning">
                        <div className="kpi-icon"><i className="fas fa-triangle-exclamation"></i></div>
                        <div className="kpi-data"><h3>{products.filter(p=>p.quantity < p.min_threshold).length}</h3><p>Depleting Nodes (Auto-PO Triggered)</p></div>
                    </div>
                </div>

                <div className="ent-table-panel">
                    <div className="panel-header">
                        <div className="panel-search" style={{ width: '450px', display: 'flex', gap: '15px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <i className="fas fa-search" style={{ position: 'absolute', left: '18px', top: '18px', color: '#94a3b8' }}></i>
                                <input placeholder="Query Entity Name or SKU..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} style={{ width: '100%', height: '52px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 20px 0 50px', fontWeight: 600, outline: 'none' }} onFocus={(e)=>e.target.style.borderColor='#4f46e5'} onBlur={(e)=>e.target.style.borderColor='#e2e8f0'} />
                            </div>
                            <select value={posCategory} onChange={(e) => setPosCategory(e.target.value)} style={{ height: '52px', padding: '0 20px', borderRadius: '12px', border: '1.5px solid #e2e8f0', backgroundColor: '#fff', fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {isAdmin && <button className="btn-commit" onClick={openAddModal} style={{ width: 'auto', padding: '0 30px', height: '52px' }}><i className="fas fa-plus" style={{ marginRight: '10px' }}></i> INITIALIZE SKU</button>}
                    </div>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table className="ent-master-table">
                            <thead>
                                <tr>
                                    <th>Entity Identity</th>
                                    <th>SKU Reference</th>
                                    <th>Classification</th>
                                    <th>Volume / Status</th>
                                    <th>Supply Chain Node</th>
                                    <th>Unit Value</th>
                                    {isAdmin && <th style={{ textAlign: 'right' }}>Operations</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {currentProducts.length === 0 ? (
                                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontSize: '1.1rem', fontWeight: 600 }}>No entities found matching query parameters.</td></tr>
                                ) : (
                                    currentProducts.map(p => (
                                        <tr key={p.id}>
                                            <td className="entity-cell">
                                                {p.image_url ? <img src={p.image_url.startsWith('http') ? p.image_url : `${API_BASE.replace('/api','')}${p.image_url}`} alt="Product"/> : <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: '#f1f5f9', display: 'grid', placeItems: 'center', color: '#cbd5e1', border: '2px dashed #e2e8f0' }}><i className="fas fa-image"></i></div>}
                                                <div className="entity-name">{p.name}</div>
                                            </td>
                                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: '#64748b' }}>{p.sku}</td>
                                            <td><span className="ent-tag" style={{ background: '#eff6ff', color: '#2563eb' }}>{p.category}</span></td>
                                            <td>
                                                <span className={`ent-badge ${p.quantity < p.min_threshold ? 'danger' : 'success'}`}>
                                                    {p.quantity} Units {p.quantity < p.min_threshold && <i className="fas fa-exclamation-circle" style={{ marginLeft: '5px' }}></i>}
                                                </span>
                                            </td>
                                            <td><span className="ent-tag" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}><i className="fas fa-truck" style={{ marginRight: '5px' }}></i> {p.supplier_name || 'UNASSIGNED'}</span></td>
                                            <td style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>₹{p.price.toLocaleString()}</td>
                                            {isAdmin && (
                                                <td style={{ textAlign: 'right' }}>
                                                    <button onClick={() => openEditModal(p)} style={{ background: '#eef2ff', color: '#4f46e5', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', marginRight: '10px', transition: '0.2s' }} onMouseOver={(e)=>e.currentTarget.style.background='#c7d2fe'} onMouseOut={(e)=>e.currentTarget.style.background='#eef2ff'}><i className="fas fa-pen"></i></button>
                                                    <button onClick={() => deleteProduct(p.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e)=>e.currentTarget.style.background='#fecaca'} onMouseOut={(e)=>e.currentTarget.style.background='#fef2f2'}><i className="fas fa-trash"></i></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Engine */}
                    <div style={{ padding: '25px 35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
                            Rendering Record {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} Total Nodes
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)} style={{ padding: '10px 20px', border: '1.5px solid #cbd5e1', background: '#fff', borderRadius: '10px', fontWeight: 700, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#0f172a' }}>
                                <i className="fas fa-chevron-left" style={{ marginRight: '8px' }}></i> PREV
                            </button>
                            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p=>p+1)} style={{ padding: '10px 20px', border: '1.5px solid #cbd5e1', background: '#fff', borderRadius: '10px', fontWeight: 700, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : '#0f172a' }}>
                                NEXT <i className="fas fa-chevron-right" style={{ marginLeft: '8px' }}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 2: B2B SUPPLIER NETWORK */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'suppliers' && isManager && (
            <div className="fade-in">
                <div className="ent-table-panel">
                    <div className="panel-header">
                        <div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Vendor Supply Chain Registry</h3>
                            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Manage external logistics partners and outstanding capital.</p>
                        </div>
                        <button className="btn-commit" onClick={()=>{ setEditingId('add-supplier'); setIsModalOpen(true); }} style={{ width: 'auto', padding: '0 30px', height: '52px' }}><i className="fas fa-user-plus" style={{ marginRight: '10px' }}></i> ADD VENDOR</button>
                    </div>
                    <table className="ent-master-table">
                        <thead><tr><th>VENDOR IDENTITY</th><th>CONTACT PROTOCOL</th><th>SECTOR</th><th>OUTSTANDING BALANCE</th><th>ACTIONS</th></tr></thead>
                        <tbody>
                            {suppliers.map(s => (
                                <tr key={s.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: '1.2rem', fontWeight: 900 }}>{s.name.charAt(0)}</div>
                                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{s.name}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 700, color: '#334155' }}><i className="fas fa-user" style={{ color: '#94a3b8', marginRight: '8px' }}></i> {s.contact_person}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '5px' }}><i className="fas fa-phone" style={{ color: '#94a3b8', marginRight: '8px' }}></i> {s.phone}</div>
                                    </td>
                                    <td><span className="ent-tag">{s.category}</span></td>
                                    <td style={{ color: s.balance > 0 ? '#ef4444' : '#10b981', fontWeight: 900, fontSize: '1.1rem' }}>₹{parseFloat(s.balance).toLocaleString()}</td>
                                    <td><button style={{ padding: '8px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#0f172a', transition: '0.2s' }} onMouseOver={(e)=>e.currentTarget.style.background='#e2e8f0'} onMouseOut={(e)=>e.currentTarget.style.background='#f8fafc'}>VIEW PROFILE</button></td>
                                </tr>
                            ))}
                            {suppliers.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: 600 }}>No vendor data found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 3: AUTOMATED PURCHASE ORDERS (PO) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'orders' && isManager && (
            <div className="fade-in">
                <div className="ent-table-panel">
                    <div className="panel-header">
                        <div>
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Automated Purchase Orders</h3>
                            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Drafts generated automatically upon threshold breach.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <span className="ent-badge" style={{ background: '#fef3c7', color: '#b45309' }}>● DRAFT</span>
                            <span className="ent-badge success">● RECEIVED</span>
                        </div>
                    </div>
                    <table className="ent-master-table">
                        <thead><tr><th>ORDER ID (UUID)</th><th>TARGET VENDOR</th><th>CREATION TIMESTAMP</th><th>ESTIMATED CAPITAL</th><th>LIFECYCLE STATUS</th><th>OPERATIONS</th></tr></thead>
                        <tbody>
                            {purchaseOrders.map(po => (
                                <tr key={po.id}>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#4f46e5' }}>#PO-{po.id.toString().padStart(5, '0')}</td>
                                    <td style={{ fontWeight: 800, color: '#0f172a' }}><i className="fas fa-truck" style={{ color: '#94a3b8', marginRight: '8px' }}></i> {po.supplier_name}</td>
                                    <td style={{ color: '#64748b', fontWeight: 600 }}>{new Date(po.created_at).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                    <td style={{ fontWeight: 900, fontSize: '1.1rem' }}>₹{parseFloat(po.total_amount).toLocaleString()}</td>
                                    <td><span className={`ent-badge ${po.status === 'RECEIVED' ? 'success' : 'warning'}`} style={{ padding: '8px 16px' }}>{po.status}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={()=>openPOItems(po.id)} style={{ padding: '8px 15px', background: '#eef2ff', color: '#4f46e5', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}><i className="fas fa-list-ul"></i> ITEMS</button>
                                            {po.status === 'DRAFT' && (
                                                <button onClick={()=>handleReceiveOrder(po.id)} style={{ padding: '8px 15px', background: '#ecfdf5', color: '#10b981', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.2)' }}><i className="fas fa-box-open"></i> RECEIVE STOCK</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {purchaseOrders.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: 600 }}>Zero active purchase orders in pipeline.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 4: SMART POS TERMINAL (HARDWARE ENABLED) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'sales' && (
            <div className="ent-pos-viewport fade-in">
                
                {/* Left: Hardware Scanner & Visual Catalog */}
                <div className="catalog-section">
                    <div className="pos-scanner-box">
                        <div style={{ width: '60px', height: '60px', background: '#eef2ff', borderRadius: '15px', display: 'grid', placeItems: 'center' }}>
                            <i className="fas fa-barcode-read" style={{ fontSize: '2rem', color: '#4f46e5' }}></i>
                        </div>
                        <form onSubmit={handleBarcodeScan} style={{ flex: 1 }}>
                            <input ref={barcodeRef} placeholder="SCANNER LASER ACTIVE. Query SKU to enqueue..." value={barcodeInput} onChange={(e)=>setBarcodeInput(e.target.value)} style={{ width: '100%', height: '60px', border: 'none', outline: 'none', fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', background: 'transparent' }} />
                        </form>
                        <div style={{ textAlign: 'right', color: '#64748b' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px' }}>HARDWARE LINK</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>● ONLINE</div>
                        </div>
                    </div>

                    <div className="product-grid-premium">
                        {products.filter(p=>p.quantity > 0).map(p => (
                            <div key={p.id} className="pos-item-card" onClick={()=>addToCart(p)}>
                                <div className="sku-image-box">
                                    {p.image_url ? <img src={p.image_url.startsWith('http') ? p.image_url : `${API_BASE.replace('/api','')}${p.image_url}`} alt=""/> : <i className="fas fa-box" style={{ fontSize: '3rem', color: '#cbd5e1' }}></i>}
                                </div>
                                <h4 style={{ margin: '0 0 5px', fontSize: '1rem', color: '#0f172a', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                                <div style={{ fontWeight: 900, color: '#10b981', fontSize: '1.3rem', margin: '10px 0' }}>₹{p.price.toLocaleString()}</div>
                                <div style={{ display: 'inline-block', background: p.quantity < 10 ? '#fef2f2' : '#f8fafc', color: p.quantity < 10 ? '#ef4444' : '#64748b', padding: '4px 12px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 800, border: `1px solid ${p.quantity < 10 ? '#fecaca' : '#e2e8f0'}` }}>
                                    Vol: {p.quantity} Available
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Real-time Checkout Cart */}
                <div className="cart-sidebar">
                    <div className="cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '45px', height: '45px', background: '#eef2ff', borderRadius: '12px', color: '#4f46e5', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-shopping-basket"></i></div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 900 }}>Checkout Queue</h3>
                        </div>
                        <span style={{ background: '#4f46e5', color: '#fff', padding: '6px 16px', borderRadius: '50px', fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 4px 10px rgba(79,70,229,0.3)' }}>{cart.length} ITEMS</span>
                    </div>

                    <div className="cart-body">
                        {cart.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', textAlign: 'center', opacity: 0.7 }}>
                                <i className="fas fa-cash-register" style={{ fontSize: '5rem', marginBottom: '25px', color: '#cbd5e1' }}></i>
                                <p style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Terminal State: Idle</p>
                                <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '10px' }}>Scan barcode or select node to enqueue.</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', borderBottom: '1px solid #f1f5f9', animation: 'slideIn 0.3s' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginBottom: '5px' }}>{item.name}</div>
                                        <small style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>₹{item.price.toLocaleString()} / unit</small>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '4px' }}>
                                            <button onClick={()=>updateCartQty(item.id, -1)} style={{ width: '36px', height: '36px', background: '#fff', border: 'none', borderRadius: '8px', color: '#ef4444', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '1.2rem' }}>-</button>
                                            <span style={{ width: '40px', textAlign: 'center', fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>{item.cartQty}</span>
                                            <button onClick={()=>updateCartQty(item.id, 1)} style={{ width: '36px', height: '36px', background: '#fff', border: 'none', borderRadius: '8px', color: '#10b981', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', fontSize: '1.2rem' }}>+</button>
                                        </div>
                                        <div style={{ width: '90px', textAlign: 'right', fontWeight: 900, color: '#0f172a', fontSize: '1.3rem' }}>
                                            ₹{(item.price * item.cartQty).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="cart-footer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#64748b', fontWeight: 700, fontSize: '1rem' }}>
                            <span>CGST/SGST (18%)</span>
                            <span style={{ color: '#0f172a' }}>Inclusive</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 30px' }}>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Net Payable</span>
                            <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10b981' }}>₹{cart.reduce((s,i)=>s+(i.price*i.cartQty),0).toLocaleString()}</span>
                        </div>
                        <button onClick={processCheckout} disabled={isCheckingOut || cart.length === 0} className="btn-finalize">
                            {isCheckingOut ? <><i className="fas fa-circle-notch fa-spin"></i> SYNCHRONIZING LEDGER...</> : <><i className="fas fa-file-invoice"></i> COMMIT TRANSACTION & PRINT</>}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 5: BUSINESS INTELLIGENCE (BI HUB) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'analytics' && isManager && (
            <div className="ent-bi-dashboard fade-in">
                <div className="bi-stats-row">
                    <div className="bi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
                            7-DAY REVENUE YIELD <i className="fas fa-chart-line-up" style={{ color: '#4f46e5', fontSize: '1.2rem' }}></i>
                        </div>
                        <div className="value">₹{analyticsData.salesTrend.reduce((a, b) => a + parseFloat(b.daily_revenue), 0).toLocaleString()}</div>
                        <div className="trend">↑ POSITIVE TRAJECTORY</div>
                    </div>
                    <div className="bi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
                            CATALOG DIVERSIFICATION <i className="fas fa-layer-group" style={{ color: '#8b5cf6', fontSize: '1.2rem' }}></i>
                        </div>
                        <div className="value">{analyticsData.categorySales.length} Active Hubs</div>
                        <div className="trend" style={{ color: '#8b5cf6' }}>MARKET SHARE IS OPTIMAL</div>
                    </div>
                    <div className="bi-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontWeight: 800, fontSize: '0.85rem', letterSpacing: '1px' }}>
                            SUPPLY CHAIN RISK <i className="fas fa-triangle-exclamation" style={{ color: '#ef4444', fontSize: '1.2rem' }}></i>
                        </div>
                        <div className="value">{products.filter(p=>p.quantity < p.min_threshold).length} SKUs Depleted</div>
                        <div className="trend danger">AUTO-PO SYSTEM ENGAGED</div>
                    </div>
                </div>

                <div className="bi-charts-row">
                    <div className="bi-chart-panel main">
                        <div className="chart-title"><i className="fas fa-wave-pulse"></i> Revenue Progression Matrix</div>
                        <div className="chart-container">
                            <Line 
                                data={{
                                    labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
                                    datasets: [{
                                        label: 'Gross Daily Yield (₹)',
                                        data: analyticsData.salesTrend.map(d => d.daily_revenue),
                                        borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true,
                                        tension: 0.45, pointRadius: 6, pointBackgroundColor: '#fff', pointBorderWidth: 3
                                    }]
                                }}
                                options={{ 
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 15, titleFont: { size: 14 } } },
                                    scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bi-chart-panel side">
                        <div className="chart-title" style={{ color: '#8b5cf6' }}><i className="fas fa-chart-pie"></i> Sector Dominance</div>
                        <div className="chart-container">
                            <Doughnut 
                                data={{
                                    labels: analyticsData.categorySales.map(c => c.category),
                                    datasets: [{
                                        data: analyticsData.categorySales.map(c => c.revenue),
                                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                                        borderWidth: 0, hoverOffset: 15
                                    }]
                                }}
                                options={{ 
                                    maintainAspectRatio: false, cutout: '75%',
                                    plugins: { legend: { position: 'bottom', labels: { padding: 25, font: { size: 12, weight: 700 } } } }
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="ent-table-panel" style={{ marginTop: '0' }}>
                    <div className="panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '45px', height: '45px', background: '#fef3c7', borderRadius: '12px', color: '#d97706', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}><i className="fas fa-trophy"></i></div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a', fontWeight: 900 }}>High-Velocity Performance Nodes (Top 5)</h3>
                        </div>
                        <button className="btn-commit" style={{ width: 'auto', padding: '0 25px', height: '45px', background: '#0f172a', fontSize: '0.85rem' }} onClick={()=>window.print()}><i className="fas fa-file-export" style={{ marginRight: '8px' }}></i> EXPORT DATA</button>
                    </div>
                    <table className="ent-master-table">
                        <thead><tr><th style={{ paddingLeft: '35px' }}>RANK</th><th>ENTITY IDENTITY</th><th>CLEARANCE VELOCITY</th><th>CAPITAL YIELD</th></tr></thead>
                        <tbody>
                            {analyticsData.topProducts.map((p, idx) => (
                                <tr key={idx}>
                                    <td style={{ paddingLeft: '35px' }}><div style={{ width: '38px', height: '38px', borderRadius: '50%', background: idx === 0 ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: idx === 0 ? '#d97706' : '#64748b', fontSize: '1.1rem', boxShadow: idx === 0 ? '0 4px 10px rgba(217, 119, 6, 0.2)' : 'none' }}>{idx+1}</div></td>
                                    <td style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.05rem' }}>{p.name}</td>
                                    <td><span className="ent-badge success" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>{p.total_sold} units cleared</span></td>
                                    <td style={{ fontWeight: 900, color: '#10b981', fontSize: '1.2rem' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 6: MASTER AUDIT LEDGER */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'ledger' && isManager && (
            <div className="ent-table-panel fade-in">
                <div className="panel-header" style={{ padding: '30px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}><i className="fas fa-clock-rotate-left" style={{ color: '#4f46e5', marginRight: '12px' }}></i> Immutable Audit Trail</h3>
                        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Every single inventory mutation is logged cryptographically.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#ecfdf5', padding: '10px 20px', borderRadius: '12px', color: '#059669', fontWeight: 800, fontSize: '0.85rem' }}>
                        <i className="fas fa-shield-check" style={{ fontSize: '1.2rem' }}></i> ENCRYPTED SYNC
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="ent-master-table">
                        <thead><tr><th>SERVER TIMESTAMP</th><th>TARGET NODE</th><th>OPERATION SIGNATURE</th><th>DELTA VOLUME</th><th>FINAL BALANCE</th><th>SYSTEM REMARKS</th></tr></thead>
                        <tbody>
                            {ledgerData.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', fontWeight: 600, fontSize: '1.1rem' }}>No audit logs generated yet. Awaiting transactions.</td></tr>
                            ) : (
                                ledgerData.map(log => (
                                    <tr key={log.id}>
                                        <td style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>{new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' })}</td>
                                        <td style={{ fontWeight: 900, color: '#0f172a' }}>{log.product_name}</td>
                                        <td><span className="ent-tag" style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155' }}>{log.transaction_type}</span></td>
                                        <td style={{ fontWeight: 900, fontSize: '1.3rem', color: log.quantity_changed > 0 ? '#10b981' : '#ef4444' }}>{log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}</td>
                                        <td style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>{log.running_balance}</td>
                                        <td style={{ fontStyle: 'italic', color: '#64748b', fontSize: '0.9rem' }}>{log.notes}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* MODULE 7: ROLE BASED ACCESS CONTROL (USERS) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'users' && isAdmin && (
            <div className="ent-table-panel fade-in">
                <div className="panel-header" style={{ padding: '30px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: 0 }}><i className="fas fa-users-gear" style={{ color: '#ef4444', marginRight: '12px' }}></i> Network Access Governance</h3>
                        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>Strict Role-Based Access Control (RBAC) protocol matrix.</p>
                    </div>
                </div>
                <table className="ent-master-table">
                    <thead><tr><th style={{ paddingLeft: '35px' }}>NETWORK ID</th><th>SECURE IDENTITY</th><th>CURRENT PRIVILEGE</th><th>AUTHORITY ASSIGNMENT</th></tr></thead>
                    <tbody>
                        {usersList.map(user => (
                            <tr key={user.id}>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#94a3b8', paddingLeft: '35px' }}>#UID-{user.id.toString().padStart(4, '0')}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{ width: '45px', height: '45px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', border: '2px solid #c7d2fe', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#4f46e5', fontWeight: 900, fontSize: '1.2rem' }}>{user.username.charAt(0).toUpperCase()}</div>
                                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>
                                            {user.username}
                                            {user.username === auth.currentUser && <span className="ent-badge success" style={{ marginLeft: '12px', padding: '4px 10px', fontSize: '0.65rem' }}><i className="fas fa-circle" style={{ fontSize: '0.4rem', marginRight: '4px' }}></i> SELF SESSION</span>}
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`role-badge ${user.role}`}>{user.role.toUpperCase()} LEVEL</span></td>
                                <td>
                                    <select className="ent-select" value={user.role} disabled={user.username === auth.currentUser} onChange={(e)=> {
                                        axios.put(`${API_BASE}/users/${user.id}/role`, { role: e.target.value }).then(()=>{ fetchAdminModules(); showToast("Privilege escalation successful.", "success"); });
                                    }} style={{ width: '250px', background: user.username === auth.currentUser ? '#f8fafc' : '#fff' }}>
                                        <option value="staff">LEVEL 1: Standard POS Access</option>
                                        <option value="manager">LEVEL 2: System Manager Access</option>
                                        <option value="admin">LEVEL 3: Super Administrator</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* GLOBAL MODAL ENGINE */}
      {/* --------------------------------------------------------------------- */}

      {/* 1. Inventory & Supplier Injection Modal */}
      <Modal isOpen={isModalOpen && editingId !== 'po-view'} onClose={()=>setIsModalOpen(false)} title={editingId === 'add-supplier' ? "Register New Vendor" : (editingId ? "Authorize Node Modification" : "Initialize New SKU Node")} width="800px">
        {editingId === 'add-supplier' ? (
            <form onSubmit={handleAddSupplier} className="pro-form">
                <div className="ent-input-group">
                    <label>VENDOR / COMPANY NAME</label>
                    <input className="pro-input" required value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm, name: e.target.value})} placeholder="e.g. Global Electronics Ltd." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div className="ent-input-group">
                        <label>CONTACT REPRESENTATIVE</label>
                        <input className="pro-input" required value={supplierForm.contact_person} onChange={e=>setSupplierForm({...supplierForm, contact_person: e.target.value})} placeholder="Full Name" />
                    </div>
                    <div className="ent-input-group">
                        <label>CONTACT PROTOCOL (PHONE)</label>
                        <input className="pro-input" required value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div className="ent-input-group">
                        <label>ELECTRONIC MAIL</label>
                        <input className="pro-input" type="email" value={supplierForm.email} onChange={e=>setSupplierForm({...supplierForm, email: e.target.value})} placeholder="vendor@domain.com" />
                    </div>
                    <div className="ent-input-group">
                        <label>SECTOR / CATEGORY</label>
                        <input className="pro-input" required value={supplierForm.category} onChange={e=>setSupplierForm({...supplierForm, category: e.target.value})} placeholder="e.g. Peripherals" />
                    </div>
                </div>
                <button type="submit" className="btn-commit" style={{ marginTop: '20px' }}><i className="fas fa-network-wired" style={{ marginRight: '10px' }}></i> INJECT VENDOR TO NETWORK</button>
            </form>
        ) : (
            <form onSubmit={handleInventorySubmit} className="pro-form">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px' }}>
                    <div className="ent-input-group">
                        <label>ENTITY DESIGNATION (NAME)</label>
                        <input className="pro-input" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} placeholder="Full Product Title" />
                    </div>
                    <div className="ent-input-group">
                        <label>SKU IDENTIFIER</label>
                        <input className="pro-input" required value={formData.sku} onChange={e=>setFormData({...formData, sku: e.target.value})} placeholder="Unique Barcode/ID" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px' }}>
                    <div className="ent-input-group">
                        <label>MARKET SEGMENT</label>
                        <input className="pro-input" required value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} placeholder="Category Name" />
                    </div>
                    <div className="ent-input-group">
                        <label>INITIAL VOLUME</label>
                        <input className="pro-input" required type="number" value={formData.quantity} onChange={e=>setFormData({...formData, quantity: e.target.value})} placeholder="0" />
                    </div>
                    <div className="ent-input-group">
                        <label>RETAIL YIELD (₹)</label>
                        <input className="pro-input" required type="number" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} placeholder="0.00" />
                    </div>
                </div>
                
                {/* Supply Chain Integration Segment */}
                <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                    <h4 style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#475569', fontWeight: 900, letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fas fa-link" style={{ color: '#4f46e5' }}></i> SUPPLY CHAIN INTEGRATION</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                        <div className="ent-input-group">
                            <label>B2B SOURCING COST (₹)</label>
                            <input className="pro-input" required type="number" value={formData.cost_price} onChange={e=>setFormData({...formData, cost_price: e.target.value})} placeholder="Wholesale Cost" style={{ background: '#fff' }} />
                        </div>
                        <div className="ent-input-group">
                            <label>AUTO-PO THRESHOLD</label>
                            <input className="pro-input" required type="number" value={formData.min_threshold} onChange={e=>setFormData({...formData, min_threshold: e.target.value})} placeholder="Minimum Stock Limit" style={{ background: '#fff' }} />
                        </div>
                    </div>
                    <div className="ent-input-group" style={{ marginTop: '25px' }}>
                        <label>ASSIGNED VENDOR NODE</label>
                        <select className="ent-select" required value={formData.supplier_id} onChange={e=>setFormData({...formData, supplier_id: e.target.value})} style={{ width: '100%', background: '#fff' }}>
                            <option value="">-- UNLINKED (Select Vendor to Enable Auto-PO) --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                        </select>
                    </div>
                </div>

                <div className="ent-input-group" style={{ marginTop: '20px' }}>
                    <label>VISUAL ASSET UPLOAD</label>
                    <div style={{ border: '2px dashed #cbd5e1', padding: '40px', borderRadius: '16px', textAlign: 'center', backgroundColor: '#f8fafc', transition: '0.3s', cursor: 'pointer' }} onMouseOver={(e)=>e.currentTarget.style.borderColor='#4f46e5'} onMouseOut={(e)=>e.currentTarget.style.borderColor='#cbd5e1'}>
                        <input type="file" id="fileUpload" onChange={e => setFormData({...formData, image: e.target.files[0]})} style={{ display: 'none' }} />
                        <label htmlFor="fileUpload" style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>
                            <div style={{ width: '60px', height: '60px', background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}><i className="fas fa-cloud-arrow-up" style={{ fontSize: '1.5rem' }}></i></div>
                            {formData.image ? formData.image.name : "Inject Image to Cloudinary Array"}
                        </label>
                    </div>
                </div>

                <button type="submit" className="btn-commit" style={{ marginTop: '25px', height: '60px', fontSize: '1.1rem' }}>{editingId ? <><i className="fas fa-satellite-dish"></i> AUTHORIZE CLOUD UPDATE</> : <><i className="fas fa-rocket"></i> INITIALIZE NEW REGISTRY</>}</button>
            </form>
        )}
      </Modal>

      {/* 2. PO Item Breakdown Modal */}
      <Modal isOpen={isModalOpen && editingId === 'po-view'} onClose={()=>setIsModalOpen(false)} title="Purchase Order Breakdown Log" width="800px">
        <table className="ent-master-table" style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
            <thead style={{ background: '#f8fafc' }}><tr><th style={{ paddingLeft: '25px' }}>TARGET SKU</th><th>ENTITY</th><th>REQUESTED VOL</th><th>B2B RATE</th><th>SUBTOTAL</th></tr></thead>
            <tbody>
                {selectedPOItems.map((item, idx) => (
                    <tr key={idx}>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: '#64748b', paddingLeft: '25px' }}>{item.sku}</td>
                        <td style={{ fontWeight: 900, color: '#0f172a' }}>{item.product_name}</td>
                        <td><span className="ent-badge warning" style={{ fontSize: '0.85rem' }}>{item.quantity_ordered} Units</span></td>
                        <td style={{ fontWeight: 700 }}>₹{item.unit_cost}</td>
                        <td style={{ fontWeight: 900, color: '#10b981', fontSize: '1.1rem' }}>₹{(item.quantity_ordered * item.unit_cost).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div style={{ padding: '25px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Estimated Capital Required</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>₹{selectedPOItems.reduce((a,b)=>a+(b.quantity_ordered*b.unit_cost),0).toLocaleString()}</span>
        </div>
      </Modal>

    </div>
  );
}

export default App;