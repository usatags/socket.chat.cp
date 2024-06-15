const { response } = require('express');
const { prisma } = require('../database/config');
const { findUserByID } = require('../helpers/utils');
const jsonData = require('../automaticMessages.json');

const getMessagesFromRoom = async (req, res = response) => {
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
          content: (process.env.SERVER_TYPE ? jsonData.salute_dealers : jsonData.salute) + "\n\nAlso you can go to the products page to see the available products by clicking the buttons below.\n\n<button class='go-to-plates'>Go to plates</button>\n\n<button class='go-to-insurance'>Go to insurance</button>",
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
}

module.exports = {
  getMessagesFromRoom
}