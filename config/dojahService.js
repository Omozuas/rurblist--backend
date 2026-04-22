const axios = require('axios');

const DOJAH_BASE_URL = process.env.DOJAH_BASE_URL || 'https://sandbox.dojah.io/api/v1';

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
  /**
   * VERIFY NIN
   * @param {string} nin
   */
  static async verifyNIN(nin) {
    try {
      if (!nin) {
        throw new Error('NIN is required');
      }

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/nin`, {
        headers: getHeaders(),
        params: { nin: nin.toString() },
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      console.error('❌ NIN Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * VERIFY CAC
   * @param {string} cacNumber
   */
  static async verifyCAC(cacNumber) {
    try {
      if (!cacNumber) {
        throw new Error('CAC number is required');
      }

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/cac`, {
        headers: getHeaders(),
        params: { rc_number: cacNumber },
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      console.error('❌ CAC Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: error.response?.data || error.message,
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
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity || !!data,
        data,
      };
    } catch (error) {
      console.error('❌ BVN Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: error.response?.data || error.message,
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
        { headers: getHeaders() },
      );

      const data = response.data;

      return {
        success: true,
        isValid: data?.status === 'success' || data?.live === true || !!data,
        data,
      };
    } catch (error) {
      console.error('❌ Liveness Check Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        status: error.response?.status || 500,
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = DojahService;
