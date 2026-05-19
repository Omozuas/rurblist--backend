const verifyNIN = async (deps, input) => {
  const { DojahService } = deps;
  const { nin } = input;

  return DojahService.verifyNIN(nin);
};

const verifyBVN = async (deps, input) => {
  const { DojahService } = deps;
  const { bvn } = input;

  return DojahService.verifyBVN(bvn);
};

const verifyCAC = async (deps, input) => {
  const { DojahService } = deps;
  const { cacNumber } = input;

  return DojahService.verifyCAC(cacNumber);
};

module.exports = {
  verifyNIN,
  verifyBVN,
  verifyCAC,
};
