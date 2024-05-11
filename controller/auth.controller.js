const { PrismaClient } = require('@prisma/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const { createClient } = require('@libsql/client')
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')
const { v4: uuidv4 } = require('uuid');

dotenv.config()

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter })

const createNewUser = async ({
  username, socketID, email, password, image, phone_number
}) => {
  const user = await prisma.user.create({
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
    }
  })
  return user || null
}

const login = async (req, res, next) => {
  const { password, email } = req.body;
  try {
    if (!password || !email) throw new Error('Email and password are required');
    const emailTaken = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!emailTaken) res.status(400).json({ message: 'Email not found' });
    const passwordMatched = await bcrypt.compare(password, emailTaken.password);

    if (!passwordMatched) res.status(400).json({ message: 'Password incorrect' });

    res.cookie('userID', emailTaken.id, { httpOnly: true, sameSite: 'none', secure: true })
    res.status(200).json({ data: emailTaken, message: 'Login successful', success: true });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message, error: 'Invalid credentials' });
  }
}

const register = async (req, res, next) => {
  const { userID } = req.cookies
  const { username, email, password, phone_number, image } = req.body;
  try {
    if (!username || !email || !password || !phone_number || !image) throw new Error('All fields are required');
    const userExists = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (userExists) {
      res.cookie('userID', userExists.id, { httpOnly: true, sameSite: 'none', secure: true })
      res.status(200).json({ data: userExists, message: 'User already exists', success: true });
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

      res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
      res.status(200).json({ data: user, message: 'User updated', success: true });
    }


    const user = await createNewUser({
      username,
      email,
      password,
      phone_number,
      image
    })

    res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
    res.status(200).json({ data: user, message: 'User created', success: true });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message, error: 'Invalid credentials' });
  }
}

const token = async (req, res, next) => {
  const { userID } = req.cookies
  try {
    if (!userID) {
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4()
        }
      })

      res.cookie('userID', newUser.id, { httpOnly: true, sameSite: 'none', secure: true })
      return res.status(200).json({
        data: true,
        message: 'User fetched successfully',
        success: true
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userID
      }
    })

    if (user) {
      res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
    } else {
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4()
        }
      })

      res.cookie('userID', newUser.id, { httpOnly: true, sameSite: 'none', secure: true })
    }

    return res.status(200).json({
      data: true,
      message: 'User fetched successfully',
      success: true
    })
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message, error: 'Invalid credentials' });
  }
}

const created = async (req, res, next) => {
  const { userID } = req.cookies
  try {
    if (!userID) throw new Error('User not found');
    const user = await prisma.user.findUnique({
      where: {
        id: userID
      }
    })

    if (!user) throw new Error('User not found');

    if (user.username && user.email) res.status(200).json({ data: true, message: 'User found', success: true });
    else res.status(200).json({ data: false, message: 'User not found', success: true });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message, error: 'Invalid credentials' });
  }
}

module.exports = {
  login,
  register,
  token,
  created
}