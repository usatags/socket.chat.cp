require('dotenv').config();
const express = require('express');
const cors = require('cors');
const paypal = require('@paypal/checkout-server-sdk');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// PayPal configuration
const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const paypalClient = new paypal.core.PayPalHttpClient(environment);

// Create order endpoint
app.post('/create-order', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: amount } }],
    });

    const order = await paypalClient.execute(request);
    res.status(200).json({ id: order.result.id });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: 'Error creating PayPal order' });
  }
});

// Capture order endpoint
app.post('/capture-order', async (req, res) => {
  try {
    const { orderId, purchaseType,
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
      saleBill, } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const capture = await paypalClient.execute(request);

    // Imprimir la respuesta completa de PayPal
    // console.log('Capture response:', JSON.stringify(capture.result, null, 2));

    const purchaseUnit = capture.result?.purchase_units?.[0];
    const amount = purchaseUnit.payments.captures[0].amount.value

    // console.log('Capture amount:', amount,);
    // console.log('Capture status:', capture);

    if (!amount) {
      return res.status(400).json({ error: 'Payment information is incomplete or missing' });
    }

    if (capture.result.status === 'COMPLETED') {
      const additionalData = {
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
        saleBill,
      }
      
      await sendEmail(email, amount, additionalData);
      return res.status(200).json({ message: 'Payment completed and email sent' });
    } else {
      return res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Error capturing PayPal order:', error.message);
    res.status(500).json({ error: 'Error capturing PayPal order' });
  }
});



// Email sending function
async function sendEmail(email, amount, additionalData) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Detalles de la Compra</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              background-color: #f4f4f4;
          }
          .container {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              max-width: 600px;
              margin: 0 auto;
          }
          h1 {
              color: #800080;
              text-align: center;
              margin-bottom: 20px;
          }
          h2, h3 {
              color: #333333;
          }
          p {
              color: #555555;
              margin: 8px 0;
          }
          .section {
              margin-bottom: 20px;
          }
          img {
              max-width: 100%;
              height: auto;
              border: 1px solid #dddddd;
              border-radius: 4px;
              margin-bottom: 10px;
          }
          a {
              color: #007BFF;
              text-decoration: none;
          }
          a:hover {
              text-decoration: underline;
          }
          .footer {
              margin-top: 20px;
              text-align: center;
              color: #777777;
              font-size: 0.9em;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h2>Detalles de la Compra</h2>
          <div class="section">
              <p><strong>Purchase ID:</strong> ${additionalData.purchaseId || "N/A"}</p>
              <p><strong>Payment ID:</strong> ${additionalData.paymentId || "N/A"}</p>
              <p><strong>Detalles:</strong> ${additionalData.details || "N/A"}</p>
          </div>
          <div class="section">
              <h3>Información Personal</h3>
              <p><strong>Nombre:</strong> ${additionalData.name}</p>
              <p><strong>Apellido:</strong> ${additionalData.lastName}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Estado:</strong> ${additionalData.state}</p>
          </div>
          <div class="section">
              <h3>Información del Vehículo</h3>
              <p><strong>VIN:</strong> ${additionalData.vin}</p>
              <p><strong>Color:</strong> ${additionalData.color}</p>
          </div>
          <div class="section">
              <h3>Dirección</h3>
              <p><strong>Dirección:</strong> ${additionalData.address}</p>
              <p><strong>Ciudad:</strong> ${additionalData.city}</p>
              <p><strong>Tipo de Vivienda:</strong> ${additionalData.houseType}</p>
              <p><strong>Tipo de Vehículo:</strong> ${additionalData.vehicleType}</p>
              <p><strong>Código Postal:</strong> ${additionalData.zip}</p>
          </div>
          <div class="section">
              <h3>Contacto</h3>
              <p><strong>Teléfono:</strong> ${additionalData.phone}</p>
          </div>
          <div class="section">
              <h3>Licencia de Conducir</h3>
              <img src="${additionalData.driverLicense}" alt="Foto de la Licencia de Conducir">
              <p><a href="${additionalData.driverLicense}" target="_blank">Ver Licencia de Conducir</a></p>
          </div>
          <div class="section">
              <h3>Seguro del Vehículo</h3>
              <p><strong>Seguro Proveedor:</strong> ${additionalData.insuranceProvider}</p>
          </div>
          <div class="footer">
              <small>
                  <a href="usatag.us" target="_blank">usatag.us</a>
              </small>
          </div>
      </div>
  </body>
  </html>
    `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Payment Confirmation',
    html: htmlContent
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
