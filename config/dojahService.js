const axios = require('axios');

const DOJAH_BASE_URL = process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io/api/v1';
const DOJAH_TIMEOUT = 30000;

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

  /**
   * VERIFY NIN
   * @param {string} nin
   */
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

  /**
   * VERIFY CAC
   * @param {string} cacNumber
   */
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

  /**
   * VERIFY BVN
   * @param {string} bvn
   */
  static async verifyBVN(bvn) {
    try {
      if (!bvn) {
        throw new Error('BVN is required');
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
      const errorMessage = DojahService.getErrorMessage(error);
      console.error('BVN Verification Error:', {
        status: error.response?.status,
        message: errorMessage,
      });

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: errorMessage,
      };
    }
  }

  /**
   * VERIFY LIVENESS
   * @param {string} imageUrl
   */
  static async verifyLiveness(imageUrl) {
    try {
      if (!imageUrl) {
        throw new Error('Image is required for liveness');
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
      const errorMessage = DojahService.getErrorMessage(error);
      console.error('Liveness Check Error:', {
        status: error.response?.status,
        message: errorMessage,
      });

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: errorMessage,
      };
    }
  }
}

module.exports = DojahService;
