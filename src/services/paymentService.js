// services/paymentService.js
const crypto = require('crypto');

class PaymentGatewayService {
    constructor() {
        this.serverKey = process.env.PAYMENT_GATEWAY_KEY || 'secret';
        this.merchantId = process.env.PAYMENT_MERCHANT_ID || 'M-001';
    }

    async createQrisTransaction(orderId, amount, customerInfo = {}) {
        if (!orderId || !amount) throw new Error('Data transaksi tidak lengkap');
        
        const referenceNo = `QRIS-${orderId}-${Date.now()}`;
        return {
            success: true,
            provider: 'Midtrans / Xendit',
            referenceNo,
            orderId,
            amount,
            currency: 'IDR',
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${referenceNo}`,
            deepLink: `gopay://pay?amount=${amount}&ref=${referenceNo}`,
            customer: customerInfo.name || 'Pelanggan Umum',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
    }

    async createVirtualAccountTransaction(orderId, amount, bank = 'BCA') {
        if (!orderId || !amount) throw new Error('Data transaksi tidak lengkap');
        
        const vaNumber = `88008${Math.floor(10000000 + Math.random() * 90000000)}`;
        return {
            success: true,
            provider: `${bank.toUpperCase()} Virtual Account`,
            orderId,
            amount,
            vaNumber,
            instructions: `Transfer ke ${bank.toUpperCase()} VA: ${vaNumber} sebelum 24 jam.`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }

    verifyWebhookSignature(payload, signature) {
        if (!signature) return false;
        try {
            const expectedSig = crypto.createHmac('sha256', this.serverKey)
                .update(JSON.stringify(payload)).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signature));
        } catch (err) {
            return false;
        }
    }
}

module.exports = new PaymentGatewayService();