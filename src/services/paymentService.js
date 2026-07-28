// services/paymentService.js
const crypto = require('crypto');
const { db } = require('../config/database');

class PaymentGatewayService {
    constructor() {
        this.serverKey = process.env.PAYMENT_GATEWAY_KEY || 'secret_key_enterprise_store';
        this.merchantId = process.env.PAYMENT_MERCHANT_ID || 'TOKO-ENT-001';
        this.clientKey = process.env.PAYMENT_CLIENT_KEY || 'client_key_enterprise_store';
        this.xenditApiKey = process.env.XENDIT_API_KEY || '';
        this.midtransApiUrl = process.env.MIDTRANS_API_URL || 'https://app.sandbox.midtrans.com/api/v2';
        this.xenditApiUrl = process.env.XENDIT_API_URL || 'https://api.xendit.co/v4';
    }

    async createQrisTransaction(orderId, amount, customerInfo = {}, tenantId) {
        try {
            const referenceNo = `QRIS-${orderId}-${Date.now()}`;
            
            const transaction = {
                orderId,
                referenceNo,
                amount,
                currency: 'IDR',
                paymentMethod: 'QRIS',
                status: 'pending',
                customerName: customerInfo.name || 'Pelanggan',
                customerEmail: customerInfo.email || '',
                customerPhone: customerInfo.phone || '',
                tenantId,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            };

            await db.execute(
                `INSERT INTO payment_transactions 
                (order_id, reference_no, amount, currency, payment_method, status, 
                 customer_name, customer_email, customer_phone, tenant_id, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.orderId,
                    transaction.referenceNo,
                    transaction.amount,
                    transaction.currency,
                    transaction.paymentMethod,
                    transaction.status,
                    transaction.customerName,
                    transaction.customerEmail,
                    transaction.customerPhone,
                    transaction.tenantId,
                    transaction.createdAt,
                    transaction.expiresAt
                ]
            );

            return {
                success: true,
                provider: 'Midtrans / Xendit',
                referenceNo,
                orderId,
                amount,
                currency: 'IDR',
                paymentMethod: 'QRIS',
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(referenceNo)}`,
                deepLink: `gopay://pay?amount=${amount}&ref=${referenceNo}`,
                customer: transaction.customerName,
                expiresAt: transaction.expiresAt,
                displayMessage: 'Scan kode QR dengan aplikasi dompet digital Anda'
            };
        } catch (error) {
            console.error('Error creating QRIS transaction:', error);
            throw new Error(`Gagal membuat transaksi QRIS: ${error.message}`);
        }
    }

    async createVirtualAccountTransaction(orderId, amount, bank = 'BCA', customerInfo = {}, tenantId) {
        try {
            const vaNumber = `88008${Math.floor(10000000 + Math.random() * 90000000)}`;
            const bankCode = this.getBankCode(bank);
            
            const transaction = {
                orderId,
                referenceNo: `VA-${bankCode}-${Date.now()}`,
                amount,
                currency: 'IDR',
                paymentMethod: `VIRTUAL_ACCOUNT_${bank.toUpperCase()}`,
                status: 'pending',
                vaNumber,
                bank: bank.toUpperCase(),
                customerName: customerInfo.name || 'Pelanggan',
                customerEmail: customerInfo.email || '',
                customerPhone: customerInfo.phone || '',
                tenantId,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };

            await db.execute(
                `INSERT INTO payment_transactions 
                (order_id, reference_no, amount, currency, payment_method, status, 
                 va_number, bank, customer_name, customer_email, customer_phone, 
                 tenant_id, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.orderId,
                    transaction.referenceNo,
                    transaction.amount,
                    transaction.currency,
                    transaction.paymentMethod,
                    transaction.status,
                    transaction.vaNumber,
                    transaction.bank,
                    transaction.customerName,
                    transaction.customerEmail,
                    transaction.customerPhone,
                    transaction.tenantId,
                    transaction.createdAt,
                    transaction.expiresAt
                ]
            );

            const instructionText = `Transfer ke ${bank.toUpperCase()} Virtual Account: ${vaNumber} sebelum ${this.formatDate(transaction.expiresAt)}`;

            return {
                success: true,
                provider: `${bank.toUpperCase()} Virtual Account`,
                orderId,
                amount,
                currency: 'IDR',
                paymentMethod: `VIRTUAL_ACCOUNT_${bank.toUpperCase()}`,
                vaNumber,
                bankCode,
                instructions: instructionText,
                displayInstructions: [
                    `1. Buka aplikasi ${bank.toUpperCase()} Anda`,
                    `2. Pilih Transfer → Transfer ke Bank Lain`,
                    `3. Masukkan nomor rekening: ${vaNumber}`,
                    `4. Masukkan jumlah: Rp ${this.formatCurrency(amount)}`,
                    `5. Konfirmasi dan kirim`
                ],
                expiresAt: transaction.expiresAt,
                displayMessage: `Silakan transfer ke nomor virtual account ${bank.toUpperCase()} dalam 24 jam`
            };
        } catch (error) {
            console.error('Error creating Virtual Account transaction:', error);
            throw new Error(`Gagal membuat transaksi Virtual Account: ${error.message}`);
        }
    }

    async createBankTransferTransaction(orderId, amount, customerInfo = {}, tenantId) {
        try {
            const referenceNo = `TRANSFER-${Date.now()}`;
            
            const transaction = {
                orderId,
                referenceNo,
                amount,
                currency: 'IDR',
                paymentMethod: 'BANK_TRANSFER',
                status: 'pending',
                customerName: customerInfo.name || 'Pelanggan',
                customerEmail: customerInfo.email || '',
                customerPhone: customerInfo.phone || '',
                tenantId,
                createdAt: new Date().toISOString()
            };

            await db.execute(
                `INSERT INTO payment_transactions 
                (order_id, reference_no, amount, currency, payment_method, status, 
                 customer_name, customer_email, customer_phone, tenant_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.orderId,
                    transaction.referenceNo,
                    transaction.amount,
                    transaction.currency,
                    transaction.paymentMethod,
                    transaction.status,
                    transaction.customerName,
                    transaction.customerEmail,
                    transaction.customerPhone,
                    transaction.tenantId,
                    transaction.createdAt
                ]
            );

            return {
                success: true,
                provider: 'Bank Transfer Manual',
                referenceNo,
                orderId,
                amount,
                currency: 'IDR',
                paymentMethod: 'BANK_TRANSFER',
                bankDetails: {
                    bankName: 'BCA',
                    accountName: process.env.COMPANY_ACCOUNT_NAME || 'PT Toko Enterprise',
                    accountNumber: process.env.COMPANY_ACCOUNT_NUMBER || '1234567890',
                    swiftCode: 'BCAINIDJA'
                },
                instructions: `Transfer ke rekening BCA atas nama PT Toko Enterprise dengan referensi ${referenceNo}`,
                displayMessage: 'Instruksi transfer telah dikirim ke email Anda'
            };
        } catch (error) {
            console.error('Error creating bank transfer transaction:', error);
            throw new Error(`Gagal membuat transaksi transfer bank: ${error.message}`);
        }
    }

    async createInvoicePaymentTransaction(orderId, amount, customerInfo = {}, tenantId) {
        try {
            const referenceNo = `INV-${Date.now()}`;
            
            const transaction = {
                orderId,
                referenceNo,
                amount,
                currency: 'IDR',
                paymentMethod: 'INVOICE',
                status: 'pending',
                customerName: customerInfo.name || 'Pelanggan',
                customerEmail: customerInfo.email || '',
                customerPhone: customerInfo.phone || '',
                tenantId,
                createdAt: new Date().toISOString()
            };

            await db.execute(
                `INSERT INTO payment_transactions 
                (order_id, reference_no, amount, currency, payment_method, status, 
                 customer_name, customer_email, customer_phone, tenant_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    transaction.orderId,
                    transaction.referenceNo,
                    transaction.amount,
                    transaction.currency,
                    transaction.paymentMethod,
                    transaction.status,
                    transaction.customerName,
                    transaction.customerEmail,
                    transaction.customerPhone,
                    transaction.tenantId,
                    transaction.createdAt
                ]
            );

            return {
                success: true,
                provider: 'Invoice Payment',
                referenceNo,
                orderId,
                amount,
                currency: 'IDR',
                paymentMethod: 'INVOICE',
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                displayMessage: 'Faktur telah digenerate dan dikirim ke email Anda'
            };
        } catch (error) {
            console.error('Error creating invoice payment transaction:', error);
            throw new Error(`Gagal membuat transaksi invoice: ${error.message}`);
        }
    }

    async verifyWebhookSignature(payload, signature, source = 'midtrans') {
        try {
            if (!signature) {
                console.warn('Webhook signature is missing');
                return false;
            }

            if (source === 'midtrans') {
                const expectedSig = crypto
                    .createHmac('sha512', this.serverKey)
                    .update(JSON.stringify(payload))
                    .digest('hex');
                return expectedSig === signature;
            } else if (source === 'xendit') {
                const expectedSig = crypto
                    .createHmac('sha256', this.xenditApiKey)
                    .update(JSON.stringify(payload))
                    .digest('hex');
                return expectedSig === signature;
            }

            return false;
        } catch (error) {
            console.error('Error verifying webhook signature:', error);
            return false;
        }
    }

    async processWebhookNotification(payload, source = 'midtrans', tenantId) {
        try {
            let transactionStatus = 'pending';
            let referenceNo = '';
            let orderId = '';
            let amount = 0;

            if (source === 'midtrans') {
                referenceNo = payload.reference_id || payload.order_id;
                orderId = payload.order_id;
                transactionStatus = this.mapMidtransStatus(payload.transaction_status);
                amount = payload.gross_amount;
            } else if (source === 'xendit') {
                referenceNo = payload.reference_id;
                orderId = payload.reference_id;
                transactionStatus = this.mapXenditStatus(payload.status);
                amount = payload.amount;
            }

            const existingTransaction = await db.execute(
                `SELECT * FROM payment_transactions WHERE reference_no = ? AND tenant_id = ?`,
                [referenceNo, tenantId]
            );

            if (existingTransaction.rows.length > 0) {
                await db.execute(
                    `UPDATE payment_transactions 
                     SET status = ?, updated_at = ?, webhook_payload = ?
                     WHERE reference_no = ? AND tenant_id = ?`,
                    [
                        transactionStatus,
                        new Date().toISOString(),
                        JSON.stringify(payload),
                        referenceNo,
                        tenantId
                    ]
                );

                if (transactionStatus === 'completed' || transactionStatus === 'paid') {
                    await this.updateOrderPaymentStatus(orderId, 'paid', tenantId);
                }
            }

            return {
                success: true,
                message: 'Webhook notification processed',
                referenceNo,
                orderId,
                status: transactionStatus
            };
        } catch (error) {
            console.error('Error processing webhook notification:', error);
            throw new Error(`Gagal memproses notifikasi webhook: ${error.message}`);
        }
    }

    async getPaymentTransaction(referenceNo, tenantId) {
        try {
            const result = await db.execute(
                `SELECT * FROM payment_transactions WHERE reference_no = ? AND tenant_id = ?`,
                [referenceNo, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Transaksi pembayaran tidak ditemukan');
            }

            return result.rows[0];
        } catch (error) {
            console.error('Error getting payment transaction:', error);
            throw new Error(`Gagal mengambil data transaksi: ${error.message}`);
        }
    }

    async getPaymentTransactionsByOrder(orderId, tenantId) {
        try {
            const result = await db.execute(
                `SELECT * FROM payment_transactions 
                 WHERE order_id = ? AND tenant_id = ?
                 ORDER BY created_at DESC`,
                [orderId, tenantId]
            );

            return result.rows;
        } catch (error) {
            console.error('Error getting payment transactions by order:', error);
            throw new Error(`Gagal mengambil data transaksi: ${error.message}`);
        }
    }

    async getPaymentTransactionHistory(tenantId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const countResult = await db.execute(
                `SELECT COUNT(*) as total FROM payment_transactions WHERE tenant_id = ?`,
                [tenantId]
            );

            const result = await db.execute(
                `SELECT * FROM payment_transactions 
                 WHERE tenant_id = ?
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [tenantId, limit, offset]
            );

            return {
                data: result.rows,
                pagination: {
                    page,
                    limit,
                    total: countResult.rows[0].total,
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            };
        } catch (error) {
            console.error('Error getting payment transaction history:', error);
            throw new Error(`Gagal mengambil riwayat transaksi: ${error.message}`);
        }
    }

    async updatePaymentTransactionStatus(referenceNo, status, tenantId, notes = '') {
        try {
            await db.execute(
                `UPDATE payment_transactions 
                 SET status = ?, updated_at = ?, notes = ?
                 WHERE reference_no = ? AND tenant_id = ?`,
                [status, new Date().toISOString(), notes, referenceNo, tenantId]
            );

            return {
                success: true,
                message: 'Status transaksi pembayaran berhasil diperbarui'
            };
        } catch (error) {
            console.error('Error updating payment transaction status:', error);
            throw new Error(`Gagal memperbarui status transaksi: ${error.message}`);
        }
    }

    async updateOrderPaymentStatus(orderId, paymentStatus, tenantId) {
        try {
            let orderStatus = 'processing';
            if (paymentStatus === 'paid') {
                orderStatus = 'confirmed';
            }

            await db.execute(
                `UPDATE orders 
                 SET payment_status = ?, status = ?, updated_at = ?
                 WHERE order_number = ? AND tenant_id = ?`,
                [paymentStatus, orderStatus, new Date().toISOString(), orderId, tenantId]
            );

            return {
                success: true,
                message: 'Status pembayaran pesanan berhasil diperbarui'
            };
        } catch (error) {
            console.error('Error updating order payment status:', error);
            throw new Error(`Gagal memperbarui status pembayaran pesanan: ${error.message}`);
        }
    }

    calculateTotalPaymentDue(amount, tax = 0, discount = 0) {
        const subtotal = amount - discount;
        const total = subtotal + tax;
        return Math.round(total);
    }

    calculatePaymentBreakdown(amount, taxPercentage = 10, discountPercentage = 0) {
        const discount = Math.round(amount * (discountPercentage / 100));
        const subtotal = amount - discount;
        const tax = Math.round(subtotal * (taxPercentage / 100));
        const total = subtotal + tax;

        return {
            original: amount,
            discount,
            discountPercentage,
            subtotal,
            tax,
            taxPercentage,
            total,
            breakdown: [
                { label: 'Harga', amount: amount, type: 'base' },
                { label: 'Diskon', amount: -discount, type: 'discount' },
                { label: 'Pajak (PPN)', amount: tax, type: 'tax' },
                { label: 'Total', amount: total, type: 'total' }
            ]
        };
    }

    mapMidtransStatus(midtransStatus) {
        const statusMap = {
            'capture': 'completed',
            'settlement': 'completed',
            'pending': 'pending',
            'deny': 'failed',
            'cancel': 'cancelled',
            'expire': 'expired',
            'failure': 'failed'
        };
        return statusMap[midtransStatus] || 'pending';
    }

    mapXenditStatus(xenditStatus) {
        const statusMap = {
            'COMPLETED': 'completed',
            'SUCCEEDED': 'completed',
            'PENDING': 'pending',
            'FAILED': 'failed',
            'EXPIRED': 'expired',
            'REVERSED': 'cancelled'
        };
        return statusMap[xenditStatus] || 'pending';
    }

    getBankCode(bankName) {
        const bankCodes = {
            'BCA': '014',
            'MANDIRI': '008',
            'BRI': '002',
            'CIMB': '022',
            'OVO': 'OVO',
            'GOPAY': 'GOPAY'
        };
        return bankCodes[bankName.toUpperCase()] || '014';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatDate(dateString) {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    }

    generatePaymentReceiptData(transaction) {
        return {
            receiptNumber: `RCP-${transaction.reference_no}`,
            transactionDate: this.formatDate(transaction.created_at),
            paymentMethod: this.getPaymentMethodLabel(transaction.payment_method),
            amount: this.formatCurrency(transaction.amount),
            status: this.getPaymentStatusLabel(transaction.status),
            referenceNo: transaction.reference_no,
            orderId: transaction.order_id,
            customerName: transaction.customer_name,
            customerEmail: transaction.customer_email
        };
    }

    getPaymentMethodLabel(method) {
        const labels = {
            'QRIS': 'QRIS / E-Wallet',
            'VIRTUAL_ACCOUNT_BCA': 'Virtual Account BCA',
            'VIRTUAL_ACCOUNT_MANDIRI': 'Virtual Account Mandiri',
            'VIRTUAL_ACCOUNT_BRI': 'Virtual Account BRI',
            'BANK_TRANSFER': 'Transfer Bank',
            'INVOICE': 'Faktur',
            'CASH': 'Tunai'
        };
        return labels[method] || method;
    }

    getPaymentStatusLabel(status) {
        const labels = {
            'pending': 'Menunggu Pembayaran',
            'completed': 'Pembayaran Selesai',
            'paid': 'Terbayar',
            'failed': 'Pembayaran Gagal',
            'cancelled': 'Dibatalkan',
            'expired': 'Kadaluarsa'
        };
        return labels[status] || status;
    }
}

module.exports = new PaymentGatewayService();