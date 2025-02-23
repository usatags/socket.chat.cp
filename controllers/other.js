const { response } = require('express');
const { v4: uuidv4 } = require('uuid');
const jsonData = require('../automaticMessages.json')
const { prisma } = require('../database/config');

const changeIDS = async (req, res = response) => {
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
}

const products = async (req, res = response) => {
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
}

const createPlateCode = async (req, res = response) => {
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
      vehicleColor,
      vehicleGVW,
      dealerLicenseNumber,
      dealerName,
      dealerAddress,
      dealerPhone,
      dealerType,
      hasBarcode,
      hasQRCode,
      state
     } = req.body

    const findPlateByTag = await prisma.plateDetailsCodes.findMany({
      where: {
        tagName
      }
    })

    if (findPlateByTag.length && findPlateByTag[0].hasBarcode && findPlateByTag[0].hasQRCode) {
      return res.status(400).json({ error: 'Plate code already exists' })
    }

    if (findPlateByTag.length && findPlateByTag[0].hasBarcode && hasBarcode) {
      return res.status(400).json({ error: 'Plate code already has barcode' })
    }

    if (findPlateByTag.length && findPlateByTag[0].hasQRCode && hasQRCode) {
      return res.status(400).json({ error: 'Plate code already has QR code' })
    }

    if (findPlateByTag.length && findPlateByTag[0].hasBarcode && !findPlateByTag[0].hasQRCode) {
      await prisma.plateDetailsCodes.update({
        where: {
          id: findPlateByTag[0].id
        },
        data: {
          hasQRCode: true
        }
      })

      return res.status(200).json({
        data: {
          ...findPlateByTag[0],
          hasQRCode: true,
          hasBarcode: false
        },
        message: 'Plate code created successfully',
        success: true
      })
    }

    if (findPlateByTag.length && !findPlateByTag[0].hasBarcode && findPlateByTag[0].hasQRCode) {
      await prisma.plateDetailsCodes.update({
        where: {
          id: findPlateByTag[0].id
        },
        data: {
          hasBarcode: true
        }
      })

      return res.status(200).json({
        data: {
          ...findPlateByTag[0],
          hasQRCode: false,
          hasBarcode: true
        },
        message: 'Plate code created successfully',
        success: true
      })
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
        dealerPhone,
        dealerType,
        hasBarcode: true,
        hasQRCode: true,
        State: state
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
}

const createPlateDetailsCode = async (req, res = response) => {
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
}

const getPlateCodeByTagname = async (req, res = response) => {
  const { tagName } = req.params
  try {
    const plateDetailsCode = await prisma.plateDetailsCodes.findMany({
      where: {
        tagName
      }
    })

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
}

const getEnv = async (req, res = response) => {
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
}

const getToken = async (req, res = response) => {
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
    console.log('Error from auth/token', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = {
  changeIDS,
  products,
  createPlateCode,
  createPlateDetailsCode,
  getPlateCodeByTagname,
  getEnv,
  getToken
}