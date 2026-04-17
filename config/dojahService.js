const axios = require('axios');

const DOJAH_BASE_URL = 'https://api.dojah.io/api/v1';

const headers = {
  AppId: process.env.DOJAH_APP_ID,
  Authorization: process.env.DOJAH_SECRET_KEY,
  'Content-Type': 'application/json',
};

class DojahService {
  /**
   * ✅ VERIFY NIN
   * @param {String} nin
   */
  static async verifyNIN(nin) {
    try {
      if (!nin) throw new Error('NIN is required');

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/nin`, {
        headers,
        params: { nin },
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity,
        data,
      };
    } catch (error) {
      console.error('❌ NIN Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * ✅ VERIFY CAC
   * @param {String} cacNumber
   */
  static async verifyCAC(cacNumber) {
    try {
      if (!cacNumber) throw new Error('CAC number is required');

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/cac`, {
        headers,
        params: { rc_number: cacNumber },
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity,
        data,
      };
    } catch (error) {
      console.error('❌ CAC Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // ===============================
  // ✅ VERIFY BVN
  // ===============================
  static async verifyBVN(bvn) {
    try {
      if (!bvn) throw new Error('BVN is required');

      const response = await axios.get(`${DOJAH_BASE_URL}/kyc/bvn`, {
        headers,
        params: { bvn },
      });

      const data = response.data;

      return {
        success: true,
        isValid: !!data?.entity,
        data,
      };
    } catch (error) {
      console.error('❌ BVN Verification Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        error: error.response?.data || error.message,
      };
    }
  }

  // ===============================
  // ✅ VERIFY LIVENESS
  // ===============================
  static async verifyLiveness(imageUrl) {
    try {
      if (!imageUrl) throw new Error('Image is required for liveness');

      const response = await axios.post(
        `${DOJAH_BASE_URL}/kyc/liveness`,
        {
          image: imageUrl, // 👈 can be URL or base64 depending on Dojah setup
        },
        {
          headers,
        },
      );

      const data = response.data;

      return {
        success: true,
        isValid: data?.status === 'success' || data?.live === true,
        data,
      };
    } catch (error) {
      console.error('❌ Liveness Check Error:', error.response?.data || error.message);

      return {
        success: false,
        isValid: false,
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = DojahService;
