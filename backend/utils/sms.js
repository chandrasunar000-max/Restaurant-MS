import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_TOKEN = process.env.MESSAGECENTRAL_AUTH_TOKEN;
const CUSTOMER_ID = 'C-E93BD18F6FE747D';

/**
 * Send an OTP via SMS using Message Central (Managed OTP)
 * @param {string} phoneNumber - The recipient's 10-digit phone number
 * @returns {Promise<any>} - Returns the API response containing verificationId
 */
export const sendOTP = async (phoneNumber) => {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    
    // Previous custom message logic (commented out)
    /*
    const SENDER_ID = process.env.MESSAGE_SENDER_ID;
    const response = await axios.post(
      "https://cpaas.messagecentral.com/sms/v3/send",
      null,
      {
        params: {
          countryCode: "91",
          mobileNumber: cleanPhone,
          flowType: "SMS",
          message: `Your OrderByQR verification code is: \${otp}. This code expires in 10 minutes.`,
          senderId: SENDER_ID
        },
        headers: {
          authToken: AUTH_TOKEN
        }
      }
    );
    */

    // New logic: Managed OTP (Message Central generates the OTP)
    const response = await axios.post(
      "https://cpaas.messagecentral.com/verification/v3/send",
      null,
      {
        params: {
          countryCode: "91",
          customerId: CUSTOMER_ID,
          flowType: "SMS",
          mobileNumber: cleanPhone
        },
        headers: {
          authToken: AUTH_TOKEN
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending OTP with Message Central:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send OTP');
  }
};

/**
 * Validate an OTP using Message Central
 * @param {string} phoneNumber - Recipient's phone number
 * @param {string} verificationId - ID received from the sendOTP call
 * @param {string} code - The OTP entered by the user
 * @returns {Promise<any>}
 */
export const validateOTP = async (phoneNumber, verificationId, code) => {
  try {
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const response = await axios.get(
      "https://cpaas.messagecentral.com/verification/v3/validateOtp",
      {
        params: {
          countryCode: "91",
          mobileNumber: cleanPhone,
          verificationId: verificationId,
          customerId: CUSTOMER_ID,
          code: code
        },
        headers: {
          authToken: AUTH_TOKEN
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error validating OTP with Message Central:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to validate OTP');
  }
};
