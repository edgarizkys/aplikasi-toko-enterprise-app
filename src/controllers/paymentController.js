const paymentService = require('../services/paymentService');
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://your-db.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const paymentController = {
  /**
   * Create new transaction
   * POST /api/payments/create
   */
  async createPayment(req, res) {
    const { orderId, method, bank, storeId } = req.body;

    try {
      // Check order and ownership
      const orderQuery = await db.execute({
        sql