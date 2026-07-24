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
const ADMIN_PASSWORD_HASH = '$2b$10$sd6cDM9Y7YPCuK6QfJMCw.GGXOrjoIh.hs0wisMmK8E80sCl89BqS'; 
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

// ====================== MULTI-USER LOGIN ======================
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const fs = require('fs');
      const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
      const user = usersData.users.find(u => u.email === email);

      if (!user) {
          return res.status(401).json({ success: false, error: "User not found" });
      }

      // Simple password check (we'll improve with bcrypt later)
      if (user.password !== password) {
          return res.status(401).json({ success: false, error: "Invalid password" });
      }

      // Create JWT with user info + location
      const token = jwt.sign(
          { 
              id: user.id, 
              email: user.email, 
              name: user.name,
              location: user.location,
              role: user.role 
          }, 
          process.env.JWT_SECRET || 'change-this-to-a-very-strong-secret', 
          { expiresIn: '8h' }
      );

      res.cookie('adminToken', token, { httpOnly: true });
      res.json({ 
          success: true, 
          redirect: '/admin/dashboard',
          user: {
              name: user.name,
              location: user.location,
              role: user.role
          }
      });

  } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, error: "Server error" });
  }
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
      metadata: { source: 'janesse_seamoss_website' },

      shipping_address_collection: {
        allowed_countries: ['US'],
      },
      shipping_options: [
        {
          shipping_rate: 'shr_1TwPmeIeLXeJ9tb9hCOzXzvU', // Free In-Store Pickup
        },
        {
          shipping_rate: 'shr_1TwPrAIeLXeJ9tb96nLia9Xl', // Local Delivery
        },
        {
          shipping_rate: 'shr_1TwPuCIeLXeJ9tb9sMc9aP4o', // Standard US Shipping
        },
      ],
    });

    res.json({ id: session.id });

  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// ====================== DASHBOARD DATA API ======================
app.get('/api/dashboard', (req, res) => {
  const fs = require('fs');
  try {
      const rawData = fs.readFileSync('data.json', 'utf8');
      const data = JSON.parse(rawData);
      res.json(data);
  } catch (err) {
      console.error("Dashboard data error:", err);
      res.status(500).json({ error: "Failed to load dashboard data" });
  }

// ====================== ADMIN DASHBOARD PAGE ======================
app.get('/admin/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

});



app.listen(PORT, () => {
  console.log(`🌊 Janesse Seamoss Backend running on port ${PORT}`);



  app.post('/retrieve-session', async (req, res) => {
    try {
      const { session_id } = req.body;
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items']
      });
      res.json({
        id: session.id,
        amount_total: session.amount_total,
        customer_email: session.customer_email || 'N/A',
        cart: session.line_items.data
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


});