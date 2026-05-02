// server.js - Janesse's Seamoss Creation Backend
require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors({ origin: '*' }));
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  try {
    const { cart, name, email } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Generate beautiful Order ID
    const orderId = 'JAN-' + Date.now().toString().slice(-8);

    const lineItems = cart.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: item.details || "Wild-Harvested Irish Sea Moss Gel",
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: 'http://localhost:3000/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://localhost:3000/cancel.html',
      metadata: {
        order_id: orderId,
        customer_name: name || 'Valued Customer',
        customer_email: email || '',
        items: cart.map(i => `${i.name} x${i.qty}`).join(', ')
      },
    });

    console.log(`✅ New Order Created → ${orderId}`);
    res.json({ id: session.id, orderId: orderId });

  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🌊 Janesse Seamoss Backend flowing on http://localhost:${PORT}`);
});