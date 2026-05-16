const crypto = require('crypto');

function generateOtp(length = 6) {
  const size = Number(length);

  if (!Number.isInteger(size) || size < 4 || size > 10) {
    throw new Error('OTP length must be an integer between 4 and 10');
  }

  const min = 10 ** (size - 1);
  const max = 10 ** size;

  return crypto.randomInt(min, max).toString();
}

module.exports = generateOtp;
