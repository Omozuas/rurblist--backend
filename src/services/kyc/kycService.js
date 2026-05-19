const KycUseCases = require('./useCases/KycUseCases');

module.exports = {
  verifyNIN: KycUseCases.verifyNIN,
  verifyBVN: KycUseCases.verifyBVN,
  verifyCAC: KycUseCases.verifyCAC,
};
