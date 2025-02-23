const {Router} = require('express');
const {
  getCart,
  createCart,
  updateProduct,
  deleteProduct
} = require('../controllers/cart');

const router = Router();

router.get('/cart', getCart);
router.post('/cart', createCart);
router.put('/cart/product', updateProduct);
router.delete('/cart/product/:productID', deleteProduct);

module.exports = router;