// server.js - Janesse's Seamoss Creation Backend (Fixed)
require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);   // ← Use your secret key from .env

app.use(cors({ origin: '*' }));
app.use(express.json());

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
        unit_amount: Math.round(item.price * 100),   // convert dollars to cents
      },
      quantity: item.qty || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: req.body.success_url || 'https://vontamr.github.io/janesseamosshealing/shop.html?success=true',
      cancel_url: req.body.cancel_url || 'https://vontamr.github.io/janesseamosshealing/cancel.html',
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