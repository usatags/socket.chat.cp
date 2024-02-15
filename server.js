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
const jsonData = require('./automaticMessages.json')

dotenv.config()
const port = process.env.PORT || 3000

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter })

const base = "https://api-m.sandbox.paypal.com";
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
  const users = await prisma.user.findMany()
  return users || []
}

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

// const lastAutoMessages = []
const regexForVIN = /^[a-zA-Z0-9]{9}[a-zA-Z0-9-]{2}[0-9]{6}$/
const regexForEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
const regexForName = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/u
const regexForAddress = /^[a-zA-Z0-9\s,.'-]+$/
const regexForCity = /^([a-zA-Z\u0080-\u024F]+(?:. |-| |'))*[a-zA-Z\u0080-\u024F]*$/
const regexForZip = /^[0-9]{5}(?:-[0-9]{4})?$/
const regexForNumber = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/
const regexForDriverLicense = /(\.jpg|\.jpeg|\.png|\.webp|\.pdf|\.ai)$/i;

io.on('connection', (socket) => {
  console.log('User connected', socket.id)
  socket.on('room', async (roomID) => {
    const room = await findRoomByID(roomID)

    if (room) {
      socket.join(roomID)
    }
  })

  socket.on('user-active', async (userID) => {
    const user = await findUserByID(userID)

    if (user) {
      await prisma.user.update({
        where: {
          id: userID
        },
        data: {
          socketId: socket.id,
          active: true
        }
      })

      io.emit(`user-active-${user.id}`, {
        id: user.id,
        socketId: socket.id,
      })
      io.emit('user-active', {
        id: user.id,
        socketId: socket.id,
      })
    }
  })

  socket.on('user-inactive', async ({
    userID,
    socketID
  }) => {
    const user = await findUserByID(userID)

    if (user) {
      await prisma.user.update({
        where: {
          id: userID
        },
        data: {
          active: false
        }
      })

      io.emit('user-inactive', {
        id: user.id,
        socketId: socketID,
      })
    }
  })

  socket.on('message', async (message) => {
    const {
      content,
      sender_id,
      conversation_id,
      content_type
    } = message

    const members = await prisma.conversation.findUnique({
      where: {
        id: conversation_id
      },
      select: {
        members: true
      }
    })
  
    const noSender = members.members.filter(member => member.id !== sender_id)
    const sender = members.members.filter(member => member.id === sender_id)

 
    
    const newMessage = await prisma.message.create({
      data: {
        content,
        sender_id,
        conversation_id,
        content_type,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    })
  
    
    io.to(conversation_id).emit('message', {
      data: newMessage,
    })

    const conversationPurchases = await prisma.conversation.findUnique({
      where: {
        id: conversation_id
      },
      include: {
        purchases: {
          select: {
            id: true,
            color: true,
            vin: true,
            continuePurchase: true,
            details: true,
            email: true,
            state: true,
            completed: true,
            cancelled: true,
            options: true,
            name: true,
            lastName: true,
            address: true,
            city: true,
            houseType: true,
            zip: true,
            phone: true,
            driverLicense: true,
            hasVehicleInSurance: true,
            vehicleInsurance: true,
            failedTries: true,
            isTruck: true,
            wantToGetVehicleInsurance: true,
            conversation_id: true,
            total: true,
            image: true,
            user: {
              select: {
                id: true,
                admin: true,
              }
            },
          }
        }
      }
    })

    const findPurchasesUnCompleted = conversationPurchases.purchases.filter(purchase => !purchase.completed)

    if (findPurchasesUnCompleted.length && !sender[0].admin) {
      const findByConversationID = findPurchasesUnCompleted.find(purchase => purchase.conversation_id === conversation_id)

      if (!findByConversationID.completed && !findByConversationID.cancelled) {
        if (!findByConversationID.details.length) {
          const splittedOptions = findByConversationID.options.split('\n')

          if (Number(content) && Number(content) <= splittedOptions.length) {
            const splittedOption = splittedOptions[Number(content) - 1].split(' ')
            const optionTotal = splittedOption[splittedOption.length - 1].split('$')[0]

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                details: splittedOptions[Number(content) - 1].slice(3),
                total : Number(optionTotal)
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type 'yes if your vehicle is a truck or 'no' if it's not.\nREMEMBER: The truck has a fee of $20`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/vin"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid option. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.isTruck.length) {
          if (content === 'yes') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                isTruck: 'true',
                details: findByConversationID.details + ' + 20$ for truck fee.',
                total: findByConversationID.total + 20
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your name to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/name"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else if (content === 'no') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                isTruck: 'false'
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your name to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/name"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid option. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.name.length) {
          if (regexForName.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                name: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your last name to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/lastName"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid name. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/name"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.lastName.length) {
          if (regexForName.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                lastName: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your address to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/address"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid last name. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/lastName"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.address.length) {
          if (regexForAddress.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                address: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your city to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/city"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid address. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/address"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.city.length) {
          if (regexForCity.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                city: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your house type to continue:\n\n1) House\n2) Apartment\n3) Condo\n4) Townhouse\n5) Other`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/state"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid city. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/city"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.houseType.length) {
          const houseTypes = ['house', 'apartment', 'condo', 'townhouse', 'other']

          if ((Number(content) && houseTypes[Number(content) - 1]) || houseTypes.includes(content.toLowerCase())) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                houseType: Number(content) ? houseTypes[Number(content) - 1] : content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your zip code to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/zip"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid house type. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/houseType"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }

        } else if (!findByConversationID.zip.length) {
          if (regexForZip.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                zip: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your phone number to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/phone"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid zip code. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/zip"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.phone.length) {
          if (regexForNumber.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                phone: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type your VIN number to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/driverLicense"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })

              io.to(conversation_id).emit('message', {
                data: newMessage,
              })

              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid phone number. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/phone"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })

            io.to(conversation_id).emit('message', {
              data: newMessage,
            })

            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.vin.length) {
          if (regexForVIN.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                vin: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Select your car color:\n\n1) Black\n2) White\n3) Gray\n4) Blue\n5) Silver\n6) Red\n7) Green\n8) Gold\n9) Brown\n10) Orange\n11) Beige\n12) Purple\n13) Yellow`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/color"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid VIN number. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/vin"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.color.length) {
          const colors = ['black', 'white', 'gray', 'blue', 'silver', 'red', 'green', 'gold', 'brown', 'orange', 'beige', 'purple', 'yellow', 'other']

          if ((Number(content) && colors[Number(content) - 1]) || colors.includes(content.toLowerCase())) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                color: Number(content) ? colors[Number(content) - 1] : content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Enter your email to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/email"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid color. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/color"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.email.length) {
          if (regexForEmail.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                email: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please add a photo of pdf of your driver's license to continue:`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/success"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid email. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/email"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.driverLicense.length) {
          if ((content_type.includes('image') || content_type.includes('pdf')) && regexForDriverLicense.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                driverLicense: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type 'yes' if you have an insurance for your vehicle or 'no' if you don't have one.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/insurance"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid driver's license. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/driverLicense"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.hasVehicleInSurance.length) {
          if (content.toLowerCase() === 'yes') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                hasVehicleInSurance: 'yes',
                wantToGetVehicleInsurance: 'no'
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please send a photo or pdf of your vehicle insurance details.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/confirm"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else if (content.toLowerCase() === 'no') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                hasVehicleInSurance: 'no'
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type 'yes' if you want to get a vehicle insurance with us or 'no' if you don't want to get one.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/continue"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else  {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/insurance"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.vehicleInsurance.length &&  findByConversationID.hasVehicleInSurance === 'yes' && findByConversationID.wantToGetVehicleInsurance === 'no') {
          if ((content_type.includes('image') || content_type.includes('pdf')) && regexForDriverLicense.test(content)) {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                vehicleInsurance: content
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type 'yes' if you want to continue with the purchase or 'no' if you want to cancel it.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/confirm"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid vehicle insurance. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/insurance"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
        } else if (!findByConversationID.wantToGetVehicleInsurance.length) {
          if (content.toLowerCase() === 'yes') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                wantToGetVehicleInsurance: 'yes'
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `We are going to contact you soon to get your insurance details.\n\nPlease type 'yes' if you want to continue with the purchase or 'no' if you want to cancel it.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/insuranceDetails"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else if (content.toLowerCase() === 'no') {
            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                wantToGetVehicleInsurance: 'no'
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Please type 'yes' if you want to continue with the purchase or 'no' if you want to cancel it.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/confirm"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          } else {
            if (findByConversationID.failedTries >= 3) {
              await prisma.purchase.update({
                where: {
                  id: findByConversationID.id
                },
                data: {
                  cancelled: true,
                  completed: true
                }
              })

              const newMessage = await prisma.message.create({
                data: {
                  content: `Your request has been cancelled.`,
                  sender_id: noSender[0].id,
                  conversation_id,
                  content_type: "text/auto/plates/success/cancelled"
                },
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    }
                  }
                }
              })
  
              io.to(conversation_id).emit('message', {
                data: newMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                title: 'New message',
                body: `
                    ${sender[0].username} has sent a new message
                    `
              })

              return;
            }

            await prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                failedTries: findByConversationID.failedTries + 1
              }
            })

            const newMessage = await prisma.message.create({
              data: {
                content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
                sender_id: noSender[0].id,
                conversation_id,
                content_type: "text/auto/plates/insurance"
              },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            })
  
            io.to(conversation_id).emit('message', {
              data: newMessage,
            })
  
            io.emit(`notification-${noSender[0].id}`, {
              title: 'New message',
              body: `
                  ${sender[0].username} has sent a new message
                  `
            })
          }
  
          return;
        } else if (content.toLowerCase() === 'yes') {
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              completed: true,
            }
          })

          const newMessage = await prisma.message.create({
            data: {
              // content: `Your request has been submitted successfully. You will receive an email with the details soon.\n\nHere are your details:\n\nDetails: ${findByConversationID.details}\nState: ${findByConversationID.state}\nCity: ${findByConversationID.city}\nHouse type: ${findByConversationID.houseType}\nZip: ${findByConversationID.zip}\nPhone: ${findByConversationID.phone}\nVIN: ${findByConversationID.vin}\nColor: ${findByConversationID.color}\nEmail: ${findByConversationID.email}\n\n`,
              content: `Your request has been submitted successfully. To continue with the purchase, please press a button below.\n\n<button class="go-to-pay" aria-product-id=${findByConversationID.id}>Go to payment</button>\n\n<button class="go-to-whatsapp">Go to WhatsApp</button>\n\n<butoon class="ask-for-help">Ask for help</button>`,
              sender_id: noSender[0].id,
              conversation_id,
              content_type: "text/auto/plates/success/confirmed"
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                }
              }
            }
          })
  
          io.to(conversation_id).emit('message', {
            data: newMessage,
          })
  
          io.emit(`notification-${noSender[0].id}`, {
            title: 'New message',
            body: `
                ${sender[0].username} has sent a new message
                `
          })
        } else if (content.toLowerCase() === 'no') {
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              completed: true,
              cancelled: true
            }
          })

          const newMessage = await prisma.message.create({
            data: {
              content: `Your request has been cancelled.`,
              sender_id: noSender[0].id,
              conversation_id,
              content_type: "text/auto/plates/success/cancelled"
            },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                }
              }
            }
          })
  
          io.to(conversation_id).emit('message', {
            data: newMessage,
          })
  
          io.emit(`notification-${noSender[0].id}`, {
            title: 'New message',
            body: `
                ${sender[0].username} has sent a new message
                `
          })
        }

        return;
      }
    }
  
    let found = false;
  
    jsonData.states.forEach(async (state) => {
      if (!Number.isInteger(Number(content)) || Number(content) < 0) return;
      if (state.id.toLowerCase() === content.toLowerCase()) {
          found = true;
  
          if (!sender[0].admin) {

              // const lastAutoMessage = lastAutoMessages.find((message) => message.conversation_id === conversation_id)

              // if (lastAutoMessage) {
              //   lastAutoMessage.formData.state = state.state
              // } else {
              //   lastAutoMessages.push({
              //     conversation_id,
              //     lastMessage: '',
              //     formData: {
              //       vin: '',
              //       color: '',
              //       email: '',
              //       state: state.state,
              //       plateDetails: ''
              //     }
              //   })
              // }

              const purchaseExists = findPurchasesUnCompleted.find(purchase => purchase.state === state.state && conversation_id === purchase.conversation_id && !purchase.completed && !purchase.cancelled)

              // console.log('Purchase exists', purchaseExists)

              if (purchaseExists) {
                const newMessage = await prisma.message.create({
                  data: {
                    content: `You have already a purchase in progress for the state of ${state.state}. Please complete it or cancel it.`,
                    sender_id: noSender[0].id,
                    conversation_id,
                    content_type: "text/auto/plates/purchaseExists/continue"
                  },
                  include: {
                    sender: {
                      select: {
                        id: true,
                        username: true,
                      }
                    }
                  }
                })

                io.to(conversation_id).emit('message', {
                  data: newMessage,
                })

                io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })

                return;

              } else {
                await prisma.purchase.create({
                  data: {
                    vin: '',
                    color: '',
                    email: '',
                    details: '',
                    continuePurchase: true,
                    state: state.state,
                    conversation_id,
                    user_id: sender[0].id,
                    completed: false,
                    id: uuidv4(),
                    options: state.plates,
                    address: '',
                    city: '',
                    zip: '',
                    phone: '',
                    driverLicense: '',
                    vehicleInsurance: '',
                    failedTries: 0,
                    cancelled: false,
                    houseType: '',
                    lastName: '',
                    name: '',
                    hasVehicleInSurance: '',
                    wantToGetVehicleInsurance: '',
                    isTruck: '',
                    total: 0,
                    image: `${state.id}-${state.state}.webp`
                  }
                })
              }

              const autoMessage = await prisma.message.create({
                data: {
                    content: 'For the state of ' + state.state + ':\n\n' + state.plates,
                    sender_id: noSender[0].id,
                    conversation_id,
                    content_type: "text/auto/plates"
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                        }
                    }
                }
            })
  
              io.to(conversation_id).emit('message', {
                  data: autoMessage,
              })
  
              io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
              })
          }
      }
  })
  
  if (!sender[0].admin && !found && Number.isInteger(Number(content))) {
      const autoMessage = await prisma.message.create({
          data: {
              content: `${content} is not an available state. Please try again.`,
              sender_id: noSender[0].id,
              conversation_id,
              content_type: "text/auto/invalid"
          },
          include: {
              sender: {
                  select: {
                      id: true,
                      username: true,
                  }
              }
          }
      })
      io.to(conversation_id).emit('message', {
          data: autoMessage,
      })
  }
  
  io.emit(`notification-${noSender[0].id}`, {
      title: 'New message',
      body: `
          ${sender[0].username} has sent a new message
        `
  })
  
  })

  socket.on('disconnect', async () => {
    const allUsers = await findAllUsers()
    const socketIdExists = allUsers.find(user => user.socketId === socket.id)

    console.log('User disconnected', socket.id)

    if (socketIdExists) {
      await prisma.user.update({
        where: {
          id: socketIdExists.id
        },
        data: {
          active: false
        }
      })

      io.emit('user-inactive', {
        id: socketIdExists.id,
        socketId: socket.id,
      })
    }
  })
})

app.get('/users/:roleFilter', async (req, res) => {
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
});

app.post('/login', async (req, res) => {
  const {
    password,
    email
  } = req.body
  try {
    //TODO
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
  
    res.status(200).json({
      data: usernameTaken,
      message: 'User logged in successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from login', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/register', async (req, res) => {
  try {
    const body = req.body
    const { username, email, password, phone_number, image } = body

    if (!username || !email || !password || !phone_number || !image) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const userExists = await findUserByEmail(email)

    if (userExists) {
      return res.status(201).json({
        data: userExists,
        message: 'User already exists',
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

    res.status(201).json({
      data: user,
      message: 'User created successfully',
      success: true
    })
  } catch (error) {
    console.log('Errof from register', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/room/:roomID/messages', async (req, res) => {
  const { roomID } = req.params
  const splitRoomID = roomID.split('+')

  try {
    const room = await prisma.conversation.findUnique({
      where: {
        id: roomID
      },
      include: {
        messages: {
          select: {
            id: true,
            content: true,
            content_type: true,
            sender: {
              select: {
                id: true,
                username: true,
                image: true,
                phone_number: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!room) {
      let adminID = ''
      
      const user1 = await findUserByID(splitRoomID[0])

      if (user1.admin) {
        adminID = splitRoomID[0]
      } else {
        adminID = splitRoomID[1]
      }

      const newRoom = await prisma.conversation.create({
        data: {
          id: roomID,
          members: {
            connect: [
              {
                id: splitRoomID[0]
              },
              {
                id: splitRoomID[1]
              }
            ]
          }
        }, include: {
          messages: {
            select: {
              id: true,
              content: true,
              content_type: true,
              sender: {
                select: {
                  id: true,
                  username: true,
                  image: true,
                  phone_number: true,
                  email: true
                }
              }
            }
          }
        }
      })

      await prisma.message.create({
        data: {
          content: jsonData.salute,
          sender_id: adminID,
          conversation_id: roomID,
          content_type: "text"
        },
      })

      console.log('New room', newRoom)

      return res.status(200).json({
        data: newRoom,
        message: 'Messages fetched successfully',
        success: true
      })
    }

    return res.status(200).json({
      data: room,
      message: 'Messages fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from room/:roomID/messages', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// app.get('/createAdmin', async (req, res) => {
//   try {
//     const admin = await prisma.user.create({
//       data: {
//         username: 'admin',
//         active: true,
//         id: uuidv4(),
//         password: bcrypt.hashSync('admin1234', 10),
//         email: 'admin@gmail.com',
//         image: '',
//         phone_number: '123456789',
//         admin: true
//       }
//     })

//     res.status(201).json({
//       data: admin,
//       message: 'Admin created successfully',
//       success: true
//     })

//   } catch (error) {
//     console.log('Error from createAdmin', error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
      
// })


// app.get('/createTestingUsers', async (req, res) => {
//   try {
//     const password = bcrypt.hashSync('user1234', 10)
//     for (let i = 0; i < 3; i++) {
//       await prisma.user.create({
//         data: {
//           username: `user ${1}`,
//           active: true,
//           id: uuidv4(),
//           password: password,
//           email: 'user' + i + '@gmail.com',
//           image: '',
//           phone_number: '123456789',
//           admin: false,
//         }        
//       })
//     }

//     res.status(201).json({
//       message: 'Testing users created successfully',
//     })
//   } catch (error) {
//     console.log('Error from createTestingUsers', error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// })

app.get('/changeIDS', async (req, res) => {
  try {
    const generatedIDS = []
    for (let i = 0; i < 4; i++) {
      generatedIDS.push(uuidv4())
    }

    return res.status(200).json({
      data: generatedIDS,
      message: 'IDS generated successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from changeIDS', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// app.get('/clearDatabase', async (req, res) => {
//   try {
//     await prisma.conversation.deleteMany()

//     res.status(200).json({
//       message: 'Database cleared successfully',
//       success: true
//     })
//   } catch (error) {
//     console.log('Error from clearDatabase', error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// })

app.get('/products', async (req, res) => {
  try {
    const products = jsonData.states

    return res.status(200).json({
      data: products,
      message: 'Products fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from products', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany()

    return res.status(200).json({
      data: purchases,
      message: 'Purchases fetched successfully',
      success: true
    })    
  } catch (error) {
    console.log('Error from purchaseByState', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/purchase/:id', async (req, res) => {
  const { id } = req.params
  try {
    const purchase = await prisma.purchase.findUnique({
      where: {
        id
      }
    })

    return res.status(200).json({
      data: purchase,
      message: 'Purchase fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from Purchase/:id', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/createPurchase", async (req, res) => {
  const {
    vin,
    color,
    email,
    state,
    city,
    houseType,
    zip,
    phone,
    conversation_id,
    user_id,
    image,
    lastName,
    name,
    isTruck,
    total
  } = req.body

  try {
    const purchase = await prisma.purchase.create({
      data: {
        vin,
        color,
        email,
        state,
        city,
        houseType,
        zip,
        phone,
        conversation_id,
        user_id,
        image,
        lastName,
        name,
        isTruck,
        total,
        id: uuidv4(),
        completed: false,
        options: '',
        address: '',
        driverLicense: '',
        vehicleInsurance: '',
        failedTries: 0,
        cancelled: false,
        hasVehicleInSurance: '',
        wantToGetVehicleInsurance: '',
      }
    })

    res.status(201).json({
      data: purchase,
      message: 'Purchase created successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from createPurchase', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PayPal API
const generateAccessToken = async () => {
  try {
    console.log(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new Error("MISSING_API_CREDENTIALS");
    }
    const auth = Buffer.from(
      process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET,
    ).toString("base64");
    const response = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Failed to generate Access Token:", error);
  }
};

const generateClientToken = async () => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v1/identity/generate-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": "en_US",
      "Content-Type": "application/json",
    },
  });

  return handleResponse(response);
};


const createOrder = async (cart) => {
  // use the cart information passed from the front-end to calculate the purchase unit details
  console.log(
    "shopping cart information passed from the frontend createOrder() callback:",
    cart,
  );

  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: "100.00",
        },
      },
    ],
  };

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
};

const captureOrder = async (orderID) => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderID}/capture`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
      // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
      // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
      // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
    },
  });

  return handleResponse(response);
};

async function handleResponse(response) {
  try {
    const jsonResponse = await response.json();
    return {
      jsonResponse,
      httpStatusCode: response.status,
    };
  } catch (err) {
    const errorMessage = await response.text();
    throw new Error(errorMessage);
  }
}

app.post("/api/token", async (req, res) => {
  try {
    const { jsonResponse, httpStatusCode } = await generateClientToken();
    console.log("Client Token:", jsonResponse, httpStatusCode);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    res.status(500).send({ error: "Failed to generate client token." });
  }
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})