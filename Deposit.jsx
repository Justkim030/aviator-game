import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Deposit = () => {
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeposit = async () => {
        if (!phone || !amount) return alert('Please enter phone and amount');
        
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    phone: phone,
                    email: 'user@example.com' // Replace with actual logged-in user email
                })
            });

            const data = await response.json();
            
            if (data.status) {
                alert('STK Push sent! Please check your phone to complete payment.');
            } else {
                alert('Failed to initiate deposit: ' + data.message);
            }
        } catch (error) {
            console.error('Deposit Error:', error);
            alert('An error occurred. Check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', color: 'white', background: '#1b2733', borderRadius: '8px' }}>
            <h3>Deposit via M-Pesa</h3>
            <div style={{ marginTop: '15px' }}>
                <label>Phone Number (e.g. 254700000000)</label>
                <input 
                    type="text" 
                    placeholder="254..." 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#0f1923', border: '1px solid #475569', color: 'white' }}
                />
                <label>Amount (KES)</label>
                <input 
                    type="number" 
                    placeholder="Amount" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', padding: '10px', margin: '10px 0', background: '#0f1923', border: '1px solid #475569', color: 'white' }}
                />
                <button onClick={handleDeposit} disabled={loading} style={{ width: '100%', padding: '12px', background: '#28a745', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    {loading ? 'Processing...' : 'DEPOSIT NOW'}
                </button>
            </div>
        </div>
    );
};

export default Deposit;