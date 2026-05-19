const PDFDocument = require('pdfkit');
const path = require('path');

const brandColor = '#ec6c10';
const logoPath = path.join(process.cwd(), 'assets', 'logo.png');

function formatAmount(value = 0, currency = '') {
  return `${Number(value || 0).toLocaleString()} ${currency}`.trim();
}

function safeUpper(value = '') {
  return String(value || '').toUpperCase();
}

function drawLogo(doc) {
  try {
    doc.image(logoPath, 50, 38, { width: 55 });
  } catch {
    // Receipt generation should continue if the optional logo asset is unavailable.
  }
}

function drawHeader(doc) {
  doc.rect(0, 0, 600, 120).fill(brandColor);
  drawLogo(doc);

  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .text('Rurblist', 400, 40, { align: 'right' })
    .fontSize(10)
    .text('Real Estate Platform', 400, 65, { align: 'right' })
    .text('support@rurblist.com', 400, 80, { align: 'right' });

  doc.fillColor('#000000');
  doc.moveDown(4);
}

function drawMeta(doc, payment) {
  doc.fontSize(22).text('INVOICE', { align: 'center' });
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Reference: ${payment.reference}`);
  doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleString()}`);
  doc.text(`Status: ${safeUpper(payment.status)}`);
  doc.moveDown();

  doc.fontSize(13).text('Bill To', { underline: true });
  doc.fontSize(11);
  doc.text(payment.user?.fullName || 'N/A');
  doc.text(payment.user?.email || 'N/A');
  doc.moveDown();
}

function drawTableHeader(doc) {
  const tableTop = doc.y;

  doc
    .fontSize(12)
    .fillColor(brandColor)
    .text('Description', 50, tableTop)
    .text('Qty', 300, tableTop)
    .text('Price', 350, tableTop)
    .text('Total', 450, tableTop);

  doc.fillColor('#000000');
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

  return tableTop + 25;
}

function drawLineItem(doc, description, amount, currency, y) {
  doc
    .fontSize(11)
    .fillColor('#000000')
    .text(description, 50, y)
    .text('1', 300, y)
    .text(Number(amount || 0).toLocaleString(), 350, y)
    .text(Number(amount || 0).toLocaleString(), 450, y);

  return y + 20;
}

function drawPaymentRows(doc, payment) {
  let y = drawTableHeader(doc);

  if (payment.property) {
    y = drawLineItem(doc, `Property: ${payment.property.title}`, payment.amount, payment.currency, y);
  }

  if (payment.tour) {
    y = drawLineItem(doc, `Tour: ${payment.tour.tourType}`, payment.amount, payment.currency, y);
  }

  if (payment.plan) {
    y = drawLineItem(doc, `Plan: ${payment.plan.name}`, payment.plan.amount, payment.currency, y);

    if (payment.plan.features?.length > 0) {
      payment.plan.features.forEach((feature) => {
        doc.fontSize(9).fillColor('#555555').text(`- ${feature}`, 60, y);
        y += 15;
      });

      doc.fillColor('#000000');
    }
  }

  return y;
}

function drawTotal(doc, payment, y) {
  const totalY = y + 20;

  doc.rect(300, totalY, 250, 50).fillAndStroke('#f5f5f5', '#cccccc');

  doc
    .fillColor('#000000')
    .fontSize(12)
    .text('TOTAL', 320, totalY + 15)
    .fontSize(14)
    .text(formatAmount(payment.amount, payment.currency), 450, totalY + 15);

  doc.moveDown(4);
}

function drawFooter(doc, message) {
  doc
    .fontSize(10)
    .fillColor('#777777')
    .text('Thank you for your business!', { align: 'center' })
    .text(message, { align: 'center' })
    .moveDown()
    .text('(c) Rurblist', { align: 'center' });
}

function drawReceipt(doc, payment, footerMessage) {
  drawHeader(doc);
  drawMeta(doc, payment);
  const endY = drawPaymentRows(doc, payment);
  drawTotal(doc, payment, endY);
  drawFooter(doc, footerMessage);
}

function generateReceipt(payment, res) {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment.reference}.pdf`);

  doc.pipe(res);
  drawReceipt(doc, payment, 'This is a system-generated invoice.');
  doc.end();
}

function generateReceiptBuffer(payment) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    drawReceipt(doc, payment, 'This receipt serves as proof of payment.');
    doc.end();
  });
}

module.exports = { generateReceipt, generateReceiptBuffer };
