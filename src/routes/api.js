const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/appController');
const payCtrl = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.get('/analytics', auth, ctrl.getAnalytics);
router.post('/payment/qris', auth, payCtrl.createQris);
router.post('/payment/va', auth, payCtrl.createVa);
router.post('/payment/webhook', payCtrl.handleWebhook);

router.get('/products', auth, ctrl.getAllProducts);
router.post('/products', auth, ctrl.createProducts);
router.delete('/products/:id', auth, ctrl.deleteProducts);
router.get('/sales', auth, ctrl.getAllSales);
router.post('/sales', auth, ctrl.createSales);
router.delete('/sales/:id', auth, ctrl.deleteSales);
router.get('/customers', auth, ctrl.getAllCustomers);
router.post('/customers', auth, ctrl.createCustomers);
router.delete('/customers/:id', auth, ctrl.deleteCustomers);

module.exports = router;