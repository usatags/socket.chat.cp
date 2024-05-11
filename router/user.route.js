const express = require('express');
const { usersByRole } = require('../controller/user.controller');

const router = express.Router();

router.route('/users/:roleFilter').get(usersByRole);

module.exports = router;