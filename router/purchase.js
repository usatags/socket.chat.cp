const {Router} = require('express');
const {
  purchases,
  purchaseByID,
  createPurchase,
  completePurchase,
  updatePurchase,
  purchaseFromConversation,
  purchaseConversarionByID
} = require('../controllers/purchase');

const router = Router();

router.get('/purchases', purchases);
router.get('/purchase/:id', purchaseByID);
router.post('/createPurchase', createPurchase);
router.post('/completePurchase', completePurchase);
router.post('/updatePurchase', updatePurchase);
router.post('/purchaseFromFormConversation', purchaseFromConversation);
router.get('/purchase/conversation/:id', purchaseConversarionByID);

module.exports = router;