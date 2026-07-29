// controllers/paymentController.js

const paymentService = require('../services/paymentService');

class PaymentController {
    async createQris(req, res) {
        try {
            const { orderId, amount, customerInfo } = req.body;
            if (!orderId || !amount) return res.status(400).json({ error: 'Data tidak lengkap' });
            
            const result = await paymentService.createQrisTransaction(orderId, amount, customerInfo);
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: 'Gagal buat QRIS', details: err.message });
        }
    }

    async createVA(req, res) {
        try {
            const { orderId, amount, bank } = req.body;
            if (!orderId || !amount || !bank) return res.status(400).json({ error: 'Data tidak lengkap' });
            
            const result = await paymentService.createVirtualAccountTransaction(orderId, amount, bank);
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: 'Gagal buat VA', details: err.message });
        }
    }

    async handleWebhook(req, res) {
        try {
            const signature = req.headers['x-payment-signature'];
            const isValid = paymentService.verifyWebhookSignature(req.body, signature);
            
            if (!isValid) return res.status(403).json({ error: 'Signature tidak valid' });

            // Logic update status pesanan di DB Turso
            // await db.execute('UPDATE sales SET status = ? WHERE id = ?', ['PAID', req.body.orderId]);

            res.status(200).json({ status: 'OK' });
        } catch (err) {
            res.status(500).json({ error: 'Webhook gagal diproses' });
        }
    }
}

module.exports = new PaymentController();