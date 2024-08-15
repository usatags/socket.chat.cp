const express = require('express');
const http = require('http');
const socket = require('socket.io')
const path = require('path');
const cors = require('cors')
const cookieParser = require('cookie-parser')

const Sockects = require('./sockets');
const { prisma } = require('../database/config');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT;
    this.server = http.createServer(this.app);
    this.io = socket(this.server, {
      cors: {
        // origin: process.env.CLIENT_URL,
        origin: [ 'https://usadealerplates.us', 'https://usatag.us', "http://localhost:5173"],
        methods: ['GET', 'POST']
      }
    });
  }

  middlewares() {
    this.app.use(cors({
      origin: [ 'https://usadealerplates.us', 'https://usatag.us', "http://localhost:5173" ],
      credentials: true
    }));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(function(req, res, next) {
      const allowedOrigins = ['https://usadealerplates.us', 'https://usatag.us', "http://localhost:5173"];
      const origin = req.headers.origin;
      if (allowedOrigins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept", "Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
      next();
    });
    this.app.use("/", require("../router/purchase"));
    this.app.use("/", require("../router/user"));
    this.app.use("/", require("../router/room"));
    this.app.use("/", require("../router/other"));
    this.app.use("/", require("../router/cart"));
    this.app.use("/", require("../router/paypal"));
  }


  configurarSockets() {
    new Sockects(this.io);
  }

  execute() {
    this.middlewares();
    this.configurarSockets(); 
    this.server.listen(this.port, () => {
      console.log('Server running on port', this.port);
    });
  }
}

module.exports = Server;