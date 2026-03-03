const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ===================================================
// IMAGE HOSTING: CLOUDINARY & MULTER CONFIGURATION
// ===================================================
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 Cloudinary Connection Verification Logs
console.log("--- Cloudinary Integration Status ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Active ✅" : "Missing ❌");
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Active ✅" : "Missing ❌");
console.log("-------------------------------------");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'inv_pro_products', // Cloudinary folder name
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Professional resizing
  },
});
const upload = multer({ storage: storage });

// ===================================================
// DATABASE: NEON POSTGRESQL CONNECTION
// ===================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===================================================
// 1. AUTHENTICATION MODULE (Security)
// ===================================================

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, role", 
      [username, hashedPassword]
    );
    res.status(201).json(newUser.rows[0]);
  } catch (err) { 
    console.error("Auth Register Error:", err.message);
    res.status(500).json({ error: "Username already exists or system error." }); 
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    
    if (user.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, 'SECRET_KEY_123', { expiresIn: '24h' });
    res.json({ token, username: user.rows[0].username, role: user.rows[0].role });
  } catch (err) { 
    console.error("Auth Login Error:", err.message);
    res.status(500).json({ error: "Login system failure." }); 
  }
});

// ===================================================
// 2. PRODUCT & INVENTORY MODULE
// ===================================================

// Fetch All Products
app.get('/api/products', async (req, res) => {
  try {
    const allProducts = await pool.query("SELECT * FROM products ORDER BY id DESC");
    res.json(allProducts.rows);
  } catch (err) { 
    console.error("Fetch Products Error:", err.message);
    res.status(500).json({ error: "Could not fetch inventory." }); 
  }
});

// Create New Product (With Cloudinary Upload)
app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, sku, category, quantity, price } = req.body;
    const image_url = req.file ? req.file.path : null; // Cloudinary permanent URL
    
    const newProduct = await pool.query(
      "INSERT INTO products (name, sku, category, quantity, price, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, sku, category, quantity, price, image_url]
    );
    
    const product = newProduct.rows[0];

    // Log this addition in Stock Ledger
    if (product.quantity > 0) {
      await pool.query(
        "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
        [product.id, 'IN - NEW STOCK', product.quantity, product.quantity, 'Initial inventory added via Admin Panel']
      );
    }
    res.status(201).json(product);
  } catch (err) { 
    // 🔥 Detailed Error Handling (Slaying the [object Object] dragon)
    console.error("PRODUCT POST FAILURE:", err); 
    res.status(500).json({ 
      error: "Cloudinary/Database Sync Failed", 
      message: err.message,
      tip: "Please check if your CLOUDINARY_CLOUD_NAME is 'dtlpid2o1' and not 'Root'."
    }); 
  }
});

// Update Product
app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, quantity, price } = req.body;
    let image_url = req.body.image_url; 
    
    if (req.file) image_url = req.file.path;

    const oldProduct = await pool.query("SELECT quantity FROM products WHERE id = $1", [id]);
    const oldQty = oldProduct.rows[0].quantity;
    const newQty = parseInt(quantity);

    const updateProduct = await pool.query(
      "UPDATE products SET name = $1, sku = $2, category = $3, quantity = $4, price = $5, image_url = $6 WHERE id = $7 RETURNING *",
      [name, sku, category, quantity, price, image_url, id]
    );
    
    // Ledger Tracking for Manual Updates
    const diff = newQty - oldQty;
    if (diff !== 0) {
      const type = diff > 0 ? 'IN - MANUAL UPDATE' : 'OUT - MANUAL UPDATE';
      await pool.query(
        "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
        [id, type, diff, newQty, 'Manual stock adjustment by Administrator']
      );
    }
    res.json(updateProduct.rows[0]);
  } catch (err) { 
    console.error("Product Update Error:", err);
    res.status(500).json({ error: "Failed to update product." }); 
  }
});

// Delete Product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ message: "Product record and history removed." });
  } catch (err) { 
    console.error("Delete Error:", err.message);
    res.status(500).json({ error: "Deletion failed." }); 
  }
});

// ===================================================
// 3. SALES & TRANSACTIONS MODULE (Professional Loop)
// ===================================================

app.post('/api/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start SQL Transaction

    const { product_id, quantity_sold } = req.body;
    const productRes = await client.query("SELECT * FROM products WHERE id = $1", [product_id]);
    
    if (productRes.rows.length === 0) throw new Error("Product data not found in catalog.");
    
    const product = productRes.rows[0];
    if (product.quantity < quantity_sold) throw new Error("Insufficient stock to fulfill this order.");
    
    const total_price = product.price * quantity_sold;
    
    // 1. Record Sale Transaction
    const newSale = await client.query(
      "INSERT INTO sales (product_id, quantity_sold, total_price) VALUES ($1, $2, $3) RETURNING *",
      [product_id, quantity_sold, total_price]
    );
    
    // 2. Adjust Stock Inventory
    const updatedProduct = await client.query(
      "UPDATE products SET quantity = quantity - $1 WHERE id = $2 RETURNING quantity", 
      [quantity_sold, product_id]
    );

    // 3. Update Audit Ledger (Passbook)
    await client.query(
      "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
      [product_id, 'OUT - SALE', -quantity_sold, updatedProduct.rows[0].quantity, `Automated Sale Entry #INV-${newSale.rows[0].id}`]
    );
    
    await client.query('COMMIT'); 
    res.status(201).json({ message: "Transaction processed successfully.", sale: newSale.rows[0] });
  } catch (err) { 
    await client.query('ROLLBACK'); // Safety first
    console.error("Transaction Error:", err.message);
    res.status(400).json({ error: err.message }); 
  } finally {
    client.release(); 
  }
});

// Fetch Sales History for Reports
app.get('/api/sales', async (req, res) => {
  try {
    const allSales = await pool.query(`
      SELECT s.id, p.name, s.quantity_sold, s.total_price, s.sale_date 
      FROM sales s 
      JOIN products p ON s.product_id = p.id 
      ORDER BY s.sale_date DESC
    `);
    res.json(allSales.rows);
  } catch (err) { res.status(500).json({ error: "Reporting error." }); }
});

// ===================================================
// 4. MASTER LEDGER (AUDIT TRAIL)
// ===================================================
app.get('/api/ledger', async (req, res) => {
  try {
    const ledger = await pool.query(`
      SELECT l.id, p.name as product_name, p.sku, l.transaction_type, l.quantity_changed, l.running_balance, l.notes, l.created_at
      FROM stock_ledger l
      JOIN products p ON l.product_id = p.id
      ORDER BY l.created_at DESC
    `);
    res.json(ledger.rows);
  } catch (err) { res.status(500).json({ error: "Ledger fetch failure." }); }
});

// ===================================================
// 5. USER MANAGEMENT (RBAC Settings)
// ===================================================
app.get('/api/users', async (req, res) => {
  try {
    const users = await pool.query("SELECT id, username, role FROM users ORDER BY id ASC");
    res.json(users.rows);
  } catch (err) { res.status(500).json({ error: "User audit failure." }); }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updateUser = await pool.query(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role",
      [role, id]
    );
    res.json(updateUser.rows[0]);
  } catch (err) { res.status(500).json({ error: "Permission update failed." }); }
});

// ===================================================
// SERVER BOOTUP
// ===================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Enterprise Server Live on Port ${PORT}`));