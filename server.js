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

// const lastAutoMessages = []
const regexForVIN = /^[a-zA-Z0-9]{17}$/;
const regexForEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
const regexForName = /^[a-zA-ZàáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð ,.'-]+$/u
const regexForAddress = /^[a-zA-Z0-9\s,.'-]+$/
const regexForCity = /^([a-zA-Z\u0080-\u024F]+(?:. |-| |'))*[a-zA-Z\u0080-\u024F]*$/
const regexForZip = /^[0-9]{5}(?:-[0-9]{4})?$/
const regexForNumber = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/
const regexForDriverLicense = /(\.jpg|\.jpeg|\.png|\.webp|\.pdf|\.ai)$/i;


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

app.get('/purchase/:id', async (req, res) => {
  try {
    const { id } = req.params
    const purchase = await prisma.purchase.findUnique({
      where: {
        id
      }
    })

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' })
    }

    res.status(200).json({
      data: purchase,
      message: 'Purchase fetched successfully',
      success: true
    })
  } catch (error) {
    console.log('Error from purchase/:id', error)
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