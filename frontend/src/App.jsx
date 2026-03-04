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
// 2. PREMIUM UI COMPONENTS (MODALS & TOASTS) - RESTORED
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
      case 'warning': return { bg: '#f59e0b', icon: 'fa-triangle-exclamation' };
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
// 3. MAIN APPLICATION COMPONENT
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
  
  // 🔥 B2B Supply Chain States (NEW) 🔥
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPOItems, setSelectedPOItems] = useState([]);
  
  // UI & Navigation States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [posCategory, setPosCategory] = useState('All');
  
  // Pagination State (Restored)
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

  const fetchInventoryData = useCallback(async () => {
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

  const fetchAdminData = useCallback(async () => {
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
        await fetchInventoryData();
        await fetchSalesData();
        if(role === 'admin' || role === 'manager') {
            await fetchSuppliers();
            await fetchPurchaseOrders();
            await fetchAdminData();
        }
      }
      setAppState(prev => ({ ...prev, isLoading: false }));
    };
    bootstrapSystem();
  }, [fetchInventoryData, fetchSalesData, fetchSuppliers, fetchPurchaseOrders, fetchAdminData]);

  useEffect(() => {
    if (auth.isLoggedIn) {
      if (activeTab === 'users' && auth.userRole === 'admin') fetchAdminData();
      if (activeTab === 'ledger' && (auth.userRole === 'admin' || auth.userRole === 'manager')) fetchAdminData();
      if (activeTab === 'analytics' && (auth.userRole === 'admin' || auth.userRole === 'manager')) fetchAdminData();
      if (activeTab === 'suppliers') fetchSuppliers();
      if (activeTab === 'orders') fetchPurchaseOrders();
      if (activeTab === 'sales') {
          fetchInventoryData();
          setTimeout(() => barcodeRef.current?.focus(), 500);
      }
    }
  }, [activeTab, auth.isLoggedIn, auth.userRole, fetchAdminData, fetchInventoryData, fetchSuppliers, fetchPurchaseOrders]);

  // --------------------------------------------------------------------------
  // E. AUTHENTICATION ENGINE (STRICT RBAC)
  // --------------------------------------------------------------------------
  
  const handleAuthInput = (e) => {
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
          showToast(`Profile ${actualRole.toUpperCase()} mismatched with ${auth.loginType.toUpperCase()} portal!`, "error");
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
        
        showToast(`Welcome back, ${res.data.username}!`, "success");
        fetchInventoryData(); fetchSalesData();
        if(actualRole === 'admin' || actualRole === 'manager') {
            fetchSuppliers(); fetchPurchaseOrders(); fetchAdminData();
        }
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
    if (auth.userRole !== 'admin') return showToast("Admin privileges required.", "error");

    const data = new FormData();
    Object.keys(formData).forEach(k => {
        if (k === 'image' && formData[k] instanceof File) data.append(k, formData[k]);
        else if (k !== 'image') data.append(k, formData[k]);
    });

    try {
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
        if (editingId && editingId !== 'po-view' && editingId !== 'add-supplier') {
            await axios.put(`${API_BASE}/products/${editingId}`, data, config);
            showToast("Entity updated successfully", "success");
        } else {
            await axios.post(`${API_BASE}/products`, data, config);
            showToast("New entity registered", "success");
        }
        setIsModalOpen(false);
        fetchInventoryData();
        fetchAdminData();
    } catch (err) { 
        showToast("Mutation failed: " + err.message, "error"); 
    }
  };

  const deleteProduct = async (id) => {
    if (auth.userRole !== 'admin') return showToast("Permission Denied", "error");
    if(window.confirm("WARNING: Purging this SKU will alter audit logs. Proceed?")) {
      try {
        await axios.delete(`${API_BASE}/products/${id}`);
        showToast("Entity purged from database.", "info");
        fetchInventoryData();
        fetchAdminData();
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
    if(!window.confirm("Verify physical stock receipt before commit?")) return;
    try {
        await axios.put(`${API_BASE}/purchase-orders/${poId}/receive`);
        showToast("Inventory updated via B2B Order", "success");
        fetchInventoryData();
        fetchPurchaseOrders();
        fetchAdminData();
    } catch (err) { showToast("Receipt failed", "error"); }
  };

  const openPOItems = async (poId) => {
    try {
        const res = await axios.get(`${API_BASE}/purchase-orders/${poId}/items`);
        setSelectedPOItems(res.data);
        setEditingId('po-view');
        setIsModalOpen(true);
    } catch (err) { showToast("Failed to fetch order items", "error"); }
  };

  // --------------------------------------------------------------------------
  // H. SMART POS TERMINAL & CHECKOUT
  // --------------------------------------------------------------------------
  
  const addToCart = (product) => {
    if (product.quantity <= 0) return showToast(`${product.name} is Out of Stock!`, "warning");
    setCart(prev => {
        const existing = prev.find(x => x.id === product.id);
        if (existing) {
            if(existing.cartQty >= product.quantity) { 
                showToast(`Max stock reached for ${product.name}`, "warning"); 
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
            showToast("Stock Limit!", "warning"); 
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
      showToast(`Scanned: ${found.name}`, "success");
    } else {
      showToast("SKU not recognized", "error");
    }
    setBarcodeInput('');
  };

  const checkout = async () => {
    if(cart.length === 0) return;
    setIsCheckingOut(true);
    try {
        // Bulk Sync to Database
        await Promise.all(cart.map(i => axios.post(`${API_BASE}/sales`, { product_id: i.id, quantity_sold: i.cartQty })));
        
        const total = cart.reduce((a,b) => a + (b.price * b.cartQty), 0);
        
        // Generate High-Fidelity PDF Invoice
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
            body: cart.map(i => [i.sku, i.name, i.cartQty, `Rs.${i.price}`, `Rs.${i.price * i.cartQty}`]),
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] }
        });
        
        doc.setFontSize(14); doc.setTextColor(16, 185, 129);
        doc.text(`GRAND TOTAL: Rs. ${total.toLocaleString()}`, 195, doc.lastAutoTable.finalY + 20, { align: 'right' });
        doc.save(`Invoice_INV-${invNo}.pdf`);
        
        setCart([]);
        showToast("Transaction Complete & Invoice Generated", "success");
        fetchInventoryData(); fetchSalesData(); fetchAdminData(); fetchPurchaseOrders();
    } catch (err) { 
        showToast("Sync Error during checkout", "error"); 
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
      <div style={{ display: 'flex', height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
        {/* Left Branding Panel */}
        <div style={{ flex: 1.2, background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(0,0,0,0) 70%)', top: '-10%', left: '-10%' }}></div>
          <div style={{ zIndex: 10 }}>
            <span style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '30px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '2px', marginBottom: '25px', color: '#818cf8' }}>
              <i className="fas fa-shield-check"></i> MILITARY-GRADE SECURITY
            </span>
            <h1 style={{ fontSize: '5rem', fontWeight: 900, lineHeight: 1, margin: '0 0 20px 0' }}>INV-PRO <br/><span style={{ color: '#4f46e5' }}>Suite 5.0</span></h1>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '500px', lineHeight: 1.6 }}>The world's most advanced Cloud POS, Supply Chain, and Inventory Management architecture.</p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', position: 'relative' }}>
          {toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}
          
          <div style={{ width: '100%', maxWidth: '480px', padding: '50px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h2 style={{ fontSize: '2rem', color: '#0f172a', fontWeight: 800, margin: '0 0 10px 0' }}>{auth.showSignup ? 'Create Account' : 'Portal Access'}</h2>
              <p style={{ color: '#64748b', margin: 0 }}>Please provide your credentials below.</p>
            </div>

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

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>Username Identity</label>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-user" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
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

  // --- CORE ENTERPRISE LAYOUT ---
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: '#f1f5f9', fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      
      {/* GLOBAL TOAST RENDERER */}
      <div style={{ position: 'fixed', zIndex: 99999 }}>{toasts.map(t => <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />)}</div>

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
              {appState.isSidebarOpen && <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', paddingLeft: '10px', marginTop: '20px' }}>Supply Chain (B2B)</div>}
              <button onClick={() => setActiveTab('suppliers')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'suppliers' ? 'rgba(139,92,246,0.15)' : 'transparent', color: activeTab === 'suppliers' ? '#a78bfa' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
                <i className="fas fa-truck-ramp-box" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Supplier Network"}
              </button>
              <button onClick={() => setActiveTab('orders')} style={{ display: 'flex', alignItems: 'center', padding: '15px', background: activeTab === 'orders' ? 'rgba(236,72,153,0.15)' : 'transparent', color: activeTab === 'orders' ? '#f472b6' : '#94a3b8', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, transition: '0.2s', justifyContent: appState.isSidebarOpen ? 'flex-start' : 'center' }}>
                <i className="fas fa-file-invoice-dollar" style={{ fontSize: '1.2rem', width: appState.isSidebarOpen ? '30px' : 'auto' }}></i> {appState.isSidebarOpen && "Purchase Orders"}
              </button>

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
          {/* TAB 1: INVENTORY DASHBOARD (PAGINATION RESTORED) */}
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
                  <h3 style={{ margin: '10px 0 0', fontSize: '2rem', color: '#0f172a' }}>{products.filter(p => p.quantity < p.min_threshold).length}</h3>
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
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Supplier Link</th>
                      <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Valuation</th>
                      {isAdmin && <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentProducts.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No entities match current parameters.</td></tr>
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
                          <td style={{ padding: '15px 20px' }}><span style={{ backgroundColor: p.quantity < p.min_threshold ? '#fee2e2' : '#dcfce7', color: p.quantity < p.min_threshold ? '#ef4444' : '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{p.quantity} Units</span></td>
                          <td style={{ padding: '15px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{p.supplier_name || 'UNASSIGNED'}</td>
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
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
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
          {/* TAB 3: SUPPLIER NETWORK (NEW B2B MODULE) */}
          {/* =================================================== */}
          {activeTab === 'suppliers' && isManager && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}><i className="fas fa-truck-ramp-box" style={{ color: '#8b5cf6', marginRight: '10px' }}></i> Active Vendor Sourcing Network</h3>
                        <button onClick={()=>{setEditingId('add-supplier'); setIsModalOpen(true)}} style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '12px 25px', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
                            <i className="fas fa-user-plus"></i> Add Vendor
                        </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Vendor Identity</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Contact Protocol</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Sector</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Outstanding Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px', fontWeight: 800, color: '#0f172a' }}>{s.name}</td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ fontWeight: 600 }}>{s.contact_person}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}><i className="fas fa-phone"></i> {s.phone}</div>
                                    </td>
                                    <td style={{ padding: '20px' }}><span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>{s.category}</span></td>
                                    <td style={{ padding: '20px', fontWeight: 900, color: s.balance > 0 ? '#ef4444' : '#10b981', fontSize: '1.1rem' }}>₹{parseFloat(s.balance).toLocaleString()}</td>
                                </tr>
                            ))}
                            {suppliers.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: 600 }}>No vendors registered.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 4: AUTOMATED PURCHASE ORDERS (NEW) */}
          {/* =================================================== */}
          {activeTab === 'orders' && isManager && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}><i className="fas fa-file-invoice-dollar" style={{ color: '#ec4899', marginRight: '10px' }}></i> Supply Chain Purchase Orders</h3>
                            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Drafts are generated automatically upon threshold breach.</p>
                        </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Order ID</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Target Vendor</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Est. Capital</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Lifecycle Status</th>
                                <th style={{ padding: '20px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>Operations</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => (
                                <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px', fontFamily: 'monospace', fontWeight: 800, color: '#4f46e5' }}>#PO-{po.id.toString().padStart(4, '0')}</td>
                                    <td style={{ padding: '20px', fontWeight: 800 }}>{po.supplier_name}</td>
                                    <td style={{ padding: '20px', fontWeight: 900, fontSize: '1.1rem' }}>₹{parseFloat(po.total_amount).toLocaleString()}</td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{ background: po.status === 'RECEIVED' ? '#dcfce7' : '#fef3c7', color: po.status === 'RECEIVED' ? '#166534' : '#b45309', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{po.status}</span>
                                    </td>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={()=>openPOItems(po.id)} style={{ padding: '8px 15px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>View Items</button>
                                            {po.status === 'DRAFT' && (
                                                <button onClick={()=>handleReceiveOrder(po.id)} style={{ padding: '8px 15px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-box-open"></i> Receive</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {purchaseOrders.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: 600 }}>Zero active purchase orders.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 5: BUSINESS ANALYTICS (BI HUB) */}
          {/* =================================================== */}
          {activeTab === 'analytics' && isManager && (
            <div style={{ animation: 'fadeIn 0.5s ease' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '30px' }}>
                  <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', borderLeft: '6px solid #4f46e5' }}>
                      <p style={{ margin: 0, color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>7-DAY REVENUE YIELD</p>
                      <h3 style={{ margin: '10px 0 0', fontSize: '2.5rem', color: '#0f172a', fontWeight: 900 }}>₹{analyticsData.salesTrend.reduce((a,b)=>a+parseFloat(b.daily_revenue), 0).toLocaleString()}</h3>
                  </div>
                  <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', borderLeft: '6px solid #f59e0b' }}>
                      <p style={{ margin: 0, color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>DEPLETING SKU NODES</p>
                      <h3 style={{ margin: '10px 0 0', fontSize: '2.5rem', color: '#0f172a', fontWeight: 900 }}>{products.filter(p=>p.quantity < p.min_threshold).length} <span style={{fontSize: '1rem', color: '#ef4444'}}>Auto-PO Engaged</span></h3>
                  </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
                 {/* Trend Chart */}
                 <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-wave-pulse" style={{ color: '#4f46e5', marginRight: '10px' }}></i> Revenue Progression Matrix</h3>
                    <div style={{ height: '300px' }}>
                      <Line 
                        data={{
                          labels: analyticsData.salesTrend.map(d => new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
                          datasets: [{
                            label: 'Gross Daily Yield (₹)',
                            data: analyticsData.salesTrend.map(d => d.daily_revenue),
                            borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#fff'
                          }]
                        }}
                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
                      />
                    </div>
                 </div>

                 {/* Doughnut Chart */}
                 <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 25px 0', fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-chart-pie" style={{ color: '#8b5cf6', marginRight: '10px' }}></i> Sector Dominance</h3>
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
                   <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-trophy" style={{ color: '#eab308', marginRight: '10px' }}></i> High-Velocity Performance Nodes (Top 5)</h3>
                   <button onClick={() => window.print()} style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer' }}><i className="fas fa-download"></i> Export Data</button>
                 </div>
                 <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                   <thead style={{ backgroundColor: '#f8fafc' }}>
                     <tr>
                       <th style={{ padding: '15px', color: '#475569' }}>Rank</th>
                       <th style={{ padding: '15px', color: '#475569' }}>Entity Identity</th>
                       <th style={{ padding: '15px', color: '#475569' }}>Clearance Velocity</th>
                       <th style={{ padding: '15px', color: '#475569', textAlign: 'right' }}>Capital Yield</th>
                     </tr>
                   </thead>
                   <tbody>
                     {analyticsData.topProducts.map((p, i) => (
                       <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                         <td style={{ padding: '15px' }}><div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: i === 0 ? '#fef08a' : '#f1f5f9', color: i === 0 ? '#ca8a04' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{i + 1}</div></td>
                         <td style={{ padding: '15px', fontWeight: 800 }}>{p.name}</td>
                         <td style={{ padding: '15px' }}><span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>{p.total_sold} units</span></td>
                         <td style={{ padding: '15px', textAlign: 'right', fontWeight: 900, color: '#10b981', fontSize: '1.2rem' }}>₹{parseFloat(p.total_revenue).toLocaleString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 6: AUDIT LEDGER */}
          {/* =================================================== */}
          {activeTab === 'ledger' && isManager && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.5s ease', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '25px 30px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-clock-rotate-left" style={{ color: '#38bdf8', marginRight: '10px' }}></i> Immutable Transaction Ledger</h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 800 }}><i className="fas fa-shield-check"></i> ENCRYPTED AUDIT TRAIL</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Timestamp</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Node / Entity</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Operation Signature</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Delta Volume</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Final Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>Audit logs are empty.</td></tr>
                  ) : (
                    ledgerData.map(log => (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '20px 30px', color: '#64748b', fontSize: '0.9rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ padding: '20px 30px', fontWeight: 800 }}>{log.product_name} <br/><span style={{fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic'}}>{log.notes}</span></td>
                        <td style={{ padding: '20px 30px' }}><span style={{ backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '5px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>{log.transaction_type}</span></td>
                        <td style={{ padding: '20px 30px', fontWeight: 900, fontSize: '1.2rem', color: log.quantity_changed > 0 ? '#10b981' : '#ef4444' }}>{log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}</td>
                        <td style={{ padding: '20px 30px', fontWeight: 800, fontSize: '1.1rem' }}>{log.running_balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================== */}
          {/* TAB 7: ACCESS CONTROL (USERS) */}
          {/* =================================================== */}
          {activeTab === 'users' && isAdmin && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', animation: 'fadeIn 0.5s ease', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <div style={{ padding: '25px 30px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}><i className="fas fa-user-shield" style={{ color: '#ef4444', marginRight: '10px' }}></i> Network Access Governance (RBAC)</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#f8fafc' }}>
                  <tr>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Network ID</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Secure Identity</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Clearance Level</th>
                    <th style={{ padding: '20px 30px', color: '#475569', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 800 }}>Authority Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '20px 30px', fontFamily: 'monospace', color: '#94a3b8', fontWeight: 800 }}>#UID-{u.id.toString().padStart(4, '0')}</td>
                      <td style={{ padding: '20px 30px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '35px', height: '35px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{u.username.charAt(0).toUpperCase()}</div>
                        {u.username}
                        {u.username === auth.currentUser && <span style={{ fontSize: '0.6rem', backgroundColor: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '10px', marginLeft: '10px', fontWeight: 800 }}>SELF SESSION</span>}
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
                              .then(() => { fetchAdminData(); showToast(`Privilege escalated for ${u.username}`, "success"); })
                              .catch(() => showToast("Failed to update role", "error"));
                          }}
                          style={{ width: '250px', height: '45px', padding: '0 15px', borderRadius: '8px', border: '1.5px solid #e2e8f0', outline: 'none', fontWeight: 700, cursor: u.username === auth.currentUser ? 'not-allowed' : 'pointer' }}
                        >
                          <option value="staff">LEVEL 1: Standard POS Access</option>
                          <option value="manager">LEVEL 2: System Manager</option>
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
      </div>

      {/* =================================================== */}
      {/* GLOBAL MODAL ENGINE FOR B2B & INVENTORY */}
      {/* =================================================== */}
      
      {/* Inventory & Supplier Modal */}
      <Modal isOpen={isModalOpen && editingId !== 'po-view'} onClose={() => setIsModalOpen(false)} title={editingId === 'add-supplier' ? "Register New Vendor" : (editingId ? "Authorize Node Modification" : "Initialize New SKU Node")}>
        {editingId === 'add-supplier' ? (
          <form onSubmit={handleAddSupplier} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>VENDOR IDENTITY</label>
                <input required value={supplierForm.name} onChange={e=>setSupplierForm({...supplierForm, name: e.target.value})} style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0 15px', fontWeight: 600, outline: 'none' }} placeholder="Global Traders Ltd." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>CONTACT REPRESENTATIVE</label>
                    <input required value={supplierForm.contact_person} onChange={e=>setSupplierForm({...supplierForm, contact_person: e.target.value})} style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0 15px', fontWeight: 600, outline: 'none' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>CONTACT PROTOCOL (PHONE)</label>
                    <input required value={supplierForm.phone} onChange={e=>setSupplierForm({...supplierForm, phone: e.target.value})} style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0 15px', fontWeight: 600, outline: 'none' }} />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>ELECTRONIC MAIL</label>
                    <input type="email" value={supplierForm.email} onChange={e=>setSupplierForm({...supplierForm, email: e.target.value})} style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0 15px', fontWeight: 600, outline: 'none' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>SECTOR</label>
                    <input required value={supplierForm.category} onChange={e=>setSupplierForm({...supplierForm, category: e.target.value})} style={{ width: '100%', height: '50px', border: '2px solid #e2e8f0', borderRadius: '10px', padding: '0 15px', fontWeight: 600, outline: 'none' }} placeholder="e.g. Electronics" />
                </div>
            </div>
            <button type="submit" style={{ height: '60px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem', marginTop: '10px', cursor: 'pointer' }}>INJECT VENDOR TO NETWORK</button>
          </form>
        ) : (
          <form onSubmit={handleInventorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>ENTITY DESIGNATION (NAME)</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>SKU IDENTIFIER</label>
                <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600 }} />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>MARKET SEGMENT</label>
                <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>INITIAL VOLUME</label>
                <input required type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>RETAIL YIELD (₹)</label>
                <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600 }} />
              </div>
            </div>

            {/* B2B Sourcing Section */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 15px', color: '#475569', fontSize: '0.85rem', fontWeight: 900 }}><i className="fas fa-link" style={{ color: '#4f46e5' }}></i> SUPPLY CHAIN INTEGRATION</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>B2B SOURCING COST (₹)</label>
                        <input required type="number" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} style={{ width: '100%', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600, background: '#fff' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>AUTO-PO THRESHOLD</label>
                        <input required type="number" value={formData.min_threshold} onChange={e => setFormData({...formData, min_threshold: e.target.value})} style={{ width: '100%', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 600, background: '#fff' }} />
                    </div>
                </div>
                <div style={{ marginTop: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>ASSIGNED VENDOR NODE</label>
                    <select value={formData.supplier_id} onChange={e => setFormData({...formData, supplier_id: e.target.value})} style={{ width: '100%', height: '50px', padding: '0 15px', border: '2px solid #e2e8f0', borderRadius: '10px', outline: 'none', fontWeight: 700, background: '#fff' }}>
                        <option value="">-- UNLINKED (Select Vendor to Enable Auto-PO) --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                    </select>
                </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '0.8rem', color: '#64748b' }}>VISUAL ASSET (IMAGE)</label>
              <div style={{ border: '2px dashed #cbd5e1', padding: '30px', borderRadius: '12px', textAlign: 'center', backgroundColor: '#f8fafc' }}>
                <input type="file" id="fileUpload" onChange={e => setFormData({...formData, image: e.target.files[0]})} style={{ display: 'none' }} />
                <label htmlFor="fileUpload" style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 800 }}>
                  <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                  {formData.image ? formData.image.name : "Inject Image to Cloudinary Array"}
                </label>
              </div>
            </div>
            
            <button type="submit" style={{ width: '100%', height: '60px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', marginTop: '10px' }}>
              {editingId ? 'AUTHORIZE CLOUD UPDATE' : 'INITIALIZE NEW REGISTRY'}
            </button>
          </form>
        )}
      </Modal>

      {/* PO Breakdown Modal */}
      <Modal isOpen={isModalOpen && editingId === 'po-view'} onClose={()=>setIsModalOpen(false)} title="Purchase Order Breakdown Log" width="800px">
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
            <thead style={{ background: '#f8fafc' }}>
                <tr>
                    <th style={{ padding: '15px 20px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>TARGET SKU</th>
                    <th style={{ padding: '15px 20px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>ENTITY</th>
                    <th style={{ padding: '15px 20px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>REQUESTED VOL</th>
                    <th style={{ padding: '15px 20px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>B2B RATE</th>
                    <th style={{ padding: '15px 20px', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>SUBTOTAL</th>
                </tr>
            </thead>
            <tbody>
                {selectedPOItems.map((item, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '15px 20px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{item.sku}</td>
                        <td style={{ padding: '15px 20px', fontWeight: 800 }}>{item.product_name}</td>
                        <td style={{ padding: '15px 20px' }}><span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>{item.quantity_ordered} Units</span></td>
                        <td style={{ padding: '15px 20px', fontWeight: 700 }}>₹{item.unit_cost}</td>
                        <td style={{ padding: '15px 20px', fontWeight: 900, color: '#10b981', textAlign: 'right', fontSize: '1.1rem' }}>₹{(item.quantity_ordered * item.unit_cost).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        <div style={{ padding: '25px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Estimated Capital Required</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>₹{selectedPOItems.reduce((a,b)=>a+(b.quantity_ordered*b.unit_cost),0).toLocaleString()}</span>
        </div>
      </Modal>

    </div>
  );
}

export default App;