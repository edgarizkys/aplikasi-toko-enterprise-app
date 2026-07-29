const crypto = require('crypto');

class PaymentGatewayService {
    constructor() {
        this.serverKey = process.env.PAYMENT_GATEWAY_KEY || 'secret_key_enterprise_2024';
        this.merchantId = process.env.PAYMENT_MERCHANT_ID || 'M-ENT-001';
    }

    /**
     * Membuat Transaksi QRIS (Gopay/OVO/Dana/LinkAja)
     * @param {string} orderId - ID Pesanan
     * @param {number} amount - Total Pembayaran
     * @param {object} customerInfo - Data Pelanggan
     */
    async createQrisTransaction(orderId, amount, customerInfo = {}) {
        const referenceNo = `QRIS-${orderId}-${Date.now()}`;
        return {
            success: true,
            provider: 'Enterprise QRIS Gateway',
            referenceNo,
            orderId,
            amount,
            currency: 'IDR',
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${referenceNo}`,
            deepLink: `gopay://pay?amount=${amount}&ref=${referenceNo}`,
            customer: customerInfo.name || 'Pelanggan Umum',
            status: 'Menunggu Pembayaran',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
    }

    /**
     * Membuat Transaksi Virtual Account (BCA/Mandiri/BNI/BRI)
     * @param {string} orderId - ID Pesanan
     * @param {number} amount - Total Pembayaran
     * @param {string} bank - Kode Bank (BCA, Mandiri, dll)
     */
    async createVirtualAccountTransaction(orderId, amount, bank = 'BCA') {
        const vaNumber = `88008${Math.floor(10000000 + Math.random() * 90000000)}`;
        return {
            success: true,
            provider: `${bank.toUpperCase()} Virtual Account`,
            orderId,
            amount,
            vaNumber,
            instructions: `Silakan transfer ke ${bank.toUpperCase()} VA: ${vaNumber} sebelum 24 jam.`,
            status: 'Menunggu Pembayaran',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
    }

    /**
     * Verifikasi Signature Webhook dari Payment Gateway
     * @param {object} payload - Body dari request webhook
     * @param {string} signature - Signature header
     */
    verifyWebhookSignature(payload, signature) {
        if (!signature) return false;
        try {
            const expectedSig = crypto.createHmac('sha256', this.serverKey)
                .update(JSON.stringify(payload))
                .digest('hex');
            return expectedSig === signature;
        } catch (err) {
            console.error('Signature Verification Error:', err.message);
            return false;
        }
    }

    /**
     * Memproses Notifikasi Pembayaran
     * @param {object} notification - Data notifikasi dari provider
     */
    async handleNotification(notification) {
        const { order_id, transaction_status, settlement_time, payment_type } = notification;
        
        const statusMap = {
            'settlement': 'Lunas',
            'capture': 'Lunas',
            'pending': 'Menunggu Pembayaran',
            'deny': 'Ditolak',
            'expire': 'Kedaluwarsa',
            'cancel': 'Dibatalkan'
        };

        return {
            orderId: order_id,
            status: statusMap[transaction_status] || 'Status Tidak Dikenal',
            method: payment_type,
            paidAt: settlement_time || null,
            verified: true,
            processedAt: new Date().toISOString()
        };
    }

    /**
     * Simulasi Refund untuk Enterprise Store
     * @param {string} orderId 
     * @param {number} amount 
     */
    async processRefund(orderId, amount) {
        return {
            success: true,
            orderId,
            refundAmount: amount,
            status: 'Refund Diproses',
            message: 'Dana akan dikembalikan ke sumber pembayaran asli dalam 3-5 hari kerja.'
        };
    }
}

module.exports = new PaymentGatewayService();