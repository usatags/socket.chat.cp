const dotenv = require('dotenv');
const express = require('express');
const {
  Server
} = require('http')
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const socket = require('socket.io');
const { PrismaClient } = require('@prisma/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const { createClient } = require('@libsql/client')
const paypal = require("@paypal/checkout-server-sdk")
const axios = require('axios');

// Config
dotenv.config();
const port = process.env.PORT || 3000;
const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})
const adapter = new PrismaLibSQL(libsql)
const prisma = new PrismaClient({
  adapter
})
// const PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com";
const PAYPAL_BASE_URL = "https://www.paypal.com";
// const paypalEnvironment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
const paypalEnvironment = new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
const paypalClientWithRefreshToken = new paypal.core.PayPalHttpClient(paypalEnvironment)
const app = express();

const server = http.Server(app);

// Utils
const findAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      image: true,
      phone_number: true,
      active: true,
      admin: true,
      socketId: true
    }
  }) || []
}

const findUserByID = async (id) => {
  return prisma.user.findUnique({
    where: {
      id: id
    },
    select: {
      id: true,
      email: true,
      username: true,
      image: true,
      phone_number: true,
      active: true,
      admin: true,
      socketId: true
    }
  }) || {}
}

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email: email
    },
    select: {
      id: true,
      email: true,
      username: true,
      image: true,
      phone_number: true,
      active: true,
      admin: true,
      socketId: true
    }
  }) || {}
}

const createUser = async ({
  username, socketID, email, password, image, phone_number
}) => {
  return prisma.user.create({
    data: {
      username,
      socketId: socketID,
      active: true,
      id: uuidv4(),
      password: bcrypt.hashSync(password, 10),
      email,
      image,
      phone_number,
      admin: false
    },
    select: {
      id: true,
      email: true,
      username: true,
      image: true,
      phone_number: true,
      active: true,
      admin: true,
      socketId: true
    }
  })
}

const filterUsersByRole = async (role) => {
  return prisma.user.findMany({
    where: {
      NOT: {
        admin: {
          equals: role
        }
      }
    },
    select: {
      id: true,
      email: true,
      username: true,
      image: true,
      phone_number: true,
      active: true,
      admin: true,
      socketId: true
    }
  }) || []
}

const emailExists = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });
  
  return !!user;
};

const comparePasswords = async (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
}

// USER ROUTES
app.get("/users/:roleFilter", async (req, res) => {
  try {
    const { roleFilter } = req.params;
    const users = await filterUsersByRole(roleFilter === 'true' ? true : false);

    res.status(200).json({
      data: users,
      message: 'Users fetched successfully',
      success: true
    });
  } catch (error) {
    console.error("Error on /users/:roleFilter", error);
    res.status(500).json({
      message: 'Error fetching users by role',
      success: false
    });
  }
})

// AUTH ROUTES
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailTaken = await emailExists(email);
    if (!emailTaken) {
      return res.status(401).json({
        message: 'Email does not exist',
        success: false
      });
    }
    const passwordMatch = await comparePasswords(password, emailTaken.password);
    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Incorrect password',
        success: false
      });
    }
    const user = await findUserByEmail(email);
    res.status(200).json({
      data: user,
      message: 'User logged in successfully',
      success: true
    });
  } catch (error) {
    console.error("Error on /login", error);
    res.status(500).json({
      message: 'Error logging in user',
      success: false
    });
  }
})

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, image, phone_number } = req.body;
    const { userID } = req.cookies || req.body

    if (!username || !email || !password, !image, !phone_number) {
      return res.status(400).json({
        message: 'Please provide all required fields',
        success: false
      });
    }
    const emailTaken = await emailExists(email);
    if (emailTaken) {
      return res.status(400).json({
        message: 'Email already taken',
        success: false
      });
    }

    if (userID) {
      const user = await prisma.user.update({
        where: {
          id: userID
        },
        data: {
          username,
          email,
          password,
          phone_number,
          image
        }
      })

      return res.status(200).json({
        data: user,
        message: 'User updated successfully',
        success: true
      });
    }
    const user = await createUser({
      username,
      email,
      password,
      image,
      phone_number,
      socketID: null
    });

    res.status(201).json({
      data: user,
      message: 'User registered successfully',
      success: true
    });
  } catch (error) {
    console.error("Error on /register", error);
    res.status(500).json({
      message: 'Error registering user',
      success: false
    });
  }
});

app.get('/auth/token', async (req, res) => {
  try {
    const { userID } = req.cookies || req.body
    const user = await findUserByID(userID);
    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        success: false
      });
    }
    res.status(200).json({
      data: user,
      message: 'User found',
      success: true
    });
  } catch (error) {
    console.error("Error on /auth/token", error);
    res.status(500).json({
      message: 'Error fetching user',
      success: false
    });
  }
})

app.get('/auth/created', async (req,res) => {
  try {
    const { userID } = req.cookies || req.body
    const user = await findUserByID(userID);
    if (!user) {
      return res.status(401).json({
        message: 'User not found',
        success: false
      });
    }
    res.status(200).json({
      data: user,
      message: 'User found',
      success: true
    });
  } catch (error) {
    console.error("Error on /auth/created", error);
    res.status(500).json({
      message: 'Error fetching user',
      success: false
    });
  }
})

app.post("/codes/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailTaken = await emailExists(email);

    if (!emailTaken) {
      return res.status(401).json({
        message: 'Email does not exist',
        success: false
      });
    }

    const passwordMatch = await comparePasswords(password, emailTaken.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Incorrect password',
        success: false
      });
    }

    const token = jsonwebtoken.sign({ email, name: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' })
    return res.status(200).json({
      data: token,
      message: 'User logged in successfully',
      success: true
    })
  } catch (error) {
    console.error("Error on /codes/login", error);
    res.status(500).json({
      message: 'Error logging in user',
      success: false
    });
  }
})

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
