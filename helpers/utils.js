const { prisma } = require('../database/config')
const bcrypt = require('bcrypt')

const findAllUsers = async () => {
  const users = await prisma?.user.findMany()
  return users || []
}

const createNewUser = async ({
  username, socketID, email, password, image, phone_number
}) => {
  const user = await prisma?.user.create({
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

const findUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email
    }
  })
  return user || null
}

const findUserByID = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id
    }
  })
  return user || null
}

const findRoomByID = async (id) => {
  const room = await prisma.conversation.findUnique({
    where: {
      id
    }
  })
  return room || null
}

const findOtherUserOnConversation = async (conversationID, userID) => {
  const conversation = await prisma.conversation.findUnique({
    where: {
      id: conversationID
    },
    select: {
      members: true
    }
  })

  const otherUser = conversation.members.filter(member => member.id !== userID)

  return otherUser[0] || null
}

module.exports = {
  findAllUsers,
  createNewUser,
  findUserByEmail,
  findUserByID,
  findRoomByID,
  findOtherUserOnConversation
}