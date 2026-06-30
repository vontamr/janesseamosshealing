require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors({ 
  origin: '*',
  credentials: true 
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files (admin HTML pages)
app.use(express.static(path.join(__dirname, 'public')));

// ====================== ADMIN PANEL ======================
const ADMIN_EMAIL = 'admin@janesseamoss.com';

// TODO: Replace with real hash (run generateHash once)
const ADMIN_PASSWORD_HASH = '$2b$10$YOUR_REAL_HASH_HERE'; 

// Hash generator (uncomment once, run, then comment out)
// async function generateHash() {
//   const hash = await bcrypt.hash('your-strong-password-here', 10);
//   console.log('Copy this hash:', hash);
// }
// generateHash();

const authenticateAdmin = (req, res, next) => {
  const token = req.cookies.adminToken;
  if (!token) return res.redirect('/admin/login');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change-this-to-a-very-strong-secret');
    req.admin = decoded;
    next();
  } catch (err) {
    res.redirect('/admin/login');
  }
};

// Admin Routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && await bcrypt.compare(password, ADMIN_PASSWORD_HASH)) {
      const token = jwt.sign({ email }, process.env.JWT_SECRET || 'change-this-to-a-very-strong-secret', { expiresIn: '8h' });
      res.cookie('adminToken', token, { httpOnly: true });
      res.json({ success: true, redirect: '/admin/dashboard' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/admin/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// ====================== CHECKOUT ======================
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart } = req.body;
    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.details || "Wild-Harvested Irish Sea Moss Gel",
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'https://vontamr.github.io/janesseamosshealing/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://vontamr.github.io/janesseamosshealing/shop.html',
      metadata: { source: 'janesse_seamoss_website' }
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌊 Janesse Seamoss Backend running on port ${PORT}`);
});