const socket = require('socket.io')
const cors = require('cors')
const {
  Server
} = require('http')
const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { PrismaLibSQL } = require('@prisma/adapter-libsql')
const { createClient } = require('@libsql/client')
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt')
const dotenv = require('dotenv')

dotenv.config()
const port = process.env.PORT || 3000

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter })

const app = express()

app.use(cors())
app.use(express.json())

const server = Server(app)

const io = socket(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const findAllUsers = async () => {
  const user = await prisma.user.findMany()
  return user
}

const createNewUser = async ({
  username, socketID, email, password
}) => {
  const user = await prisma.user.create({
    data: {
      username,
      socketId: socketID,
      active: true,
      id: uuidv4(),
      password: bcrypt.hashSync(password, 10),
    }
  })
  return user
}

const findUserByEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: {
      email
    }
  })
  return user
}

const findUserByID = async (id) => {
  const user = await prisma.user.findUnique({
    where: {
      id
    }
  })
  return user
}

// io.on('connection', (socket) => {
//   socket.on('join', async ({
//     member1,
//     member2
//   }) => {
//     await prisma.conversation.create({
//       data: {
//         id: `${member1}-${member2}`,
//         members: {
//           connect: [
//             {
//               username: member1
//             },
//             {
//               username: member2
//             }
//           ]
//         }
//       }
//     })
//     socket.join(`${member1}-${member2}`)
//   })

//   socket.on('user-active', async ({
//     username,
//     email,
//     password
//   }) => {
//     const users = await findAllUsers()
//     const usernameTaken = users.some(user => user.username === username)
//     const isNewUser = users.find(user => user.socketId === socket.id) === undefined

//     if (isNewUser && !usernameTaken) {
//       const user = await createNewUser({
//         username,
//         socketID: socket.id,
//         email,
//         password,
//       })
//       io.emit('user-active', {
//         username: user.username,
//         socketId: user.socketId,
//         active: user.active,
//         email: user.email,
//         id: user.id
//       })
//     }

//     if (usernameTaken) {
//       const socketId = users.find(user => user.username === username).socketId

//       if (socketId) {
//         if (socketId !== socket.id) {
//           await prisma.user.update({
//             where: {
//               username
//             },
//             data: {
//               socketId: socket.id,
//               active: true
//             }
//           })

//           io.emit('update-socket-id', {
//             oldSocketId: socketId,
//             newSocketId: socket.id
//           })
//         }

//         io.emit('get-socket-id', socket.id)
//       }
//     }
//   })

//   socket.on('user-inactive', async (socketId) => {
//     const socketIdExists = await prisma.user.findUnique({
//       where: {
//         socketId
//       }
//     })

//     if (socketIdExists) {
//       await prisma.user.update({
//         where: {
//           socketId
//         },
//         data: {
//           active: false
//         }
//       })

//       io.emit('user-inactive', socketId)
//     }
//   })

//   socket.on('notification', async ({
//     username,
//     room,
//     member1,
//     member2
//   }) => {
//     const user = await prisma.user.findUnique({
//       where: {
//         username
//       }
//     })

//     if (user) {
//       io.to(`${member1}-${member2}`).emit('notification', {
//         title: 'New message',
//         body: `
//         ${username} has sent a new message
//       `
//       })
//     }
//   })

//   socket.on('message', async ({
//     member1,
//     member2,
//     message,
//     username,
//     userId
//   }) => {
//     await prisma.message.create({
//       data: {
//         content: message,
//         sender_id: userId,
//         conversation_id: `${member1}-${member2}`,
//       }
//     }).then(() => {
//       io.to(`${member1}-${member2}`).emit('message', {
//         room:`${member1}-${member2}`,
//         message,
//         username
//       })
//       io.emit('notification', {
//         title: 'New message',
//         body: `${username} has sent a new message`
//       })
//     }).catch((error) => {
//       console.error(error)
//     })
//   })

//   socket.on('disconnect', async () => {
//     const socketIdExists = await prisma.user.findUnique({
//       where: {
//         socketId: socket.id
//       }
//     })

//     if (socketIdExists) {
//       await prisma.user.update({
//         where: {
//           socketId: socket.id
//         },
//         data: {
//           active: false
//         }
//       })

//       io.emit('user-inactive', socket.id)
//     }
//   })
// })

// app.get('/:conversationID/messages', async (req, res) => {
//   const {
//     conversationID
//   } = req.params
  
//   const messages = await prisma.conversation.findUnique({
//     where: {
//       id: conversationID
//     },
//     include: {
//       messages: {
//         select: {
//           id: true,
//           content: true,
//           sender_id: true,
//         }
//       }
//     }
//   })

//   res.json(messages)
// });

// app.get('/users', async (req, res) => {
//   const users = await prisma.user.findMany()
//   res.json(users)
// });

// app.post('/login', async (req, res) => {
//   const {
//     username,
//     password,
//     email
//   } = req.body
//   const usernameTaken = await prisma.user.findUnique({
//     where: {
//       email
//     }
//   })

//   if (!usernameTaken) {
//     await prisma.user.create({
//       data: {
//         username,
//         id: uuidv4(),
//         password: bcrypt.hashSync(password, 10),
//         email
//       }
//     })
//   }

//   const users = await prisma.user.findMany()

//   res.json(users)
// })

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})