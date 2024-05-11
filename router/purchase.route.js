const express = require('express');
const { purchases, purchaseID, createPurchase, updatePurchase, completePurchase, pucharseFromConversation, purchaseConversationID } = require('../controller/purchase.controller');


const router = express.Router();

router.route('/purchases').get(purchases)
router.route('/purchase/:id').get(purchaseID)
router.route('/createPurchase').post(createPurchase)
router.route('/updatePurchase').post(updatePurchase)
router.route('/completePurchase').post(completePurchase)
router.route('/purchaseFromFormConversation').post(pucharseFromConversation)
router.route('/purchase/conversation/:id').get(purchaseConversationID)

module.exports = router;