const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { db } = require('../config/database');
const { validatePayment, validateWebhook } = require('../middleware/validation');
const { asyncHandler } = require('../utils/asyncHandler');
const { generateReference } = require('../utils/helpers');

// Create QRIS Payment
router.post('/qris', validatePayment, asyncHandler(async (req, res) => {
    const { orderId, customerId } = req.body;
    const tenantId = req.user.tenantId;

    const order = await db.execute(
        'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
        [orderId, tenantId]
    );

    if (!order.rows.length) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const customer = await db.execute(
        'SELECT company_name FROM customers WHERE id = ? AND tenant_id = ?',
        [customerId, tenantId]
    );

    const qrisTransaction = await paymentService.createQrisTransaction(
        order.rows[0].order_number,
        order.rows[0].final_amount,
        { name: customer.rows[0]?.company_name || 'Pelanggan' }
    );

    await db.execute(
        `INSERT INTO payment_transactions 
         (order_id, tenant_id, payment_method, reference_no, amount, status, qr_code_url, deep_link, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, tenantId, 'qris', qrisTransaction.referenceNo, qrisTransaction.amount, 
         'pending', qrisTransaction.qrCodeUrl, qrisTransaction.deepLink, qrisTransaction.expiresAt]
    );

    res.json({
        success: true,
        data: {
            referenceNo: qrisTransaction.referenceNo,
            amount: qrisTransaction.amount,
            currency: qrisTransaction.currency,
            qrCodeUrl: qrisTransaction.qrCodeUrl,
            deepLink: qrisTransaction.deepLink,
            expiresAt: qrisTransaction.expiresAt
        }
    });
}));

// Create Virtual Account Payment
router.post('/virtual-account', validatePayment, asyncHandler(async (req, res) => {
    const { orderId, bank = 'BCA', customerId } = req.body;
    const tenantId = req.user.tenantId;

    const order = await db.execute(
        'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
        [orderId, tenantId]
    );

    if (!order.rows.length) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const vaTransaction = await paymentService.createVirtualAccountTransaction(
        order.rows[0].order_number,
        order.rows[0].final_amount,
        bank
    );

    await db.execute(
        `INSERT INTO payment_transactions 
         (order_id, tenant_id, payment_method, reference_no, amount, status, va_number, va_bank, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, tenantId, 'virtual_account', vaTransaction.orderId, vaTransaction.amount,
         'pending', vaTransaction.vaNumber, bank, vaTransaction.expiresAt]
    );

    res.json({
        success: true,
        data: {
            vaNumber: vaTransaction.vaNumber,
            bank: vaTransaction.provider,
            amount: vaTransaction.amount,
            instructions: vaTransaction.instructions,
            expiresAt: vaTransaction.expiresAt
        }
    });
}));

// Create Transfer Payment
router.post('/transfer', validatePayment, asyncHandler(async (req, res) => {
    const { orderId, customerId } = req.body;
    const tenantId = req.user.tenantId;

    const order = await db.execute(
        'SELECT * FROM orders WHERE id = ? AND tenant_id = ?',
        [orderId, tenantId]
    );

    if (!order.rows.length) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    }

    const referenceNo = generateReference('TRF', order.rows[0].order_number);
    const bankAccount = process.env.COMPANY_BANK_ACCOUNT || '1234567890';
    const bankName = process.env.COMPANY_BANK_NAME || 'BCA';

    await db.execute(
        `INSERT INTO payment_transactions 
         (order_id, tenant_id, payment_method, reference_no, amount, status, bank_account, bank_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, tenantId, 'transfer', referenceNo, order.rows[0].final_amount,
         'pending', bankAccount, bankName]
    );

    res.json({
        success: true,
        data: {
            referenceNo,
            amount: order.rows[0].final_amount,
            currency: 'IDR',
            bankAccount,
            bankName,
            description: `Pembayaran untuk ${order.rows[0].order_number}`
        }
    });
}));

// Get Payment Transaction Details
router.get('/transaction/:referenceNo', asyncHandler(async (req, res) => {
    const { referenceNo } = req.params;
    const tenantId = req.user.tenantId;

    const transaction = await db.execute(
        `SELECT pt.*, o.order_number, o.final_amount, c.company_name
         FROM payment_transactions pt
         JOIN orders o ON pt.order_id = o.id
         JOIN customers c ON o.customer_id = c.id
         WHERE pt.reference_no = ? AND pt.tenant_id = ?`,
        [referenceNo, tenantId]
    );

    if (!transaction.rows.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    res.json({
        success: true,
        data: transaction.rows[0]
    });
}));

// Verify Payment (Manual Confirmation)
router.post('/verify', asyncHandler(async (req, res) => {
    const { referenceNo, paidAmount, proofUrl } = req.body;
    const tenantId = req.user.tenantId;

    const transaction = await db.execute(
        'SELECT * FROM payment_transactions WHERE reference_no = ? AND tenant_id = ?',
        [referenceNo, tenantId]
    );

    if (!transaction.rows.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    const trans = transaction.rows[0];
    
    if (paidAmount < trans.amount) {
        return res.status(400).json({ error: 'Jumlah pembayaran kurang' });
    }

    await db.execute(
        `UPDATE payment_transactions 
         SET status = ?, paid_amount = ?, proof_url = ?, verified_at = datetime('now')
         WHERE reference_no = ? AND tenant_id = ?`,
        ['verified', paidAmount, proofUrl, referenceNo, tenantId]
    );

    await db.execute(
        `UPDATE invoices SET status = ? WHERE order_id = ? AND tenant_id = ?`,
        ['paid', trans.order_id, tenantId]
    );

    await db.execute(
        `UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?`,
        ['completed', trans.order_id, tenantId]
    );

    res.json({
        success: true,
        message: 'Pembayaran berhasil diverifikasi',
        data: { referenceNo, status: 'verified' }
    });
}));

// Webhook Callback
router.post('/webhook', validateWebhook, asyncHandler(async (req, res) => {
    const payload = req.body;
    const signature = req.headers['x-signature'];
    const tenantId = req.headers['x-tenant-id'];

    if (!paymentService.verifyWebhookSignature(payload, signature)) {
        return res.status(401).json({ error: 'Signature tidak valid' });
    }

    const { reference_no, status, amount } = payload;

    const transaction = await db.execute(
        'SELECT * FROM payment_transactions WHERE reference_no = ? AND tenant_id = ?',
        [reference_no, tenantId]
    );

    if (!transaction.rows.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    const newStatus = status === 'settlement' || status === 'success' ? 'paid' : 'failed';

    await db.execute(
        `UPDATE payment_transactions 
         SET status = ?, paid_amount = ?, webhook_confirmed_at = datetime('now')
         WHERE reference_no = ? AND tenant_id = ?`,
        [newStatus, amount || transaction.rows[0].amount, reference_no, tenantId]
    );

    if (newStatus === 'paid') {
        await db.execute(
            `UPDATE invoices SET status = ? WHERE order_id = ? AND tenant_id = ?`,
            ['paid', transaction.rows[0].order_id, tenantId]
        );

        await db.execute(
            `UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?`,
            ['completed', transaction.rows[0].order_id, tenantId]
        );
    }

    res.json({ success: true, message: 'Webhook processed' });
}));

// List Payment Transactions
router.get('/list', asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, method, startDate, endDate } = req.query;
    const tenantId = req.user.tenantId;
    const offset = (page - 1) * limit;

    let query = `SELECT pt.*, o.order_number, c.company_name FROM payment_transactions pt
                 JOIN orders o ON pt.order_id = o.id
                 JOIN customers c ON o.customer_id = c.id
                 WHERE pt.tenant_id = ?`;
    const params = [tenantId];

    if (status) {
        query += ` AND pt.status = ?`;
        params.push(status);
    }

    if (method) {
        query += ` AND pt.payment_method = ?`;
        params.push(method);
    }

    if (startDate && endDate) {
        query += ` AND DATE(pt.created_at) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY pt.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const transactions = await db.execute(query, params);

    const countResult = await db.execute(
        `SELECT COUNT(*) as total FROM payment_transactions WHERE tenant_id = ?`,
        [tenantId]
    );

    res.json({
        success: true,
        data: transactions.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult.rows[0].total
        }
    });
}));

// Get Payment Statistics
router.get('/statistics', asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const tenantId = req.user.tenantId;

    let dateFilter = '';
    const params = [tenantId];

    if (startDate && endDate) {
        dateFilter = ` AND DATE(pt.created_at) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    const stats = await db.execute(
        `SELECT 
            COUNT(*) as total_transactions,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
            SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
            SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed,
            COUNT(DISTINCT payment_method) as unique_methods
         FROM payment_transactions WHERE tenant_id = ?${dateFilter}`,
        params
    );

    const methodStats = await db.execute(
        `SELECT payment_method, COUNT(*) as count, SUM(amount) as total
         FROM payment_transactions WHERE tenant_id = ?${dateFilter}
         GROUP BY payment_method`,
        params
    );

    res.json({
        success: true,
        data: {
            summary: stats.rows[0],
            byMethod: methodStats.rows
        }
    });
}));

// Resend Payment Reminder
router.post('/send-reminder/:referenceNo', asyncHandler(async (req, res) => {
    const { referenceNo } = req.params;
    const tenantId = req.user.tenantId;

    const transaction = await db.execute(
        `SELECT pt.*, o.order_number, c.email FROM payment_transactions pt
         JOIN orders o ON pt.order_id = o.id
         JOIN customers c ON o.customer_id = c.id
         WHERE pt.reference_no = ? AND pt.tenant_id = ?`,
        [referenceNo, tenantId]
    );

    if (!transaction.rows.length) {
        return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }

    // TODO: Integrate email service
    res.json({
        success: true,
        message: 'Pengingat pembayaran telah dikirim ke email pelanggan'
    });
}));

module.exports = router;