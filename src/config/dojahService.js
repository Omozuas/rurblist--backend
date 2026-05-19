const axios = require('axios');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const DOJAH_BASE_URL = process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io/api/v1';
const DOJAH_TIMEOUT = Number(process.env.DOJAH_TIMEOUT_MS) || 30000;

function getHeaders() {
  const appId = process.env.DOJAH_APP_ID;
  const secretKey = process.env.DOJAH_SECRET_KEY;

  if (!appId) {
    throw new AppError('DOJAH_APP_ID is missing', 500);
  }

  if (!secretKey) {
    throw new AppError('DOJAH_SECRET_KEY is missing', 500);
  }

  return {
    AppId: appId,
    Authorization: secretKey,
    'Content-Type': 'application/json',
  };
}

class DojahService {
  static getErrorMessage(error) {
    return error.response?.data?.message || error.response?.data?.error || error.message;
  }

  static buildErrorResponse(error) {
    return {
      statusCode: error.response?.status || error.statusCode || 500,
      error: DojahService.getErrorMessage(error),
    };
  }

  static async verifyNIN(nin, callbackErr) {
    try {
      if (!nin) {
        throw new AppError('NIN is required', 400);
      }

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/nin`, {
        headers: getHeaders(),
        params: { nin: nin.toString() },
        timeout: DOJAH_TIMEOUT,
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      const errorResponse = DojahService.buildErrorResponse(error);

      if (typeof callbackErr === 'function') {
        callbackErr(errorResponse);
      }

      logger.error('NIN verification failed', {
        status: errorResponse.statusCode,
        message: errorResponse.error,
      });

      return {
        success: false,
        isValid: false,
        status: errorResponse.statusCode,
        statusCode: errorResponse.statusCode,
        error: errorResponse.error,
      };
    }
  }

  static async verifyCAC(cacNumber, callbackErr) {
    try {
      if (!cacNumber) {
        throw new AppError('CAC number is required', 400);
      }

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/cac`, {
        headers: getHeaders(),
        params: { rc_number: cacNumber },
        timeout: DOJAH_TIMEOUT,
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      const errorResponse = DojahService.buildErrorResponse(error);

      if (typeof callbackErr === 'function') {
        callbackErr(errorResponse);
      }

      logger.error('CAC verification failed', {
        status: errorResponse.statusCode,
        message: errorResponse.error,
      });

      return {
        success: false,
        isValid: false,
        status: errorResponse.statusCode,
        statusCode: errorResponse.statusCode,
        error: errorResponse.error,
      };
    }
  }

  static async verifyBVN(bvn) {
    try {
      if (!bvn) {
        throw new AppError('BVN is required', 400);
      }

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/bvn`, {
        headers: getHeaders(),
        params: { bvn },
        timeout: DOJAH_TIMEOUT,
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      const errorResponse = DojahService.buildErrorResponse(error);

      logger.error('BVN verification failed', {
        status: errorResponse.statusCode,
        message: errorResponse.error,
      });

      return {
        success: false,
        isValid: false,
        status: errorResponse.statusCode,
        statusCode: errorResponse.statusCode,
        error: errorResponse.error,
      };
    }
  }

  static async verifyLiveness(imageUrl) {
    try {
      if (!imageUrl) {
        throw new AppError('Image is required for liveness', 400);
      }

      const response = await axios.post(
        `${DOJAH_BASE_URL}/kyc/liveness`,
        { image: imageUrl },
        { headers: getHeaders(), timeout: DOJAH_TIMEOUT },
      );

      const data = response.data;

      return {
        success: true,
        isValid: data?.status === 'success' || data?.live === true || !!data,
        data,
      };
    } catch (error) {
      const errorResponse = DojahService.buildErrorResponse(error);

      logger.error('Liveness check failed', {
        status: errorResponse.statusCode,
        message: errorResponse.error,
      });

      return {
        success: false,
        isValid: false,
        status: errorResponse.statusCode,
        statusCode: errorResponse.statusCode,
        error: errorResponse.error,
      };
    }
  }
}

module.exports = DojahService;
