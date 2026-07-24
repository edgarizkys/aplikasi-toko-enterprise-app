const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appController');
const payCtrl = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.get('/analytics', auth, ctrl.getAnalytics);
router.post('/payment/qris', auth, payCtrl.createQris);
router.post('/payment/va', auth, payCtrl.createVa);
router.post('/payment/webhook', payCtrl.handleWebhook);

router.get('/produk', auth, ctrl.getAllProduk);
router.post('/produk', auth, ctrl.createProduk);
router.delete('/produk/:id', auth, ctrl.deleteProduk);
router.get('/penjualan', auth, ctrl.getAllPenjualan);
router.post('/penjualan', auth, ctrl.createPenjualan);
router.delete('/penjualan/:id', auth, ctrl.deletePenjualan);
router.get('/supplier', auth, ctrl.getAllSupplier);
router.post('/supplier', auth, ctrl.createSupplier);
router.delete('/supplier/:id', auth, ctrl.deleteSupplier);

module.exports = router;