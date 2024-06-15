const {
  getMessagesFromRoom
} = require('../controllers/room');

const { Router } = require('express');

const router = Router();

router.get('/room/:roomID/messages', getMessagesFromRoom);

module.exports = router;