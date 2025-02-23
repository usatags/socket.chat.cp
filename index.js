const { prisma } = require('./database/config');
const Server = require('./models/server');

require('dotenv').config();

// const server = new Server();

// server.execute();

const users = async () => {
  const allUsers = await prisma.user.findMany();
  console.log(allUsers);
}

users();