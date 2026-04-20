const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

router.post('/deposit', async (req, res) => {
    const { amount, phone, email } = req.body;

    try {
        const response = await axios.post(
            'https://api.paystack.co/charge',
            {
                email: email,
                amount: amount * 100, // Paystack expects amount in cents/kobo
                currency: "KES",
                mobile_money: {
                    phone: phone,
                    provider: "mpesa"
                },
                metadata: {
                    email: email,
                    phone: phone
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.status(200).json(response.data);
    } catch (error) {
        console.error('Paystack Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Failed to initiate STK push' });
    }
});

router.post('/webhook', async (req, res) => {
    // 1. Verify the event is from Paystack
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
                       .update(JSON.stringify(req.body))
                       .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
        const event = req.body;

        // 2. Handle successful payment
        if (event.event === 'charge.success') {
            const amount = event.data.amount / 100; // Convert back from cents/kobo
            const userEmail = event.data.metadata.email;

            console.log(`[PAYMENT SUCCESS] Crediting ${userEmail} with ${amount} KES`);
            
            // TODO: Add database logic here to update the user's balance
            // await User.findOneAndUpdate({ email: userEmail }, { $inc: { balance: amount } });
        }
    }
    res.sendStatus(200); // Always respond with 200 OK to Paystack
});

module.exports = router;