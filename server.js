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
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const paypal = require("@paypal/checkout-server-sdk")

dotenv.config()
const port = process.env.PORT || 3000

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter })

// const base = "https://api-m.sandbox.paypal.com";
const base = "https://www.paypal.com";
// const paypalEnvironment = new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
const paypalEnvironment = new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)

const paypalClientWithRefreshToken = new paypal.core.PayPalHttpClient(paypalEnvironment)

const app = express()

app.use(cors({
  origin: "*",
  credentials: true
}))
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


app.use(cookieParser())
app.use(function(req, res, next) {

  const allowedOrigins =  "*";
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept", "Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

app.use((err, req, res, next) => {
  if (err.code === "ECONNRESET") {
    console.error('Connection reset error', err);
    res.status(500).send('Connection was reset, please try again.');
  } else {
    next(err)
  }
})

const server = Server(app)

const io = socket(server, {
  cors: {
    // origin: [ 'https://usadealerplates.us', 'https://usatag.us', 'https://systemdmvusa.com', 'https://ga.systemdmvusa.com', 'https://ab.systemdmvusa.com', 'https://az.systemdmvusa.com', 'https://ca.systemdmvusa.com', 'https://co.systemdmvusa.com', 'https://ct.systemdmvusa.com', 'https://de.systemdmvusa.com', 'https://fl.systemdmvusa.com', 'https://il.systemdmvusa.com', 'https://in.systemdmvusa.com', 'https://ia.systemdmvusa.com', 'https://ks.systemdmvusa.com', 'https://ky.systemdmvusa.com', 'https://la.systemdmvusa.com', 'https://md.systemdmvusa.com', 'https://ma.systemdmvusa.com', 'https://https://mi.systemdmvusa.com', 'https://mn.systemdmvusa.com', 'https://mo.systemdmvusa.com', 'https://mt.systemdmvusa.com', 'https://nv.systemdmvusa.com', 'https://nj.systemdmvusa.com', 'https://nm.systemdmvusa.com', 'https://nc.systemdmvusa.com', 'https://nd.systemdmvusa.com', 'https://oh.systemdmvusa.com', 'https://ok.systemdmvusa.com', 'https://or.systemdmvusa.com', 'https://pa.systemdmvusa.com', 'https://ri.systemdmvusa.com', 'https://sc.systemdmvusa.com', 'https://tn.systemdmvusa.com', 'https://tx.systemdmvusa.com', 'https://ut.systemdmvusa.com', 'https://vt.systemdmvusa.com', 'https://va.systemdmvusa.com', 'https://wa.systemdmvusa.com', 'https://wv.systemdmvusa.com', 'https://wi.systemdmvusa.com', 'https://wy.systemdmvusa.com', 'https://geico.systemdmvusa.com', 'https://allstate.systemdmvusa.com', 'https://statefarm.systemdmvusa.com', 'https://progressive.systemdmvusa.com'],
    origin: "*",
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
 try {
  const room = await prisma.conversation.findUnique({
    where: {
      id
    }
  })
  return room || null
 } catch (error) {
  return null
 }
}

const findOtherUserOnConversation = async (conversationID, userID) => {
  try {
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
  } catch (error) {
    return null
  }
}

// const lastAutoMessages = []
const regexForVIN = /^[a-zA-Z0-9]{17}$/;
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
 try {
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

  let conversationPurchases;
  
  conversationPurchases = await prisma.conversation.findUnique({
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
          vehicleType: true,
          buyingType: true,
          insuranceType: true,
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

  if (!conversationPurchases.purchases.length) {
    await prisma.purchase.create({
      data: {
        vin: '',
        color: '',
        email: '',
        details: '',
        continuePurchase: true,
        // state: state.state,
        state: '',
        conversation_id,
        user_id: sender[0].id,
        completed: false,
        id: uuidv4(),
        // options: state.plates,
        options: '',
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
        // image: `${state.id}-${state.state}.webp`,
        image: '',
        vehicleType: '',
        buyingType: '',
        paypalPaymentId: '',
        insuranceType: '',
      },
    })

    conversationPurchases = await prisma.conversation.findUnique({
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
            vehicleType: true,
            buyingType: true,
            insuranceType: true,
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
  }

  const findPurchasesUnCompleted = conversationPurchases.purchases ? conversationPurchases.purchases.filter(purchase => !purchase.completed && !purchase.cancelled) : []

  if (findPurchasesUnCompleted.length && !sender[0].admin) {
    const findByConversationID = findPurchasesUnCompleted.find(purchase => purchase.conversation_id === conversation_id)

    if (!findByConversationID.completed && !findByConversationID.cancelled) {
      if (!findByConversationID.buyingType?.length) {
        if (Number(content) === 1) {
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              buyingType: 'temporary'
            }
          })

          const newMessage = await prisma.message.create({
            data: {
              content: jsonData.plates,
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

        } else if (Number(content) === 2) {
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              buyingType: 'insurance'
            }
          })

          const newMessage = await prisma.message.create({
            data: {
              content: jsonData.plates,
              sender_id: noSender[0].id,
              conversation_id,
              content_type: "text/auto/insurance"
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid option. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          // io.to(conversation_id).emit('message', {
          //   data: newMessage,
          // })

          // io.emit(`notification-${noSender[0].id}`, {
          //   title: 'New message',
          //   body: `
          //       ${sender[0].username} has sent a new message
          //       `
          // })
        }
      } else if (!findByConversationID.state?.length) {

const allStates = [
  'Alabama',        'Arizona',        'Arkansas',
  'California',     'Colorado',       'Connecticut',
  'Delaware',       'Florida',        'Georgia',
  'Illinois',       'Indiana',        'Iowa',
  'Kansas',         'Kentucky',       'Louisiana',
  'Maryland',       'Massachusetts',  'Michigan',
  'Minnesota',      'Missouri',       'Montana',
  'Nevada',         'New Jersey',     'New Mexico',
  'North Carolina', 'North Dakota',   'Ohio',
  'Oklahoma',       'Oregon',         'Pennsylvania',
  'Rhode Island',   'South Carolina', 'Tennessee',
  'Texas',          'Utah',           'Vermont',
  'Virginia',       'Washington',     'West Virginia',
  'Wisconsin',      'Wyoming'
]

if ((Number(content) && allStates[Number(content) - 1]) || allStates.includes(content.toLowerCase())) {
  const state = allStates[Number(content) - 1] || content

  if (!sender[0].admin) {
    const purchaseExists = findPurchasesUnCompleted.find(purchase => conversation_id === purchase.conversation_id && !purchase.completed && !purchase.cancelled)
    const statesData = Number(content) ? jsonData.states.find(state => state.state === allStates[Number(content) - 1]) : jsonData.states.find(state => state.state === content)
    const options = statesData.plates.split('\n').map((option, index) => `${option}`).join('\n')

    if (purchaseExists) {
      console.log('Purchase exists')
      await prisma.purchase.update({
        where: {
          id: findByConversationID.id
        },
        data: {
          state,
          options: statesData.plates,
          image: `${statesData.id}-${state}.webp`,
        }
      })
    }

    const autoMessage = await prisma.message.create({
      data: {
        content: 'For the state of ' + state + ':\n\n' + options,
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
      } else if (!findByConversationID.details?.length) {
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
              content: `Enter your vehicle type to continue:\n\n1) Car\n2) Truck(+20$)\n3) Van\n4) Motorcycle\n5) Bus(+20$)\n6) SUV (Sport Utility Vehicle)\n7) Tractor\n8) Trailer(+20$)\n9) RV (Recreational Vehicle)`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid option. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid option. Please try again. Remember to type the number of the option you want to select.`,
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
      } else if (!findByConversationID.vehicleType.length) {
        if (content.includes('2') || content.toLowerCase().includes('truck') || content.toLowerCase().includes('8') || content.toLowerCase().includes('trailer') || content.toLowerCase().includes('bus') || content.toLowerCase().includes('5')) {
          const vehicleTypes = ['truck', 'bus', 'trailer']
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              isTruck: 'true',
              details: findByConversationID.details,
              total: findByConversationID.total + 20,
              vehicleType: Number(content) ? vehicleTypes[Number(content) - 1] : content
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
        } else if (content.includes('1') || content.toLowerCase().includes('car') || content.includes('3') || content.toLowerCase().includes('van') || content.includes('4') || content.toLowerCase().includes('motorcycle') || content.includes('6') || content.toLowerCase().includes('suv') || content.includes('7') || content.toLowerCase().includes('tractor') || content.toLowerCase().includes('rv') || content.toLowerCase().includes('9')) {
          const vehicleTypes = ['car', 'van', 'motorcycle', 'suv', 'tractor', 'rv']
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              isTruck: 'false',
              details: findByConversationID.details,
              total: findByConversationID.total,
              vehicleType: Number(content) ? vehicleTypes[Number(content) - 1] : content
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid option. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid option. Please try again. Remember to type the number of the option you want to select.`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid name. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/name"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid name. Please try again. Remember that the name should only contain letters and this special characters (. , ' -).`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid last name. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/lastName"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid last name. Please try again. Remember that the last name should only contain letters and this special characters (. , ' -).`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid address. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/address"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid address. Please try again. Remember that the address should only contain letters, numbers and this special characters (. , ' -).`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid city. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/city"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid city. Please try again. Remember that the city should only contain letters.`,
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
      } else if (!findByConversationID.houseType?.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid house type. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/houseType"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid house type. Please try again. Remember to type the number of the option you want to select.`,
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

      } else if (!findByConversationID.zip?.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid zip code. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/zip"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid zip code. Please try again. Remember that the zip code should only contain numbers and should be 5 digits long.`,
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
      } else if (!findByConversationID.phone?.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid phone number. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/phone"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid phone number. Please try again. Remember that the phone number should only contain numbers and should be 10 digits long.`,
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
      } else if (!findByConversationID.vin?.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid VIN number. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/vin"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })

          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid VIN number. Please try again. Remember that the VIN number should be 17 characters long.`,
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
      } else if (!findByConversationID.color?.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid color. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/color"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid color. Please try again. Remember to type the number of the option you want to select.`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid email. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/email"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid email. Please try again. Remember that the email should be in the correct format.`,
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

          if (findByConversationID.buyingType.includes('temporary')) {
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
          } else if (findByConversationID.buyingType.includes('insurance')) {
            const newMessage = await prisma.message.create({
              data: {
                content: `We are going to contact you soon to get your insurance details.\n\nPlease select the insurance provider you want to use:\n\n1) Geico\n2) Progressive\n3) State Farm\n4) Allstate`,
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

            prisma.purchase.update({
              where: {
                id: findByConversationID.id
              },
              data: {
                wantToGetVehicleInsurance: 'yes'
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
          return 
        } else {
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid driver's license. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/driverLicense"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid driver's license. Please try again. Remember to add a photo or pdf of your driver's license. if you have any issues, please contact us at +1 (956) 696-7960`,
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
      } else if (findByConversationID.buyingType.includes('temporary') &&!findByConversationID.hasVehicleInSurance.length) {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/insurance"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid input. Please try again. Remember to type 'yes' if you have an insurance for your vehicle or 'no' if you don't have one.`,
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
      } else if (findByConversationID.buyingType.includes('temporary') && !findByConversationID.vehicleInsurance.length &&  findByConversationID.hasVehicleInSurance === 'yes' && findByConversationID.wantToGetVehicleInsurance === 'no') {
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid vehicle insurance. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/insurance"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid vehicle insurance. Please try again. Remember to add a photo or pdf of your vehicle insurance details. if you have any issues, please contact us at +1 (956) 696-7960`,
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
      } else if (findByConversationID.buyingType.includes('temporary') && !findByConversationID.wantToGetVehicleInsurance.length) {
        if (content.toLowerCase() === 'yes') {
          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              wantToGetVehicleInsurance: 'yes',
            }
          })

          const newMessage = await prisma.message.create({
            data: {
              content: `We are going to contact you soon to get your insurance details.\n\nPlease select the insurance provider you want to use:\n\n1) Geico\n2) Progressive\n3) State Farm\n4) Allstate`,
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/insurance"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid input. Please try again. Remember to type 'yes' if you want to get a vehicle insurance with us or 'no' if you don't want to get one.`,
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
      } else if (!findByConversationID.insuranceType?.length && findByConversationID.wantToGetVehicleInsurance && findByConversationID.wantToGetVehicleInsurance === 'yes' && findByConversationID.buyingType.includes('temporary')) {
        if (Number(content) && Number(content) <= 4) {
          const insuranceProviders = ['Geico', 'Progressive', 'State Farm', 'Allstate']

          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              insuranceType: insuranceProviders[Number(content) - 1]
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/insuranceDetails"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid input. Please try again. Remember to type the number of the insurance provider you want to use.`,
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

          return;
        }
      } else if (findByConversationID.buyingType.includes('insurance') && !findByConversationID.insuranceType?.length) {
        if (Number(content) && Number(content) <= 4) {
          const insuranceProviders = ['Geico', 'Progressive', 'State Farm', 'Allstate']

          await prisma.purchase.update({
            where: {
              id: findByConversationID.id
            },
            data: {
              insuranceType: insuranceProviders[Number(content) - 1]
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
          // if (findByConversationID.failedTries >= 3) {
          //   await prisma.purchase.update({
          //     where: {
          //       id: findByConversationID.id
          //     },
          //     data: {
          //       cancelled: true,
          //       completed: true
          //     }
          //   })

          //   const newMessage = await prisma.message.create({
          //     data: {
          //       content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
          //       sender_id: noSender[0].id,
          //       conversation_id,
          //       content_type: "text/auto/plates/success/cancelled"
          //     },
          //     include: {
          //       sender: {
          //         select: {
          //           id: true,
          //           username: true,
          //         }
          //       }
          //     }
          //   })

          //   io.to(conversation_id).emit('message', {
          //     data: newMessage,
          //   })

          //   io.emit(`notification-${noSender[0].id}`, {
          //     title: 'New message',
          //     body: `
          //         ${sender[0].username} has sent a new message
          //         `
          //   })

          //   return;
          // }

          // await prisma.purchase.update({
          //   where: {
          //     id: findByConversationID.id
          //   },
          //   data: {
          //     failedTries: findByConversationID.failedTries + 1
          //   }
          // })

          // const newMessage = await prisma.message.create({
          //   data: {
          //     content: `Invalid input. Please try again. You have ${3 - findByConversationID.failedTries} tries left.`,
          //     sender_id: noSender[0].id,
          //     conversation_id,
          //     content_type: "text/auto/plates/insuranceDetails"
          //   },
          //   include: {
          //     sender: {
          //       select: {
          //         id: true,
          //         username: true,
          //       }
          //     }
          //   }
          // })
          const newMessage = await prisma.message.create({
            data: {
              content: `Invalid input. Please try again. Remember to type the number of the insurance provider you want to use.`,
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

          return;
        }
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

        const menuMessage = await prisma.message.create({
          data: {
            content: "If you want to purchase another product, please type the number of the product you want to purchase.\n\n1) Temporary License Plates\n2) Temporary Insurance Vehicle\n\nAlso you can go to the products page to see the available products by clicking the buttons below.\n\n<button class='go-to-plates'>Go to plates</button>\n\n<button class='go-to-insurance'>Go to insurance</button>",
            sender_id: noSender[0].id,
            conversation_id,
            content_type: "text/auto/plates/success/menu"
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
          data: menuMessage,
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
            content: `It seems like you failed to provide the required information. Your request has been cancelled. But you can start a new one anytime just by typing the number of the service you want to use.\n\n1) Temporary plates\n2) Insurance\n\n Also you can go to the products page to see the available products by clicking the button below.\n\n<button class="go-to-products">Go to products</button>`,
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
  
if (!sender[0].admin && Number.isInteger(Number(content))) {
  if (Number(content) === 1) {
    //create the purchase for the temporary plates
    const purchaseExists = findPurchasesUnCompleted.find(purchase => purchase.conversation_id === conversation_id && !purchase.completed && !purchase.cancelled)

    if (purchaseExists) {
      const newMessage = await prisma.message.create({
        data: {
          content: `You have already a purchase in progress. Please complete it or cancel it.`,
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
          state: '',
          conversation_id,
          user_id: sender[0].id,
          completed: false,
          id: uuidv4(),
          options: '',
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
          image: '',
          vehicleType: '',
          buyingType: 'temporary',
          paypalPaymentId: '',
          insuranceType: '',
        }
      })
    }

    const autoMessage = await prisma.message.create({
      data: {
        content: jsonData.plates,
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

  } else if (Number(content) === 2) {
    //create the purchase for the insurance
    const purchaseExists = findPurchasesUnCompleted.find(purchase => purchase.conversation_id === conversation_id && !purchase.completed && !purchase.cancelled)

    if (purchaseExists) {
      const newMessage = await prisma.message.create({
        data: {
          content: `You have already a purchase in progress. Please complete it or cancel it.`,
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
          state: '',
          conversation_id,
          user_id: sender[0].id,
          completed: false,
          id: uuidv4(),
          options: '',
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
          image: '',
          vehicleType: '',
          buyingType: 'insurance',
          paypalPaymentId: '',
          insuranceType: '',
        }
      })
    }

    const autoMessage = await prisma.message.create({
      data: {
        content: jsonData.plates,
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
  }
}

io.emit(`notification-${noSender[0].id}`, {
    title: 'New message',
    body: `
        ${sender[0].username} has sent a new message
      `
})

 } catch (error) {
  console.log('Error from createPlateCode', error)
 }
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

app.all('*', function(req, res, next) {
  var start = process.hrtime();

  // event triggers when express is done sending response
  res.on('finish', function() {
    var hrtime = process.hrtime(start);
    var elapsed = parseFloat(hrtime[0] + (hrtime[1] / 1000000).toFixed(3), 10);
    console.log(elapsed + 'ms');
  });

  next();
});

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
  
    // res.cookie('userID', usernameTaken.id, { httpOnly: true, sameSite: 'none', secure: true })
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
    const { userID } = req.cookies || req.body
    const { username, email, password, phone_number, image } = body

    if (!username || !email || !password || !phone_number || !image) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const userExists = await findUserByEmail(email)

    if (userExists) {
      // res.cookie('userID', userExists.id, { httpOnly: true, sameSite: 'none', secure: true })
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

      // res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
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

    // res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
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
          content: jsonData.salute + "\n\nAlso you can go to the products page to see the available products by clicking the buttons below.\n\n<button class='go-to-plates'>Go to plates</button>\n\n<button class='go-to-insurance'>Go to insurance</button>",
          sender_id: adminID,
          conversation_id: roomID,
          content_type: "text"
        },
      })

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
    const purchases = await prisma.purchasevisitor.findMany()
    const purchasesFromPurchase = await prisma.purchase.findMany()

    return res.status(200).json({
      data: purchases.concat(purchasesFromPurchase),
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

    if (purchase) {
      return res.status(200).json({
        data: purchase,
        message: 'Purchase fetched successfully',
        success: true
      })
    } else {
      return res.status(404).json({
        error: 'Purchase not found'
      })
    }
  } catch (error) {
    console.log('Error from Purchase/:id', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/createPurchase", async (req, res) => {
  const {
    purchaseType,
    vin,
    color,
    email,
    state,
    name,
    lastName,
    address,
    city,
    houseType,
    zip,
    phone,
    driverLicense,
    details,
    paypalPaymentId,
    hasFee,
    isInsurance,
    total,
    optionSelectedPlate,
    optionSelectedInsurance,
    insurancePrice,
    insuranceProvider,
    vehicleInsurance,
    image,
    vehicleType,
    saleBill
  } = req.body

  // console.log('req.body', req.body)

  try {
    // console.log('req.body', req.body)
    if (state.includes("New Jersey") && !isInsurance) {
      if (!vehicleInsurance && !insuranceProvider) {
        return res.status(400).json({
          error: 'Missing vehicle insurance or insurance provider'
        });
      }
    }
    
    if (vehicleType.includes('Trailer') && !saleBill) {
      return res.status(400).json({
        error: 'Missing sales bill'
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        purchaseType: purchaseType || "plate",
        vin,
        color,
        email,
        state,
        name,
        lastName,
        address,
        city,
        houseType,
        zip,
        phone,
        driverLicense,
        details,
        paypalPaymentId,
        hasFee,
        isInsurance,
        total,
        optionSelectedPlate,
        optionSelectedInsurance,
        insurancePrice,
        insuranceProvider,
        image,
        vehicleInsurance,
        vehicleType,
        saleBill
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

const generateAccessToken = async () => {
  try {
    console.log(!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
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

/**
 * Generate a client token for rendering the hosted card fields.
 * @see https://developer.paypal.com/docs/checkout/advanced/integrate/#link-integratebackend
 */
const generateClientToken = async () => {
  const accessToken = await generateAccessToken();
  const url = `${base}/v1/identity/generate-token`;
  console.log('accessToken', accessToken)
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

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
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
          value: cart[0].quantity,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: cart[0].quantity,
            }
          }
        },
        description: cart[0].description + " -  E-SHIPPING",
        name: 'Order from Usatags',
        shipping: {
          method: "E-SHIPPING",
        },
        items: [
          {
            name: 'Order from Usatags',
            quantity: '1',
            category: 'DIGITAL_GOODS',
            description: cart[0].description,
            unit_amount: {
              currency_code: "USD",
              value: cart[0].quantity,
            }
          }
        ]
      },
    ],
    application_context: {
      shipping_preference: "NO_SHIPPING",
      brand_name: "Usatags",
    }
  }

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

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
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

// return client token for hosted-fields component
app.post("/api/token", async (req, res) => {
  try {
    const { jsonResponse, httpStatusCode } = await generateClientToken();
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    res.status(500).send({ error: "Failed to generate client token." });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    // use the cart information passed from the front-end to calculate the order amount detals
    const { cart } = req.body;
    console.log(cart);
    // const { jsonResponse, httpStatusCode } = await createOrder(cart);
    // res.status(httpStatusCode).json(jsonResponse);
    const orderRequest = new paypal.orders.OrdersCreateRequest();

    orderRequest.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: cart[0].quantity,
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: cart[0].quantity,
              }
            }
          },
          description: cart[0].description + " -  E-SHIPPING",
          name: 'Order from Usatags',
          shipping: {
            method: "E-SHIPPING",
          },
          items: [
            {
              name: 'Order from Usatags',
              quantity: '1',
              category: 'DIGITAL_GOODS',
              description: cart[0].description,
              unit_amount: {
                currency_code: "USD",
                value: cart[0].quantity,
              }
            }
          ]
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING",
        brand_name: "Usatags",
      }
    })

    const orderResponse = await paypalClientWithRefreshToken.execute(orderRequest);
    return res.status(200).json(orderResponse.result);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to create order." });
  }
});

app.post("/api/orders/:orderID/capture", async (req, res) => {
  try {
    const { orderID } = req.params;
    const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
    res.status(httpStatusCode).json(jsonResponse);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ error: "Failed to capture order." });
  }
});

//Boton del seguro click aquí e ir al chat


app.post('/completePurchase', async (req, res) => {
  try {
    const { purchaseID } = req.body
    const purchase = await prisma.purchase.findUnique({
      where: {
        id: purchaseID
      },
    })

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' })
    }

    await prisma.purchase.update({
      where: {
        id: purchaseID
      },
      data: {
        completed: true
      }
    })

    res.status(200).json({
      data: purchase,
      message: 'Purchase completed successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from completePurchase', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})  

app.post('/updatePurchase', async (req, res) => {
  try {
    const { purchaseID, paypalPaymentId } = req.body
    const purchase = await prisma.purchase.findUnique({
      where: {
        id: purchaseID
      },
    })
    

    if (purchase) {
    await prisma.purchase.update({
      where: {
        id: purchaseID
      },
      data: {
        paypalPaymentId,
        // completed: true,
      }
    })

    return res.status(200).json({
      data: {
        ...purchase,
        paypalPaymentId,
        completed: true,
      },
      message: 'Purchase updated successfully',
      success: true
    })
    }
    return res.status(404).json({ error: 'Purchase not found' })
  } catch (error) {
    console.log('Error from updatePurchase', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/createPlateCode', async (req, res) => {
  try {
    const {
      tagName,
      status,
      tagIssueDate,
      tagExpirationDate,
      purchasedOrLeased,
      customerType,
      transferPlate,
      vin,
      vehicleYear,
      vehicleMake,
      vehicleModel,
      vehicleBodyStyle,
      tagType,
      vehicleColor,
      vehicleGVW,
      dealerLicenseNumber,
      dealerName,
      dealerAddress,
      dealerPhone,
      dealerType,
      hasBarcode,
      hasQRCode,
      state,
      insuranceProvider,
      isInsurance,
      agentName,
      policyNumber,
      nameOwner,
      address,
      isTexas,

      effectiveTimestamp,
      verificationCode,
      createTimestamp,
      endTimestamp,
      statusCode,
      modelYear,
      make,
      dealerGDN,
      dealerDBA,
     } = req.body

    //  console.log('req.body', {
    //   tagName,
    //   tagType,
    //   effectiveTimestamp,
    //   verificationCode,
    //   createTimestamp,
    //   endTimestamp,
    //   statusCode,
    //   vin,
    //   modelYear,
    //   make,
    //   vehicleBodyStyle,
    //   vehicleColor,
    //   dealerGDN,
    //   dealerName,
    //   dealerDBA,
    //   address,
    //   isTexas
    //  })
    //  return res.status(200).json()

    const findPlateByTag = await prisma.plateDetailsCodes.findMany({
      where: {
        tagName
      }
    })

    if (findPlateByTag.length && !isInsurance && isTexas) {
      return res.status(400).json({ error: 'Plate code already exists' })
    }

    if (isTexas) {
      const plateCode = await prisma.plateDetailsCodes.create({
        data: {
          id: uuidv4(),
          tagName,
          status,
          tagIssueDate,
          tagExpirationDate,
          purchasedOrLeased,
          customerType,
          transferPlate,
          vin,
          vehicleYear,
          vehicleMake,
          vehicleModel,
          vehicleBodyStyle,
          vehicleColor,
          vehicleGVW,
          dealerLicenseNumber,
          dealerName,
          dealerAddress,
          tagType,
          dealerPhone,
          dealerType,
          hasBarcode: true,
          hasQRCode: true,
          State: state,
          insuranceProvider: insuranceProvider || '',
          isInsurance: isInsurance || false,
          agentName,
          policyNumber,
          nameOwner,
          address,
          effectiveTimestamp,
          verificationCode,
          createTimestamp,
          endTimestamp,
          statusCode,
          dealerGDN,
          dealerDBA,
        }
      })

      return res.status(201).json({
        data: plateCode,
        message: 'Plate code created successfully',
        success: true
      })
    }

    if (findPlateByTag.length && !isInsurance) {
      return res.status(400).json({ error: 'Plate code already exists' })
    }

    const findByPolicyNumber = await prisma.plateDetailsCodes.findMany({
      where: {
        policyNumber
      }
    })

    if (findByPolicyNumber.length && isInsurance) {
      return res.status(400).json({ error: 'Policy number already exists' })
    }

    const plateCode = await prisma.plateDetailsCodes.create({
      data: {
        id: uuidv4(),
        tagName,
        status,
        tagIssueDate,
        tagExpirationDate,
        purchasedOrLeased,
        customerType,
        transferPlate,
        vin,
        vehicleYear,
        vehicleMake,
        vehicleModel,
        vehicleBodyStyle,
        vehicleColor,
        vehicleGVW,
        dealerLicenseNumber,
        dealerName,
        dealerAddress,
        tagType,
        dealerPhone,
        dealerType,
        hasBarcode: true,
        hasQRCode: true,
        State: state,
        insuranceProvider: insuranceProvider || '',
        isInsurance: isInsurance || false,
        agentName,
        policyNumber,
        nameOwner,
        address
      }
    })

    res.status(201).json({
      data: plateCode,
      message: 'Plate code created successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from createPLateCode', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/plateDetailsCodes', async (req, res) => {
  try {
    const plateDetailsCodes = await prisma.plateDetailsCodes.findMany()

    res.status(200).json({
      data: plateDetailsCodes,
      message: 'QR codes fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from plateDetailsCodes', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


app.get('/plateDetailsCodes/:tagName', async (req, res) => {
  const { tagName } = req.params
  try {
    const plateDetailsCode = await prisma.plateDetailsCodes.findMany({
      where: {
        tagName
      }
    })

    const vinSeach = await prisma.plateDetailsCodes.findMany({
      where: {
        vin: tagName
      }
    })

    const policyNumberSearch = await prisma.plateDetailsCodes.findMany({
      where: {
        policyNumber: tagName
      }
    })

    plateDetailsCode.push(...vinSeach)
    plateDetailsCode.push(...policyNumberSearch)

    if (!plateDetailsCode) {
      return res.status(404).json({ error: 'Plate code not found' })
    }

    res.status(200).json({
      data: plateDetailsCode[0],
      message: 'Plate code fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from plateDetailsCodes/:tagName', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/env', async (req, res) => {
  try {
    const env = process.env
    res.status(200).json({
      data: {
        viteServerURL: process.env.SERVER_URL,
        viteCloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
        viteCloudinaryPreset: process.env.CLOUDINARY_CLOUD_PRESET,
        viteRapidAPIKey: process.env.RAPID_API_KEY,
        viteRapidAPIHost: process.env.RAPID_API_HOST,
        viteRapidAPIBaseURL: process.env.RAPID_API_URL,
        vitePayPalClientID: process.env.PAYPAL_CLIENT_ID,
      },
      message: 'Environment variables fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from env', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/purchaseFromFormConversation', async (req, res) => {
  const { purchaseOption, data, room } = req.body
  try {
    if (purchaseOption === "0") {
      await prisma.purchase.create({
        data: {
          vin: '',
          color: '',
          email: '',
          details: '',
          continuePurchase: true,
          state: '',
          conversation_id: data.conversationID,
          user_id: data.senderID,
          completed: false,
          id: uuidv4(),
          options: '',
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
          image: '',
          vehicleType: '',
          buyingType: '',
          paypalPaymentId: '',
          insuranceType: '',
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "2"
        })
      })
    } else if (purchaseOption === "2") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      const stateImage = jsonData.states.find((s) => s.state === data).id + '-' + data +'.webp'
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          state: data,
          image: stateImage,
          options: jsonData.states.filter((s) => s.state === data)[0].plates
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "3",
          state: data,
          options: jsonData.states.filter((s) => s.state === data)[0].plates
        })
      })
    } else if (purchaseOption === "3") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      const price = data.split(' ')[data.split(' ').length - 1].split('$')[0]
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          details: data,
          total: parseInt(price)
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "4"
        })
      })
    } else if (purchaseOption === "4") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      const purchasePrice = allPurchases.filter((c) => c.conversation_id === room)[0].total
      const vehicleTypeFee = ["Truck (+20$ fee)", "Bus (+20$ fee)", "Trailer (+20$ fee)"].includes(data) ? 20 : 0
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          vehicleType: data,
          total: purchasePrice + vehicleTypeFee,
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "5"
        })
      })
    } else if (purchaseOption === "5") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          name: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "6"
        })
      })
    } else if (purchaseOption === "6") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          lastName: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "7"
        })
      })
    } else if (purchaseOption === "7") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          address: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "8"
        })
      })
    } else if (purchaseOption === "8") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          city: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "9"
        })
      })
    } else if (purchaseOption === "9") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          houseType: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "10"
        })
      })
    } else if (purchaseOption === "10") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          zip: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "11"
        })
      })
    } else if (purchaseOption === "11") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          phone: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "12"
        })
      })
    } else if (purchaseOption === "12") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          vin: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "13"
        })
      })
    } else if (purchaseOption === "13") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          color: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "14"
        })
      })
    } else if (purchaseOption === "14") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          email: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "15"
        })
      })
    } else if (purchaseOption === "15") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      console.log('purchaseID', purchaseID, 'data', data)
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          driverLicense: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "16"
        })
      })
    } else if (purchaseOption === "16") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          hasVehicleInSurance: data
        }
      }).then((purchase) => {
        if (data === "yes") {
          return res.status(200).json({
            data: true,
            currentStep: "18"
          })
        } else {
          return res.status(200).json({
            data: true,
            currentStep: "17"
          })
        }
      })
    } else if (purchaseOption === "17") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          wantToGetVehicleInsurance: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "19",
          purchaseID: purchaseID
        })
      })
    } else if (purchaseOption === "18") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          vehicleInsurance: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "19",
          purchaseID: purchaseID
        })
      })
    } else if (purchaseOption === "19") {
      const allPurchases = await prisma.purchase.findMany()
      const purchaseID = allPurchases.filter((c) => c.conversation_id === room)[0].id
      await prisma.purchase.update({
        where: {
          id: purchaseID
        },
        data: {
          total: data
        }
      }).then((purchase) => {
        return res.status(200).json({
          data: true,
          currentStep: "20"
        })
      })
    }
  } catch (error) {
    console.log('Error from purchaseFromFormConversation', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/purchase/conversation/:id', async (req, res) => {
  const { id } = req.params
  try {
    if (id) {
      const purchaseS = await prisma.purchase.findMany()
      const filteredByConversationID = purchaseS.filter((c) => c.conversation_id === id)
      if (!filteredByConversationID.length || filteredByConversationID[0].completed) {
        res.status(200).json({
          data: false
        })
      } else {
        if (!filteredByConversationID[0].state) {
          res.status(200).json({
            data: true,
            currentStep: "2"
          })
        } else if (!filteredByConversationID[0].details) {
          res.status(200).json({
            data: true,
            currentStep: "3",
            state: filteredByConversationID[0].state,
            options: jsonData.states.filter((s) => s.state === filteredByConversationID[0].state)[0].plates
          })
        } else if (!filteredByConversationID[0].vehicleType) {
          res.status(200).json({
            data: true,
            currentStep: "4"
          })
        } else if (!filteredByConversationID[0].name) {
          res.status(200).json({
            data: true,
            currentStep: "5"
          })
        } else if (!filteredByConversationID[0].lastName) {
          res.status(200).json({
            data: true,
            currentStep: "6"
          })
        } else if (!filteredByConversationID[0].address) {
          res.status(200).json({
            data: true,
            currentStep: "7"
          })
        } else if (!filteredByConversationID[0].city) {
          res.status(200).json({
            data: true,
            currentStep: "8"
          })
        } else if (!filteredByConversationID[0].houseType) {
          res.status(200).json({
            data: true,
            currentStep: "9"
          })
        } else if (!filteredByConversationID[0].zip) {
          res.status(200).json({
            data: true,
            currentStep: "10"
          })
        } else if (!filteredByConversationID[0].phone) {
          res.status(200).json({
            data: true,
            currentStep: "11"
          })
        } else if (!filteredByConversationID[0].vin) {
          res.status(200).json({
            data: true,
            currentStep: "12"
          })
        } else if (!filteredByConversationID[0].color) {
          res.status(200).json({
            data: true,
            currentStep: "13"
          })
        } else if (!filteredByConversationID[0].email) {
          res.status(200).json({
            data: true,
            currentStep: "14"
          })
        } else if (!filteredByConversationID[0].driverLicense) {
          res.status(200).json({
            data: true,
            currentStep: "15"
          })
        } else if (!filteredByConversationID[0].hasVehicleInSurance) {
          res.status(200).json({
            data: true,
            currentStep: "16"
          })
        } else if (!filteredByConversationID[0].wantToGetVehicleInsurance) {
          res.status(200).json({
            data: true,
            currentStep: "17"
          })
        } else if ((!filteredByConversationID[0].vehicleInsurance && filteredByConversationID[0].hasVehicleInSurance === 'yes') || (filteredByConversationID[0].hasVehicleInSurance === 'no' && filteredByConversationID[0].wantToGetVehicleInsurance === 'yes')) {
          res.status(200).json({
            data: true,
            currentStep: "18"
          })
        } else if (!filteredByConversationID[0].completed) {
          const purchaseID = filteredByConversationID[0].id
          res.status(200).json({
            data: true,
            currentStep: "19",
            purchaseID: purchaseID
          })
        }
      }
    } else {
      return res.status(404).json({ error: 'Id no provided' })
    }
  } catch (error) {
    console.log("Error from purchase conversation", error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get("/auth/token", async (req, res) => {
  const { userID } = req.cookies || req.body
  try {
    if (!userID) {
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4()
        }
      })

      // res.cookie('userID', newUser.id, { httpOnly: true, sameSite: 'none', secure: true })
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
      // res.cookie('userID', user.id, { httpOnly: true, sameSite: 'none', secure: true })
      return res.status(200).json({
        data: true,
        message: 'User fetched successfully',
        success: true
      })
    } else {
      const newUser = await prisma.user.create({
        data: {
          id: uuidv4()
        }
      })

      // res.cookie('userID', newUser.id, { httpOnly: true, sameSite: 'none', secure: true })
    }

    return res.status(200).json({
      data: true,
      message: 'User fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from auth/token', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.get("/cart", async (req, res) => {
  const { userID } = req.cookies || req.body
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      const createCart = await prisma.shoppingCart.create({
        data: {
          userId: userID,
          total: 0,
          amount: 0,
          products: {
            create: []
          }
        }
      })

      return res.status(200).json({
        data: createCart,
        message: 'Cart fetched successfully',
        success: true
      })
    }

    res.status(200).json({
      data: cart,
      message: 'Cart fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.post("/cart", async (req, res) => {
  const { userID } = req.cookies || req.body
  try {

    const findCart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      }
    })

    if (findCart) {
      return res.status(400).json({
        data: findCart,
        message: 'Cart already exists',
        success: false
      })
    }

    const cart = await prisma.shoppingCart.create({
      data: {
        userId: userID,
        total: 0,
        amount: 0,
        products: {
          create: []
        }
      }
    })
    res.status(201).json({
      data: cart,
      message: 'Cart created successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.put("/cart/product", async (req, res) => {
  const { product } = req.body
  const { userID } = req.cookies || req.body
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }

    const productExists = cart.products.find((p) => p.name === product.name)

    if (cart.products.length && productExists) {
      if (productExists.description.includes(product.description)) {
        return res.status(400).json({ error: 'Product already exists in cart' })
      } else {
        const productID = productExists.id
        await prisma.product.update({
          where: {
            id: productID
          },
          data: {
            description: product.description,
            price: product.price,
          }
        })
        await prisma.shoppingCart.update({
          where: {
            userId: userID
          },
          data: {
            total: cart.total + product.price - productExists.price,
          }
        })

        return res.status(200).json({
          data: true,
          message: 'Product updated successfully',
          success: true
        })
      }
    }

    const updatedCart = await prisma.shoppingCart.update({
      where: {
        userId: userID
      },
      data: {
        total: cart.total + product.price,
        amount: cart.amount + 1,
        products: {
          create: {
            name: product.name,
            price: product.price,
            image: product.image,
            description: product.description,
            link: product.link,
          }
        }
      },
      include: {
        products: true
      }
    })

    res.status(200).json({
      data: updatedCart,
      message: 'Product added to cart successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart/product', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.delete("/cart/product/:productID", async (req, res) => {
  const { productID } = req.params
  const { userID } = req.cookies || req.body
  try {
    const cart = await prisma.shoppingCart.findUnique({
      where: {
        userId: userID
      },
      include: {
        products: true
      }
    })

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' })
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productID
      }
    })

    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const updatedCart = await prisma.shoppingCart.update({
      where: {
        userId: userID
      },
      data: {
        total: cart.total - product.price,
        amount: cart.amount - 1,
        products: {
          delete: {
            id: productID
          }
        }
      },
      include: {
        products: true
      }
    })

    res.status(200).json({
      data: updatedCart,
      message: 'Product removed from cart successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from cart/product', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.get('/auth/created', async (req, res) => {
  const { userID } = req.cookies || req.body
  try {
    if (!userID) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userID
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.username && user.email) {
      return res.status(200).json({
        data: true,
        message: 'User fetched successfully',
        success: true
      })
    } else {
      return res.status(200).json({
        data: false,
        message: 'User fetched successfully',
        success: true
      })
    }
  } catch (error) {
    console.log('Error from auth/created', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/restore/password", async (req, res) => {
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
})

app.post("/restore/check", async (req, res) => {
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
})

app.post("/user/update", async (req, res) => {
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
})

app.post("/codes/login", async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' })
    }

    const token = jwt.sign({ email, name: user.username }, process.env.JWT_SECRET, { expiresIn: '1d' })

    return res.status(200).json({
      data: token,
      message: 'User logged in successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from codes/login', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/codes/verify", async (req, res) => {
  const { token } = req.body
  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(200).json({
          data: false,
          message: 'Invalid token',
          success: false
        })
      }

      return res.status(200).json({
        data: true,
        message: 'Token verified successfully',
        success: true
      })
    })
  } catch (error) {
    console.log('Error from codes/verify', error)
    res.status(500).json({ error: 'Internal server error' })
  }
});

app.post("/codes/list" , async (req, res) => {
  const { token } = req.body
  try {
    const validToken = jwt.verify(token, process.env.JWT_SECRET)

    if (!validToken) {
      return res.status(400).json({ error: 'Invalid token' })
    }

    const codes = await prisma.plateDetailsCodes.findMany()

    return res.status(200).json({
      data: codes,
      message: 'Codes fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from codes/list', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/codes/delete", async (req, res) => {
  const { token, id } = req.body
  try {
    const validToken = jwt.verify(token, process.env.JWT_SECRET)

    if (!validToken) {
      return res.status(400).json({ error: 'Invalid token' })
    }

    const code = await prisma.plateDetailsCodes.findUnique({
      where: {
        id
      }
    })

    if (!code) {
      return res.status(404).json({ error: 'Code not found' })
    }

    await prisma.plateDetailsCodes.delete({
      where: {
        id
      }
    })

    return res.status(200).json({
      data: true,
      message: 'Code deleted successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from codes/delete', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post("/codes/update", async (req, res) => {
  const { token, id, data } = req.body
  console.log('data', data)
  try {
    const validToken = jwt.verify(token, process.env.JWT_SECRET)

    if (!validToken) {
      return res.status(400).json({ error: 'Invalid token' })
    }

    const code = await prisma.plateDetailsCodes.findUnique({
      where: {
        id
      }
    })

    if (!code) {
      return res.status(404).json({ error: 'Code not found' })
    }

    await prisma.plateDetailsCodes.update({
      where: {
        id
      },
      data: {
        ...data,
      }
    })

    return res.status(200).json({
      data: true,
      message: 'Code updated successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from codes/update', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// const { parse } = require("csv-parse");
// const fs = require('fs')
// let count = 0
// let pruchasesPerDates = {}
// fs.createReadStream('../../Downloads/Purchase-p2.csv')
// .pipe(parse({ delimiter: ",", from_line: 2 }))
//   .on("data", async function (row) {

//     // if (row[27]) {
//     //   console.log('row', row[18], row[27])
//     //   count += Number(row[18])
//     // }
//     // console.log('row', row[33])
//     // if (row[33]) {
//     //   if (row[27]) {
//     //     const dd = new Date(row[33])
//     //     pruchasesPerDates[dd.getDate()] = pruchasesPerDates[dd.getDate()] ? pruchasesPerDates[dd.getDate()] + 1 : 1
//     //   }
//     // }
//     // console.log('row', row[20], row[17])
//     if (row[17]) {
//       console.log('row', row[20], row[17], row[26])
//       count += Number(row[20])
//     }
//   })
//   .on("end", function () {
//     console.log(count)
//     console.log("finished");
//   })
//   .on("error", function (error) {
//     console.log(error.message);
//   });


const generateAccessToken2 = async () => {
  const response = await axios({
    url: base + '/v1/oauth2/token',
    method: 'post',
    data: 'grant_type=client_credentials',
    auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_SECRET
    }
})

return response.data.access_token
}

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder2 = async (cart, return_url, cancel_url) => {
  const accessToken = await generateAccessToken2()

  const response = await axios({
      url: base + '/v2/checkout/orders',
      method: 'post',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken
      },
      data: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: cart[0].quantity,
              },
              description: cart[0].description + " -  E-SHIPPING",
              name: 'Order from Usatags',
              shipping: {
                method: "E-SHIPPING",
              }
            },
          ],
          payment_source: {
            paypal: {
              brand_name: "Usatags",
              shipping_preference: "E_SHIPPING"
            }
          },
          application_context: {
            brand_name: "Usatags",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url,
            cancel_url,
          }
        })
  })

  console.log(response.data.id)
  return response.data.links.find(link => link.rel === 'payer-action').href
};



app.post("/pay", async (req, res) => {
  try {
    const url = await createOrder2(req.body.cart, req.body.return_url, req.body.cancel_url);
    res.status(200).json({ url });
  } catch (error) {
    console.log('Error from pay', error)
  }
})
  

server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

server.timeout = 300000