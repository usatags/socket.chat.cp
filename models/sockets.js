const { prisma } = require('../database/config')
const {
  findAllUsers,
  findUserByID,
  findRoomByID,
} = require('../helpers/utils')
const jsonData = require('../automaticMessages.json')

class Sockects {
  constructor(io) {
    this.io = io;
    this.socketEvents();
  }

  socketEvents() {
    this.io.on('connection', (socket) => {
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
    
          this.io.emit(`user-active-${user.id}`, {
            id: user.id,
            socketId: socket.id,
          })
          this.io.emit('user-active', {
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
    
          this.io.emit('user-inactive', {
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
      
        
        this.io.to(conversation_id).emit('message', {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
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
    
          this.io.to(conversation_id).emit('message', {
            data: autoMessage,
          })
    
          this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {    
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
        
                  this.io.to(conversation_id).emit('message', {
                    data: newMessage,
                  })
        
                  this.io.emit(`notification-${noSender[0].id}`, {
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
    
                  this.io.to(conversation_id).emit('message', {
                    data: newMessage,
                  })
    
                  this.io.emit(`notification-${noSender[0].id}`, {
                    title: 'New message',
                    body: `
                        ${sender[0].username} has sent a new message
                        `
                  })
    
                }
                return 
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else  {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
      
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
      
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
                  title: 'New message',
                  body: `
                      ${sender[0].username} has sent a new message
                      `
                })
              } else {
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
    
                this.io.to(conversation_id).emit('message', {
                  data: newMessage,
                })
    
                this.io.emit(`notification-${noSender[0].id}`, {
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
      
              this.io.to(conversation_id).emit('message', {
                data: newMessage,
              })
      
              this.io.emit(`notification-${noSender[0].id}`, {
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
    
              this.io.to(conversation_id).emit('message', {
                data: menuMessage,
              })
    
              this.io.emit(`notification-${noSender[0].id}`, {
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
      
              this.io.to(conversation_id).emit('message', {
                data: newMessage,
              })
      
              this.io.emit(`notification-${noSender[0].id}`, {
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
    
            this.io.to(conversation_id).emit('message', {
              data: newMessage,
            })
    
            this.io.emit(`notification-${noSender[0].id}`, {
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
    
          this.io.to(conversation_id).emit('message', {
            data: autoMessage,
          })
    
        } else if (Number(content) === 2) {
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
    
            this.io.to(conversation_id).emit('message', {
              data: newMessage,
            })
    
            this.io.emit(`notification-${noSender[0].id}`, {
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
    
          this.io.to(conversation_id).emit('message', {
            data: autoMessage,
          })
        }
    }
      
      this.io.emit(`notification-${noSender[0].id}`, {
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
    
          this.io.emit('user-inactive', {
            id: socketIdExists.id,
            socketId: socket.id,
          })
        }
      })
    })
  }
}

module.exports = Sockects;