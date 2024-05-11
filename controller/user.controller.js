const { PrismaClient } = require('@prisma/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const { createClient } = require('@libsql/client')
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')

dotenv.config()

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter })

const usersByRole = async (req, res, next) => {
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

    res.status(200).send({ data: users, message: 'Users fetched successfully', success: true })
  } catch (error) {
    console.error(error)
    res.status(500).send({ message: 'Internal server error' })
  }
}

module.exports = {
  usersByRole
}