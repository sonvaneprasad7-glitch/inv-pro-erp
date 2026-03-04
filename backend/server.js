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

// 🟢 Cloudinary Connection Status Logs (Quality Check)
console.log("--- System Integration Status ---");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Active ✅" : "Missing ❌");
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Active ✅" : "Missing ❌");
console.log("---------------------------------");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'inv_pro_products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'scale' }] 
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
// 1. AUTHENTICATION MODULE (RBAC Security)
// ===================================================

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
    console.error("Register Error:", err.message);
    res.status(500).json({ error: "Registration failed." }); 
  }
});

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
    res.status(500).json({ error: "Login failed" }); 
  }
});

// ===================================================
// 2. PRODUCT & INVENTORY MODULE (UPDATED WITH B2B)
// ===================================================

app.get('/api/products', async (req, res) => {
  try {
    // Joining with suppliers to see vendor info in products
    const allProducts = await pool.query(`
      SELECT p.*, s.name as supplier_name 
      FROM products p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id 
      ORDER BY p.id DESC
    `);
    res.json(allProducts.rows);
  } catch (err) { res.status(500).json({ error: "Fetch error" }); }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    const { name, sku, category, quantity, price, min_threshold, cost_price, supplier_id } = req.body;
    const image_url = req.file ? req.file.path : null;
    
    const newProduct = await pool.query(
      "INSERT INTO products (name, sku, category, quantity, price, image_url, min_threshold, cost_price, supplier_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [name, sku, category, quantity, price, image_url, min_threshold || 15, cost_price || 0, supplier_id || null]
    );
    
    const product = newProduct.rows[0];
    if (product.quantity > 0) {
      await pool.query(
        "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
        [product.id, 'IN - NEW STOCK', product.quantity, product.quantity, 'Initial inventory added']
      );
    }
    res.status(201).json(product);
  } catch (err) { 
    console.error("PRODUCT POST FAILURE:", err); 
    res.status(500).json({ error: "Upload Failed", details: err.message }); 
  }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, category, quantity, price, min_threshold, cost_price, supplier_id } = req.body;
    let image_url = req.body.image_url; 
    if (req.file) image_url = req.file.path;

    const oldProduct = await pool.query("SELECT quantity FROM products WHERE id = $1", [id]);
    const oldQty = oldProduct.rows[0].quantity;
    const newQty = parseInt(quantity);

    const updateProduct = await pool.query(
      "UPDATE products SET name = $1, sku = $2, category = $3, quantity = $4, price = $5, image_url = $6, min_threshold = $7, cost_price = $8, supplier_id = $9 WHERE id = $10 RETURNING *",
      [name, sku, category, quantity, price, image_url, min_threshold, cost_price, supplier_id, id]
    );
    
    const diff = newQty - oldQty;
    if (diff !== 0) {
      const type = diff > 0 ? 'IN - MANUAL UPDATE' : 'OUT - MANUAL UPDATE';
      await pool.query(
        "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
        [id, type, diff, newQty, 'Manual adjustment']
      );
    }
    res.json(updateProduct.rows[0]);
  } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id = $1", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

// ===================================================
// 3. SALES & AUTOMATED ORDER TRIGGER (INTEGRATED)
// ===================================================

app.post('/api/sales', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); 
    const { product_id, quantity_sold } = req.body;
    const productRes = await client.query("SELECT * FROM products WHERE id = $1", [product_id]);
    const product = productRes.rows[0];
    
    if (product.quantity < quantity_sold) throw new Error("Stock kam hai!");
    
    const total_price = product.price * quantity_sold;
    const newSale = await client.query(
      "INSERT INTO sales (product_id, quantity_sold, total_price) VALUES ($1, $2, $3) RETURNING *",
      [product_id, quantity_sold, total_price]
    );
    
    const updatedProductRes = await client.query(
      "UPDATE products SET quantity = quantity - $1 WHERE id = $2 RETURNING *", 
      [quantity_sold, product_id]
    );
    const updatedProduct = updatedProductRes.rows[0];

    // Ledger Entry
    await client.query(
      "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
      [product_id, 'OUT - SALE', -quantity_sold, updatedProduct.quantity, `Sale #INV-${newSale.rows[0].id}`]
    );

    // 🔥 AUTOMATED PURCHASE ORDER LOGIC 🔥
    // Agar stock threshold se niche jaye aur supplier assigned ho
    if (updatedProduct.quantity <= updatedProduct.min_threshold && updatedProduct.supplier_id) {
        // Check if a DRAFT PO already exists for this supplier
        const existingOrder = await client.query(
            "SELECT id FROM purchase_orders WHERE supplier_id = $1 AND status = 'DRAFT'",
            [updatedProduct.supplier_id]
        );

        let orderId;
        if (existingOrder.rows.length === 0) {
            // Naya DRAFT PO banayein
            const newPO = await client.query(
                "INSERT INTO purchase_orders (supplier_id, status, total_amount) VALUES ($1, 'DRAFT', 0) RETURNING id",
                [updatedProduct.supplier_id]
            );
            orderId = newPO.rows[0].id;
        } else {
            orderId = existingOrder.rows[0].id;
        }

        // Add product to the DRAFT PO (upsert logic)
        await client.query(`
            INSERT INTO purchase_order_items (order_id, product_id, quantity_ordered, unit_cost)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (id) DO NOTHING`, // Note: Real world logic would check if item exists in PO
            [orderId, product_id, 50, updatedProduct.cost_price] // Defaulting to 50 units for refill
        );
    }

    await client.query('COMMIT'); 
    res.status(201).json({ message: "Sale successful!", sale: newSale.rows[0] });
  } catch (err) { 
    await client.query('ROLLBACK'); 
    res.status(400).json({ error: err.message }); 
  } finally { client.release(); }
});

app.get('/api/sales', async (req, res) => {
  try {
    const allSales = await pool.query(`
      SELECT s.id, p.name, s.quantity_sold, s.total_price, s.sale_date 
      FROM sales s JOIN products p ON s.product_id = p.id ORDER BY s.sale_date DESC
    `);
    res.json(allSales.rows);
  } catch (err) { res.status(500).json({ error: "Sales fetch error" }); }
});

// ===================================================
// 4. STOCK LEDGER (AUDIT TRAIL)
// ===================================================

app.get('/api/ledger', async (req, res) => {
  try {
    const ledger = await pool.query(`
      SELECT l.id, p.name as product_name, p.sku, l.transaction_type, l.quantity_changed, l.running_balance, l.notes, l.created_at
      FROM stock_ledger l JOIN products p ON l.product_id = p.id ORDER BY l.created_at DESC
    `);
    res.json(ledger.rows);
  } catch (err) { res.status(500).json({ error: "Ledger fetch error" }); }
});

// ===================================================
// 5. USER MANAGEMENT
// ===================================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await pool.query("SELECT id, username, role FROM users ORDER BY id ASC");
    res.json(users.rows);
  } catch (err) { res.status(500).json({ error: "Users fetch error" }); }
});

app.put('/api/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updateUser = await pool.query("UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role", [role, id]);
    res.json(updateUser.rows[0]);
  } catch (err) { res.status(500).json({ error: "Role update failed" }); }
});

// ===================================================
// 6. BUSINESS ANALYTICS APIS
// ===================================================

app.get('/api/analytics/top-products', async (req, res) => {
  try {
    const topProducts = await pool.query(`
      SELECT p.name, SUM(s.quantity_sold) as total_sold, SUM(s.total_price) as total_revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      GROUP BY p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);
    res.json(topProducts.rows);
  } catch (err) { res.status(500).json({ error: "Analytics fetch failed." }); }
});

app.get('/api/analytics/category-sales', async (req, res) => {
  try {
    const categorySales = await pool.query(`
      SELECT p.category, SUM(s.total_price) as revenue
      FROM sales s
      JOIN products p ON s.product_id = p.id
      GROUP BY p.category
      ORDER BY revenue DESC
    `);
    res.json(categorySales.rows);
  } catch (err) { res.status(500).json({ error: "Category analytics error." }); }
});

app.get('/api/analytics/sales-trend', async (req, res) => {
  try {
    const trend = await pool.query(`
      SELECT DATE(sale_date) as date, SUM(total_price) as daily_revenue
      FROM sales
      WHERE sale_date > NOW() - INTERVAL '7 days'
      GROUP BY DATE(sale_date)
      ORDER BY DATE(sale_date) ASC
    `);
    res.json(trend.rows);
  } catch (err) { res.status(500).json({ error: "Trend analysis error." }); }
});

// ===================================================
// 🔥 7. NEW: SUPPLIER MANAGEMENT MODULE 🔥
// ===================================================

app.get('/api/suppliers', async (req, res) => {
  try {
    const resSuppliers = await pool.query("SELECT * FROM suppliers ORDER BY name ASC");
    res.json(resSuppliers.rows);
  } catch (err) { res.status(500).json({ error: "Supplier fetch failure." }); }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, category } = req.body;
    const newSupplier = await pool.query(
      "INSERT INTO suppliers (name, contact_person, phone, email, address, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [name, contact_person, phone, email, address, category]
    );
    res.status(201).json(newSupplier.rows[0]);
  } catch (err) { res.status(500).json({ error: "Failed to add supplier." }); }
});

app.put('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contact_person, phone, email, address, category, balance } = req.body;
      const updated = await pool.query(
        "UPDATE suppliers SET name=$1, contact_person=$2, phone=$3, email=$4, address=$5, category=$6, balance=$7 WHERE id=$8 RETURNING *",
        [name, contact_person, phone, email, address, category, balance, id]
      );
      res.json(updated.rows[0]);
    } catch (err) { res.status(500).json({ error: "Update failed." }); }
});

// ===================================================
// 🔥 8. NEW: PURCHASE ORDER MODULE 🔥
// ===================================================

app.get('/api/purchase-orders', async (req, res) => {
  try {
    const pos = await pool.query(`
      SELECT po.*, s.name as supplier_name 
      FROM purchase_orders po 
      JOIN suppliers s ON po.supplier_id = s.id 
      ORDER BY po.created_at DESC
    `);
    res.json(pos.rows);
  } catch (err) { res.status(500).json({ error: "PO fetch error." }); }
});

app.get('/api/purchase-orders/:id/items', async (req, res) => {
    try {
      const items = await pool.query(`
        SELECT poi.*, p.name as product_name, p.sku 
        FROM purchase_order_items poi 
        JOIN products p ON poi.product_id = p.id 
        WHERE poi.order_id = $1`, [req.params.id]);
      res.json(items.rows);
    } catch (err) { res.status(500).json({ error: "PO items fetch error." }); }
});

// Receiving Maal: Update Stock & Ledger
app.put('/api/purchase-orders/:id/receive', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const poId = req.params.id;
        
        // 1. Get PO items
        const itemsRes = await client.query("SELECT * FROM purchase_order_items WHERE order_id = $1", [poId]);
        
        // 2. Update stock for each item
        for (let item of itemsRes.rows) {
            const upRes = await client.query(
                "UPDATE products SET quantity = quantity + $1 WHERE id = $2 RETURNING quantity",
                [item.quantity_ordered, item.product_id]
            );
            
            // 3. Log in Ledger
            await client.query(
                "INSERT INTO stock_ledger (product_id, transaction_type, quantity_changed, running_balance, notes) VALUES ($1, $2, $3, $4, $5)",
                [item.product_id, 'IN - PURCHASE', item.quantity_ordered, upRes.rows[0].quantity, `Received from PO #${poId.toString().padStart(4,'0')}`]
            );
        }

        // 4. Set PO status to RECEIVED
        await client.query("UPDATE purchase_orders SET status = 'RECEIVED' WHERE id = $1", [poId]);
        
        await client.query('COMMIT');
        res.json({ message: "Inventory updated via Purchase Order!" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally { client.release(); }
});

// ===================================================
// SERVER START
// ===================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Professional Enterprise Server Live on Port ${PORT}`));