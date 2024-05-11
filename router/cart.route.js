const express = require('express');
const { getCart, createCart, updateCart, deleteCart } = require('../controller/cartController');

const router = express.Router();

router.route('/cart').get(getCart);
router.route('/cart').post(createCart);
router.route('/cart/product').put(updateCart);
router.route('/cart/product/:productID').delete(deleteCart);

module.exports = router;