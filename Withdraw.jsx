import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Withdraw = ({ currentBalance, onClose, onWithdrawSuccess }) => {
    const [phone, setPhone] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleWithdraw = async () => {
        const p = phone.trim();
        const n = parseFloat(amount);

        if (!p || p.length < 10 || p.length > 15 || !/^\+?\d+$/.test(p)) {
            setError('Please enter a valid phone number');
            return;
        }
        if (!amount || isNaN(n) || n < 10) {
            setError('Please enter a valid amount (minimum 10 KES)');
            return;
        }
        if (n > currentBalance) {
            setError('Insufficient balance');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const response = await fetch(`${API_URL}/api/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: n,
                    phone: p
                })
            });

            const data = await response.json();
            
            if (data.status) {
                setSuccess('Withdrawal request submitted successfully!');
                setPhone('');
                setAmount('');
                setTimeout(() => {
                    onWithdrawSuccess(n);
                    onClose();
                }, 2000);
            } else {
                setError('Failed to initiate withdrawal: ' + data.message);
            }
        } catch (error) {
            console.error('Withdraw Error:', error);
            setError('An error occurred. Check console.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000 
        }} onClick={onClose}>
            <div style={{ 
                padding: '24px', 
                color: 'white', 
                background: '#1b2733', 
                borderRadius: '12px',
                width: '90%',
                maxWidth: '380px',
                border: '1px solid #2d3f4f'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Withdraw Funds</h3>
                    <span onClick={onClose} style={{ cursor: 'pointer', fontSize: '24px', lineHeight: 1 }}>×</span>
                </div>
                
                <div style={{ 
                    background: 'rgba(34,197,94,0.1)', 
                    border: '1px solid #22c55e', 
                    borderRadius: '8px', 
                    padding: '12px',
                    marginBottom: '16px',
                    textAlign: 'center'
                }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Available Balance</span>
                    <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: 800 }}>{currentBalance.toFixed(2)} KES</div>
                </div>

                {error && (
                    <div style={{ 
                        background: 'rgba(225,29,40,0.1)', 
                        border: '1px solid #e11d28', 
                        borderRadius: '6px', 
                        padding: '10px',
                        marginBottom: '16px',
                        color: '#e11d28',
                        fontSize: '13px'
                    }}>{error}</div>
                )}

                {success && (
                    <div style={{ 
                        background: 'rgba(34,197,94,0.1)', 
                        border: '1px solid #22c55e', 
                        borderRadius: '6px', 
                        padding: '10px',
                        marginBottom: '16px',
                        color: '#22c55e',
                        fontSize: '13px'
                    }}>{success}</div>
                )}

                <div style={{ marginTop: '15px' }}>
                    <label style={{ fontSize: '12px', color: '#9ca3af' }}>Phone Number (M-Pesa)</label>
                    <input 
                        maxLength={15}
                        type="text" 
                        placeholder="254..." 
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            margin: '8px 0 16px', 
                            background: '#0f1923', 
                            border: '1px solid #475569', 
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px'
                        }}
                    />
                    <label style={{ fontSize: '12px', color: '#9ca3af' }}>Amount (KES)</label>
                    <input 
                        type="number" 
                        placeholder="Amount" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px', 
                            margin: '8px 0 20px', 
                            background: '#0f1923', 
                            border: '1px solid #475569', 
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '14px'
                        }}
                    />
                    <button 
                        onClick={handleWithdraw} 
                        disabled={loading} 
                        style={{ 
                            width: '100%', 
                            padding: '14px', 
                            background: loading ? '#475569' : '#f97316', 
                            border: 'none', 
                            borderRadius: '6px',
                            color: 'white', 
                            fontWeight: 'bold', 
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer' 
                        }}
                    >
                        {loading ? 'Processing...' : 'WITHDRAW NOW'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Withdraw;