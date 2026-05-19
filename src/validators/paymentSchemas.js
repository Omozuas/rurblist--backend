const { hasString, isNumberLike, validate } = require('./common');

const allowedCurrencies = new Set(['NGN']);
const allowedPaymentMethods = new Set([
  'card',
  'bank',
  'ussd',
  'qr',
  'mobile_money',
  'bank_transfer',
]);

const verifyPaymentSchema = {
  reference: (v) => (hasString(v) ? null : 'reference is required'),
};

const payForTourSchema = {
  currency: (v) => (v === undefined || allowedCurrencies.has(v) ? null : 'currency is invalid'),
  paymentMethod: (v) =>
    v === undefined || allowedPaymentMethods.has(v) ? null : 'paymentMethod is invalid',
};

const payForPropertySchema = {
  currency: (v) => (v === undefined || allowedCurrencies.has(v) ? null : 'currency is invalid'),
  enscrowFee: (v) =>
    v === undefined || isNumberLike(v) ? null : 'enscrowFee must be a valid number',
  paymentMethod: (v) =>
    v === undefined || allowedPaymentMethods.has(v) ? null : 'paymentMethod is invalid',
};

module.exports = {
  validate,
  verifyPaymentSchema,
  payForTourSchema,
  payForPropertySchema,
};
