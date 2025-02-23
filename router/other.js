const { Router } = require('express');
const {
  changeIDS,
  products,
  createPlateCode,
  createPlateDetailsCode,
  getPlateCodeByTagname,
  getEnv,
  getToken
} = require('../controllers/other');

const router = Router();

router.get('/changeIDS', changeIDS);
router.get('/products', products);
router.post('/createPlateCode', createPlateCode);
router.get('/plateDetailsCodes', createPlateDetailsCode);
router.get('/plateDetailsCodes/:tagName', getPlateCodeByTagname);
router.get('/env', getEnv);
router.get('/auth/created', getToken);

module.exports = router;
