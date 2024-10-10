const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '',
    pass: ''
  }
})

const HTMLMESSAGE = `<div><h2>Detalles de la Compra</h2><div><p><strong>Purchase ID:</strong> {{id}}</p><p><strong>Payment ID:</strong> {{pid}}</p><p><strong>Detalles:</strong> {{details}}</p></div><div><h3>Información Personal</h3><p><strong>Nombre:</strong> {{fname}}</p><p><strong>Apellido:</strong> {{lname}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Estado:</strong> {{state}}</p></div><div><h3>Información del Vehículo</h3><p><strong>VIN:</strong> {{vin}}</p><p><strong>Color:</strong> {{color}}</p></div><div><h3>Dirección</h3><p><strong>Dirección:</strong> {{address}}</p><p><strong>Ciudad:</strong> {{city}}</p><p><strong>Tipo de Vivienda:</strong> {{htype}}</p><p><strong>Tipo de Vehículo:</strong> {{vtype}}</p><p><strong>Tipo de Compra:</strong> {{btype}}</p><p><strong>Código Postal:</strong> {{zip}}</p></div><div><h3>Contacto</h3><p><strong>Teléfono:</strong> {{phone}}</p></div><div><h3>Licencia de Conducir</h3><img src="{{dlicense}}" alt="Foto de la Licencia de Conducir"><p><a href="{{dlicense}}" target="_blank">Ver Licencia de Conducir</a></p></div><div><h3>Seguro del Vehículo</h3><p><strong>Seguro Proveedor:</strong> {{insuranceProvider}}</p></div></div>`

const sendEmail = async () => {
try {
  const mailOptions = {
    from: '',
    to: '',
    replyTo: '',
    subject: 'Testing',
    text: 'order ID: 1234',
    html: HTMLMESSAGE
  }

  await transporter.sendMail(mailOptions);
  console.log('Email sent successfully');
} catch (error) {
  console.error('Error sending email: ', error);
}
}

sendEmail()