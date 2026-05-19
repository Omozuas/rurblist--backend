const paymentService = require('../paymentService');

module.exports = {
  payForTour: async (deps, input) => paymentService.payForTour(deps, input),
  payForProperty: async (deps, input) => paymentService.payForProperty(deps, input),
  verifyPayment: async (deps, input) => paymentService.verifyPayment(deps, input),
  sendReceiptIfNeeded: async (deps, input) => paymentService.sendReceiptIfNeeded(deps, input),
  webhook: async (deps, input) => paymentService.webhook(deps, input),
  processWebhook: async (deps, input) => paymentService.processWebhook(deps, input),
  downloadReceipt: async (deps, input) => paymentService.downloadReceipt(deps, input),
  getPaymentByReference: async (deps, input) =>
    paymentService.getPaymentByReference(deps, input),
};
