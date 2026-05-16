const axios = require('axios');

const DOJAH_BASE_URL = process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io/api/v1';
const DOJAH_TIMEOUT = Number(process.env.DOJAH_TIMEOUT_MS) || 30000;

function getHeaders() {
  const appId = process.env.DOJAH_APP_ID;
  const secretKey = process.env.DOJAH_SECRET_KEY;

  if (!appId) {
    throw new Error('DOJAH_APP_ID is missing');
  }

  if (!secretKey) {
    throw new Error('DOJAH_SECRET_KEY is missing');
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
        const error = new Error('NIN is required');
        error.statusCode = 400;
        throw error;
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

      console.error('NIN Verification Error:', {
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
        const error = new Error('CAC number is required');
        error.statusCode = 400;
        throw error;
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

      console.error('CAC Verification Error:', {
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
        const error = new Error('BVN is required');
        error.statusCode = 400;
        throw error;
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

      console.error('BVN Verification Error:', {
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
        const error = new Error('Image is required for liveness');
        error.statusCode = 400;
        throw error;
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

      console.error('Liveness Check Error:', {
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
