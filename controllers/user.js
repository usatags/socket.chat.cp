const { response } = require('express');
const bcrypt = require('bcrypt');
const { prisma } = require('../database/config');
const jwt = require('jsonwebtoken');
const {createNewUser, findUserByEmail} = require('../helpers/utils');

const filterUsersByRole = async (req, res = response) => {
  const { roleFilter } = req.params

  const parsedRoleFilter = roleFilter === 'true' ? true : false
  try {
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          admin: {
            equals: parsedRoleFilter
          }
        }
      },
      select: {
        id: true,
        username: true,
        email: true,
        phone_number: true,
        image: true,
        active: true,
        socketId: true,
        admin: true
      }
    })

    res.status(200).json({
      data: users,
      message: 'Users fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from users', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const login = async (req, res = response) => {
  const {
    password,
    email
  } = req.body
  try {
    const usernameTaken = await prisma.user.findUnique({
      where: {
        email
      }
    })
  
    if (!usernameTaken) {
      return res.status(400).json({
        error: 'Invalid email'
      })
    }
  
    const passwordMatch = bcrypt.compareSync(password, usernameTaken.password)
  
    if (!passwordMatch) {
      return res.status(400).json({
        error: 'Invalid password'
      })
    }
  
    res.cookie('userID', usernameTaken.id, { httpOnly: true, sameSite: 'none', secure: true })
    res.status(200).json({
      data: usernameTaken,
      message: 'User logged in successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from login', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const register = async (req, res = response) => {
  try {
    const body = req.body
    const { userID } = req.cookies
    const { username, email, password, phone_number, image } = body

    if (!username || !email || !password || !phone_number || !image) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const userExists = await findUserByEmail(email)

    if (userExists) {
      res.cookie('userID', userExists.id, { httpOnly: true, sameSite: 'none', secure: true })
      return res.status(201).json({
        data: userExists,
        message: 'User already exists',
        success: true
      })
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
      return res.status(201).json({
        data: user,
        message: 'User created successfully',
        success: true
      })
    }

    const user = await createNewUser({
      username,
      email,
      password,
      phone_number,
      image
    })

    res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
    res.status(201).json({
      data: user,
      message: 'User created successfully',
      success: true
    })
  } catch (error) {
    console.log('Errof from register', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const userUpdate = async (req, res = response) => {
  const { email, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await prisma.user.update({
      where: {
        email
      },
      data: {
        password: hashedPassword
      }
    })

    return res.status(200).json({
      data: true,
      message: 'User updated successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from user/update', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const restorePassword = async (req, res = response) => {
  const { email } = req.body
  try {
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const token = jwt.sign({ email, name: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' })

    return res.status(200).json({
      data: token,
      message: 'Token generated successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from restore/password', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

const restoreCheck = async (req, res = response) => {
  const {token} = req.body
  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(400).json({ error: 'Invalid token' })
      }

      return res.status(200).json({
        data: decoded,
        message: 'Token verified successfully',
        success: true
      })
    })
  } catch (error) {
    console.log('Error from restore/check', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  filterUsersByRole,
  login,
  register,
  userUpdate,
  restorePassword,
  restoreCheck
}