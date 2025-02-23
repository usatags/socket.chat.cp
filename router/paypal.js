const { Router } = require('express');
const {
  apiToken,
  apiOrder,
  apiOrders
} = require('../controllers/paypal');

const router = Router();

router.post('/api/token', apiToken);
router.post('/api/order', apiOrder);
router.post('/api/orders/:orderID/capture', apiOrders);

module.exports = router;