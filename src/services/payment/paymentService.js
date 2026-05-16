const PaymentUseCases = require('./useCases/PaymentUseCases');

module.exports = {
  payForTour: PaymentUseCases.payForTour,
  payForProperty: PaymentUseCases.payForProperty,
  verifyPayment: PaymentUseCases.verifyPayment,
  sendReceiptIfNeeded: PaymentUseCases.sendReceiptIfNeeded,
  webhook: PaymentUseCases.webhook,
  processWebhook: PaymentUseCases.processWebhook,
  downloadReceipt: PaymentUseCases.downloadReceipt,
  getPaymentByReference: PaymentUseCases.getPaymentByReference,
};
