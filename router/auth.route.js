const express = require('express');
const { login, created, register, token } = require('../controller/auth.controller');

const router = express.Router();

router.route('/login').post(login);
router.route('/register').post(register);
router.route('/auth/token').get(token);
router.route('/auth/created').get(created);

module.exports = router;