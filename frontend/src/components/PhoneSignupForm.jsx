import React, { useState } from 'react';

const PhoneSignupForm = ({ onSuccess, onError, isLoading }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate inputs
    if (!phoneNumber.trim()) {
      setFormError('Phone number is required');
      return;
    }

    if (!firstName.trim()) {
      setFormError('Name is required');
      return;
    }

    // Validate phone number (at least 10 digits)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Phone number must be at least 10 digits');
      return;
    }

    // Call the onSuccess handler with phone and name
    onSuccess({ phoneNumber: phoneNumber.trim(), firstName: firstName.trim() });

    // Reset form
    setPhoneNumber('');
    setFirstName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Phone Input */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name
        </label>
        <input
          type="text"
          id="name"
          placeholder="Enter your full name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>

      {/* Error Message */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          {formError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
      >
        {isLoading ? 'Creating Account...' : 'Sign Up with Phone'}
      </button>
    </form>
  );
};

export default PhoneSignupForm;
