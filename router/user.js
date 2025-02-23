const {
  filterUsersByRole,
  login,
  register,
  userUpdate,
  restoreCheck,
  restorePassword
} = require('../controllers/user');

const { Router } = require('express');

const router = Router();

router.get('/users/:roleFilter', filterUsersByRole);
router.post('/login', login);
router.post('/register', register);
router.put("/user/update", userUpdate);
router.post('/restore/password', restorePassword);
router.post('/restore/check', restoreCheck);


module.exports = router;