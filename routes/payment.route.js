const express = require('express');
const Route = express.Router();
const Checker = require('../middlewares/checker');

const PaymentController = require('../controllers/paymentController');

// 💰 Payments
Route.post('/tour/:tourId', Checker.authmiddleware, PaymentController.payForTour);
Route.post('/property/:propertyId', Checker.authmiddleware, PaymentController.payForProperty);

// ✅ Verify (fallback)
Route.get('/verify', Checker.authmiddleware, PaymentController.verifyPayment);

// 🔔 Webhook (NO AUTH)
Route.post('/webhook', PaymentController.webhook);

Route.get('/:paymentId/receipt', Checker.authmiddleware, PaymentController.downloadReceipt);

Route.get('/reference/:reference', Checker.authmiddleware, PaymentController.getPaymentByReference);

module.exports = Route;
