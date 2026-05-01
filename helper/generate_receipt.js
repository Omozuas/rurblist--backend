const PDFDocument = require('pdfkit');
const path = require('path');

/*
const generateReceipt = (payment, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=receipt-${payment.reference}.pdf`);

  doc.pipe(res);

  // ===============================
  // 🖼️ LOGO
  // ===============================
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    doc.image(logoPath, 50, 45, { width: 100 });
  } catch (err) {}

  // ===============================
  // 🏢 COMPANY
  // ===============================
  doc
    .fontSize(20)
    .text('Rurblist', 400, 50, { align: 'right' })
    .fontSize(10)
    .text('www.rurblist.com', 400, 70, { align: 'right' });

  doc.moveDown(2);

  // ===============================
  // 🧾 TITLE
  // ===============================
  doc.fontSize(18).text('PAYMENT RECEIPT', { align: 'center' }).moveDown();

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  // ===============================
  // 📄 DETAILS
  // ===============================
  doc.fontSize(11);

  doc.text(`Reference: ${payment.reference}`);
  doc.text(`Status: ${payment.status.toUpperCase()}`);
  doc.text(`Amount: ${payment.amount.toLocaleString()} ${payment.currency}`);
  doc.text(`Payment For: ${payment.paymentFor.toUpperCase()}`);
  doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);

  doc.moveDown();

  // ===============================
  // 👤 CUSTOMER
  // ===============================
  doc.fontSize(13).text('Customer Details', { underline: true });
  doc.fontSize(11);
  doc.text(`Name: ${payment.user?.fullName || 'N/A'}`);
  doc.text(`Email: ${payment.user?.email || 'N/A'}`);

  doc.moveDown();

  // ===============================
  // 🧑‍💼 AGENT
  // ===============================
  if (payment.agent?.user) {
    doc.fontSize(13).text('Agent Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Name: ${payment.agent.user.fullName}`);
    doc.text(`Email: ${payment.agent.user.email}`);
    doc.moveDown();
  }

  // ===============================
  // 🏠 PROPERTY
  // ===============================
  if (payment.property) {
    doc.fontSize(13).text('Property Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Title: ${payment.property.title || 'N/A'}`);
    doc.moveDown();
  }

  // ===============================
  // 🏠 TOUR
  // ===============================
  if (payment.tour) {
    doc.fontSize(13).text('Tour Details', { underline: true });
    doc.fontSize(11);
    doc.text(`Date: ${new Date(payment.tour.date).toLocaleString()}`);
    doc.moveDown();
  }

  // ===============================
  // 📦 PLAN (🔥 NEW)
  // ===============================
  if (payment.plan) {
    doc.fontSize(13).text('Plan Details', { underline: true });
    doc.fontSize(11);

    doc.text(`Plan Name: ${payment.plan.name || 'N/A'}`);
    doc.text(`Plan Amount: ${payment.plan.amount || 0} ${payment.currency}`);

    doc.moveDown(0.5);

    if (payment.plan.features && payment.plan.features.length > 0) {
      doc.fontSize(12).text('Plan Features:', { underline: true });
      doc.fontSize(10);

      payment.plan.features.forEach((feature) => {
        doc.text(`• ${feature}`);
      });
    }

    doc.moveDown();
  }

  // ===============================
  // 💰 PAYMENT BREAKDOWN (🔥 IMPROVED)
  // ===============================
  doc.fontSize(13).text('Payment Summary', { underline: true });
  doc.moveDown(0.5);

  let currentY = doc.y;

  // Property / Tour
  doc
    .fontSize(11)
    .text(`${payment.paymentFor.toUpperCase()} PAYMENT`, 50, currentY)
    .text(`${payment.amount.toLocaleString()} ${payment.currency}`, 400, currentY);

  currentY += 20;

  // Plan
  if (payment.plan) {
    doc
      .text(`PLAN (${payment.plan.name})`, 50, currentY)
      .text(`${payment.plan.amount.toLocaleString()} ${payment.currency}`, 400, currentY);

    currentY += 20;
  }

  doc.moveDown(3);

  // ===============================
  // 💵 TOTAL BOX
  // ===============================
  const boxY = doc.y;

  doc.rect(50, boxY, 500, 40).stroke();

  doc
    .fontSize(14)
    .text(`TOTAL: ${payment.amount.toLocaleString()} ${payment.currency}`, 60, boxY + 12);

  doc.moveDown(4);

  // ===============================
  // 🙏 FOOTER
  // ===============================
  doc
    .fontSize(10)
    .text('Thank you for your payment!', { align: 'center' })
    .text('This is a system-generated receipt.', { align: 'center' })
    .moveDown()
    .text('© Rurblist', { align: 'center' });

  doc.end();
};
*/

/*
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
    // 📦 PLAN
    if (payment.plan) {
      doc.fontSize(13).text('Plan Details', { underline: true });
      doc.fontSize(11);

      doc.text(`Plan Name: ${payment.plan.name || 'N/A'}`);
      doc.text(`Plan Amount: ${payment.plan.amount || 0} ${payment.currency}`);

      doc.moveDown(0.5);

      // ✨ FEATURES
      if (payment.plan.features && payment.plan.features.length > 0) {
        doc.fontSize(12).text('Plan Features:', { underline: true });
        doc.fontSize(10);

        payment.plan.features.forEach((feature, index) => {
          doc.text(`• ${feature}`);
        });
      }

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

    let currentY = tableTop + 25;

    // PROPERTY / TOUR
    doc
      .text(`${payment.paymentFor.toUpperCase()} PAYMENT`, 50, currentY)
      .text(`${payment.amount.toLocaleString()} ${payment.currency}`, 400, currentY);

    currentY += 20;

    // PLAN LINE (if exists)
    if (payment.plan) {
      doc
        .text(`PLAN (${payment.plan.name})`, 50, currentY)
        .text(`${payment.plan.amount.toLocaleString()} ${payment.currency}`, 400, currentY);

      currentY += 20;
    }

    doc.moveDown(3);

    // ===============================
    // 💵 TOTAL
    // ===============================
    const totalY = doc.y;

    doc
      .rect(50, totalY, 500, 40)
      .stroke()
      .fontSize(14)
      .text(`TOTAL: ${payment.amount.toLocaleString()} ${payment.currency}`, 60, totalY + 12);

    doc.moveDown(4);

    // ===============================
    // 📝 FOOTER
    // ===============================
    doc
      .fontSize(10)
      .text('Thank you for your payment!', { align: 'center' })
      .text('This receipt serves as proof of payment.', { align: 'center' })
      .moveDown()
      .text('© Rurblist. All rights reserved.', { align: 'center' });

    doc.end();
  });
};
*/

const generateReceipt = (payment, res) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.reference}.pdf`);

  doc.pipe(res);

  // ===============================
  // 🎨 HEADER BACKGROUND
  // ===============================
  doc.rect(0, 0, 600, 120).fill('#ec6c10');

  // ===============================
  // 🖼️ LOGO
  // ===============================
  try {
    const logoPath = path.join(__dirname, '../assets/logo.png');
    doc.image(logoPath, 50, 38, { width: 55 });
  } catch (err) {}

  // ===============================
  // 🏢 COMPANY INFO
  // ===============================
  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .text('Rurblist', 400, 40, { align: 'right' })
    .fontSize(10)
    .text('Real Estate Platform', 400, 65, { align: 'right' })
    .text('support@rurblist.com', 400, 80, { align: 'right' });

  doc.fillColor('#000'); // reset color

  doc.moveDown(4);

  // ===============================
  // 🧾 INVOICE TITLE
  // ===============================
  doc.fontSize(22).text('INVOICE', { align: 'center' });

  doc.moveDown();

  // ===============================
  // 📄 META INFO
  // ===============================
  doc.fontSize(11);

  doc.text(`Reference: ${payment.reference}`);
  doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);
  doc.text(`Status: ${payment.status.toUpperCase()}`);

  doc.moveDown();

  // ===============================
  // 👤 CUSTOMER
  // ===============================
  doc.fontSize(13).text('Bill To', { underline: true });
  doc.fontSize(11);
  doc.text(payment.user?.fullName || 'N/A');
  doc.text(payment.user?.email || 'N/A');

  doc.moveDown();

  // ===============================
  // 📊 TABLE HEADER
  // ===============================
  const tableTop = doc.y;

  doc
    .fontSize(12)
    .fillColor('#ec6c10')
    .text('Description', 50, tableTop)
    .text('Qty', 300, tableTop)
    .text('Price', 350, tableTop)
    .text('Total', 450, tableTop);

  doc.fillColor('#000');

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  let y = tableTop + 25;

  // ===============================
  // 🏠 PROPERTY ROW
  // ===============================
  if (payment.property) {
    doc
      .fontSize(11)
      .text(`Property: ${payment.property.title}`, 50, y)
      .text('1', 300, y)
      .text(payment.amount.toLocaleString(), 350, y)
      .text(payment.amount.toLocaleString(), 450, y);

    y += 20;
  }

  if (payment.tour) {
    doc
      .text(`Tour: ${payment.tour.tourType}`, 50, y)
      .text('1', 300, y)
      .text(payment.amount.toLocaleString(), 350, y)
      .text(payment.amount.toLocaleString(), 450, y);

    y += 20;
  }

  // ===============================
  // 📦 PLAN ROW
  // ===============================
  if (payment.plan) {
    doc
      .text(`Plan: ${payment.plan.name}`, 50, y)
      .text('1', 300, y)
      .text(payment.plan.amount.toLocaleString(), 350, y)
      .text(payment.plan.amount.toLocaleString(), 450, y);

    y += 20;

    // Features (indented)
    if (payment.plan.features?.length > 0) {
      payment.plan.features.forEach((f) => {
        doc.fontSize(9).fillColor('#555').text(`• ${f}`, 60, y);
        y += 15;
      });
      doc.fillColor('#000');
    }
  }

  doc.moveDown(2);

  // ===============================
  // 💰 TOTAL BOX
  // ===============================
  const totalY = y + 20;

  doc.rect(300, totalY, 250, 50).fillAndStroke('#f5f5f5', '#ccc');

  doc
    .fillColor('#000')
    .fontSize(12)
    .text('TOTAL', 320, totalY + 15)
    .fontSize(14)
    .text(`${payment.amount.toLocaleString()} ${payment.currency}`, 450, totalY + 15);

  doc.moveDown(4);

  // ===============================
  // 🙏 FOOTER
  // ===============================
  doc
    .fontSize(10)
    .fillColor('#777')
    .text('Thank you for your business!', { align: 'center' })
    .text('This is a system-generated invoice.', { align: 'center' })
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

    // ===============================
    // 🎨 HEADER
    // ===============================
    doc.rect(0, 0, 600, 120).fill('#ec6c10');

    try {
      const logoPath = path.join(__dirname, '../assets/logo.png');
      doc.image(logoPath, 50, 38, { width: 55 });
    } catch (err) {}
    doc
      .fillColor('#fff')
      .fontSize(20)
      .text('Rurblist', 400, 40, { align: 'right' })
      .fontSize(10)
      .text('Real Estate Platform', 400, 65, { align: 'right' })
      .text('support@rurblist.com', 400, 80, { align: 'right' });

    doc.fillColor('#000');
    doc.moveDown(4);

    // ===============================
    // 🧾 TITLE
    // ===============================
    doc.fontSize(22).text('INVOICE', { align: 'center' }).moveDown();

    // ===============================
    // 📄 META
    // ===============================
    doc.fontSize(11);
    doc.text(`Reference: ${payment.reference}`);
    doc.text(`Status: ${payment.status.toUpperCase()}`);
    doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);

    doc.moveDown();

    // ===============================
    // 👤 CUSTOMER
    // ===============================
    doc.fontSize(13).text('Bill To', { underline: true });
    doc.fontSize(11);
    doc.text(payment.user?.fullName || 'N/A');
    doc.text(payment.user?.email || 'N/A');

    doc.moveDown();

    // ===============================
    // 📊 TABLE HEADER
    // ===============================
    const tableTop = doc.y;

    doc
      .fontSize(12)
      .fillColor('#ec6c10')
      .text('Description', 50, tableTop)
      .text('Qty', 300, tableTop)
      .text('Price', 350, tableTop)
      .text('Total', 450, tableTop);

    doc.fillColor('#000');

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    let y = tableTop + 25;

    // ===============================
    // 🏠 PROPERTY / TOUR
    // ===============================
    if (payment.property) {
      doc
        .fontSize(11)
        .text(`Property: ${payment.property.title}`, 50, y)
        .text('1', 300, y)
        .text(payment.amount.toLocaleString(), 350, y)
        .text(payment.amount.toLocaleString(), 450, y);

      y += 20;
    }

    if (payment.tour) {
      doc
        .text(`Tour: ${payment.tour.tourType}`, 50, y)
        .text('1', 300, y)
        .text(payment.amount.toLocaleString(), 350, y)
        .text(payment.amount.toLocaleString(), 450, y);

      y += 20;
    }

    // ===============================
    // 📦 PLAN
    // ===============================
    if (payment.plan) {
      doc
        .text(`Plan: ${payment.plan.name}`, 50, y)
        .text('1', 300, y)
        .text(payment.plan.amount.toLocaleString(), 350, y)
        .text(payment.plan.amount.toLocaleString(), 450, y);

      y += 20;

      // Features
      if (payment.plan.features?.length > 0) {
        payment.plan.features.forEach((f) => {
          doc.fontSize(9).fillColor('#555').text(`• ${f}`, 60, y);
          y += 15;
        });
        doc.fillColor('#000');
      }
    }

    doc.moveDown(2);

    // ===============================
    // 💰 TOTAL BOX
    // ===============================
    const totalY = y + 20;

    doc.rect(300, totalY, 250, 50).fillAndStroke('#f5f5f5', '#ccc');

    doc
      .fillColor('#000')
      .fontSize(12)
      .text('TOTAL', 320, totalY + 15)
      .fontSize(14)
      .text(`${payment.amount.toLocaleString()} ${payment.currency}`, 450, totalY + 15);

    doc.moveDown(4);

    // ===============================
    // 📝 FOOTER
    // ===============================
    doc
      .fontSize(10)
      .fillColor('#777')
      .text('Thank you for your business!', { align: 'center' })
      .text('This receipt serves as proof of payment.', { align: 'center' })
      .moveDown()
      .text('© Rurblist', { align: 'center' });

    doc.end();
  });
};

module.exports = { generateReceipt, generateReceiptBuffer };
