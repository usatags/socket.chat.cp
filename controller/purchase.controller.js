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

const purchases = async (req, res, next) => {
  try {
    const purchases = await prisma.purchasevisitor.findMany()
    const purchasesFromPurchase = await prisma.purchase.findMany()

    return res.status(200).json({ data: purchases.concat(purchasesFromPurchase), message: 'All purchases', success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const purchaseID = async (req, res, next) => {
  const { id } = req.params
  try {
    const purchase = await prisma.purchasevisitor.findUnique({
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
      const purchaseConversation = await prisma.purchase.findUnique({
        where: {
          id
        }
      })

      const purchaseVisitorConversation = await prisma.purchasevisitor.create({
        data: {
          id: purchaseConversation.id,
          vin: purchaseConversation.vin,
          color: purchaseConversation.color,
          email: purchaseConversation.email,
          state: purchaseConversation.state,
          city: purchaseConversation.city,
          houseType: purchaseConversation.houseType,
          zip: purchaseConversation.zip,
          phone: purchaseConversation.phone,
          image: purchaseConversation.image,
          lastName: purchaseConversation.lastName,
          name: purchaseConversation.name,
          isTruck: purchaseConversation.isTruck,
          total: purchaseConversation.total,
          completed: purchaseConversation.completed,
          options: purchaseConversation.options,
          address: purchaseConversation.address,
          buyingType: purchaseConversation.buyingType,
          driverLicense: purchaseConversation.driverLicense,
          vehicleInsurance: purchaseConversation.vehicleInsurance,
          failedTries: purchaseConversation.failedTries,
          cancelled: purchaseConversation.cancelled,
          hasVehicleInSurance: purchaseConversation.hasVehicleInSurance,
          paypalPaymentId: purchaseConversation.paypalPaymentId,
          continuePurchase: purchaseConversation.continuePurchase,
          details: purchaseConversation.details,
          vehicleType: purchaseConversation.vehicleType,
          insuranceType: purchaseConversation.insuranceType,
          wantToGetVehicleInsurance: purchaseConversation.wantToGetVehicleInsurance,
        }
      })

      return res.status(200).json({
        data: purchaseVisitorConversation,
        message: 'Purchase fetched successfully',
        success: true
      })
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const createPurchase = async (req, res, next) => {
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
    total,
    vehicleType,
    details,
    options,
    address,
    vehicleInsurance,
    driverLicense,
    insuranceType,
    wantToGetVehicleInsurance,
    hasVehicleInSurance
  } = req.body
  try {
    const purchase = await prisma.purchasevisitor.create({
      data: {
        vin,
        color,
        email,
        state,
        city,
        houseType,
        zip,
        phone,
        image,
        lastName,
        name,
        isTruck,
        total,
        completed: false,
        options,
        address,
        driverLicense,
        vehicleInsurance: vehicleInsurance || '',
        failedTries: 0,
        cancelled: false,
        hasVehicleInSurance: vehicleInsurance === 'true' ? 'true' : hasVehicleInSurance,
        paypalPaymentId: '',
        buyingType: 'temporary',
        continuePurchase: false,
        details,
        vehicleType,
        insuranceType: insuranceType || '',
        id: uuidv4(), 
        wantToGetVehicleInsurance: vehicleInsurance === 'false' ? 'false' : wantToGetVehicleInsurance,
      }
    })

    res.status(201).json({ data: purchase, message: 'Purchase created successfully', success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const updatePurchase = async (req, res, next) => {
  const { purchaseID, paypalPaymentId } = req.body
  try {
    const purchase = await prisma.purchasevisitor.findUnique({
      where: {
        id: purchaseID
      },
    })
    

    if (purchase) {
    await prisma.purchasevisitor.update({
      where: {
        id: purchaseID
      },
      data: {
        paypalPaymentId,
        completed: true,
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
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const completePurchase = async (req, res, next) => {
  const { purchaseID } = req.body
  try {
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
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const pucharseFromConversation = async (req, res, next) => {
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
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

const purchaseConversationID = async (req, res, next) => {
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
    console.error(error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}

module.exports = {
  purchases,
  purchaseID,
  createPurchase,
  updatePurchase,
  completePurchase,
  pucharseFromConversation,
  purchaseConversationID
}