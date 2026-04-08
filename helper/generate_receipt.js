const PDFDocument = require('pdfkit');
const path = require('path');

const generateReceipt = (payment, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.reference}.pdf`);

  doc.pipe(res);

  // 🖼️ LOGO (safe)
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    doc.image(logoPath, 50, 45, { width: 100 });
  } catch (err) {}

  // 🏢 COMPANY
  doc
    .fontSize(20)
    .text('Rurblist', 400, 50, { align: 'right' })
    .fontSize(10)
    .text('www.rurblist.com', 400, 70, { align: 'right' });

  doc.moveDown(2);

  // 🧾 TITLE
  doc.fontSize(18).text('PAYMENT RECEIPT', { align: 'center' }).moveDown();

  // 🔹 Dynamic line
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  doc.moveDown();

  // 📄 DETAILS
  doc.fontSize(11);

  doc.text(`Reference: ${payment.reference}`);
  doc.text(`Status: ${payment.status.toUpperCase()}`);
  doc.text(`Amount: ${payment.amount.toLocaleString()} ${payment.currency}`);
  doc.text(`Payment For: ${payment.paymentFor.toUpperCase()}`);
  doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);

  doc.moveDown();

  // 👤 CUSTOMER
  doc.fontSize(13).text('Customer Details', { underline: true });
  doc.fontSize(11);
  doc.text(`Name: ${payment.user?.fullName || 'N/A'}`);
  doc.text(`Email: ${payment.user?.email || 'N/A'}`);

  doc.moveDown();

  // 🧑‍💼 AGENT
  if (payment.agent?.user) {
    doc.fontSize(13).text('Agent Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Name: ${payment.agent.user.fullName}`);
    doc.text(`Email: ${payment.agent.user.email}`);
    doc.moveDown();
  }

  // 🏠 PROPERTY
  if (payment.property) {
    doc.fontSize(13).text('Property Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Title: ${payment.property.title || 'N/A'}`);
    doc.moveDown();
  }

  // 🏠 TOUR
  if (payment.tour) {
    doc.fontSize(13).text('Tour Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Date: ${new Date(payment.tour.date).toLocaleString()}`);
    doc.moveDown();
  }

  // 💰 TOTAL BOX (FIXED POSITIONING)
  const boxY = doc.y;

  doc.rect(50, boxY, 500, 40).stroke();

  doc
    .fontSize(14)
    .text(`TOTAL: ${payment.amount.toLocaleString()} ${payment.currency}`, 60, boxY + 12);

  doc.moveDown(4);

  // 🙏 FOOTER
  doc
    .fontSize(10)
    .text('Thank you for your payment!', { align: 'center' })
    .text('This is a system-generated receipt.', { align: 'center' })
    .moveDown()
    .text('© Rurblist', { align: 'center' });

  doc.end();
};

const generateReceiptBuffer = (payment) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });

    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    try {
      // 🖼️ LOGO
      const logoPath = path.join(__dirname, '../assets/logo.png');
      doc.image(logoPath, 50, 40, { width: 100 });
    } catch (err) {
      // ignore if logo not found
    }

    // 🏢 COMPANY INFO
    doc
      .fontSize(20)
      .text('Rurblist', 400, 50, { align: 'right' })
      .fontSize(10)
      .text('Real Estate Platform', 400, 70, { align: 'right' })
      .text('support@rurblist.com', 400, 85, { align: 'right' });

    doc.moveDown(2);

    // 🧾 TITLE
    doc.fontSize(18).text('PAYMENT RECEIPT', { align: 'center' }).moveDown();

    // 🔹 LINE
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    doc.moveDown();

    // 📄 RECEIPT INFO
    doc.fontSize(11);

    doc.text(`Receipt ID: ${payment._id}`);
    doc.text(`Reference: ${payment.reference}`);
    doc.text(`Status: ${payment.status.toUpperCase()}`);
    doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);

    doc.moveDown();

    // 👤 CUSTOMER
    doc.fontSize(13).text('Customer Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Name: ${payment.user?.fullName || 'N/A'}`);
    doc.text(`Email: ${payment.user?.email || 'N/A'}`);
    doc.text(`Phone: ${payment.user?.phoneNumber || 'N/A'}`);

    doc.moveDown();

    // 🧑‍💼 AGENT
    if (payment.agent?.user) {
      doc.fontSize(13).text('Agent Details', { underline: true });
      doc.fontSize(11);
      doc.text(`Name: ${payment.agent.user.fullName}`);
      doc.text(`Email: ${payment.agent.user.email}`);
      doc.moveDown();
    }

    // 🏠 PROPERTY
    if (payment.property) {
      doc.fontSize(13).text('Property Details', { underline: true });
      doc.fontSize(11);
      doc.text(`Title: ${payment.property.title || 'N/A'}`);
      doc.moveDown();
    }

    // 🏠 TOUR
    if (payment.tour) {
      doc.fontSize(13).text('Tour Details', { underline: true });
      doc.fontSize(11);
      doc.text(`Tour Type: ${payment.tour.tourType}`);
      doc.text(`Date: ${new Date(payment.tour.date).toLocaleString()}`);
      doc.moveDown();
    }

    // 💰 PAYMENT SUMMARY
    doc.fontSize(13).text('Payment Summary', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;

    doc.fontSize(11).text('Description', 50, tableTop).text('Amount', 400, tableTop);

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    const itemY = tableTop + 25;

    doc
      .text(`${payment.paymentFor.toUpperCase()} PAYMENT`, 50, itemY)
      .text(`${payment.amount.toLocaleString()} ${payment.currency}`, 400, itemY);

    doc.moveDown(3);

    // 💵 TOTAL BOX
    const totalY = doc.y;

    doc
      .rect(50, totalY, 500, 40)
      .stroke()
      .fontSize(14)
      .text(`TOTAL: ${payment.amount.toLocaleString()} ${payment.currency}`, 60, totalY + 12);

    doc.moveDown(4);

    // 📝 FOOTER
    doc
      .fontSize(10)
      .text('Thank you for your payment!', { align: 'center' })
      .text('This receipt serves as proof of payment.', { align: 'center' })
      .moveDown()
      .text('© Rurblist. All rights reserved.', { align: 'center' });

    doc.end();
  });
};

module.exports = { generateReceipt, generateReceiptBuffer };
