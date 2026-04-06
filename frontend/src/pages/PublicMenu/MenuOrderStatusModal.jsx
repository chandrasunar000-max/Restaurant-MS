import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

const MenuOrderStatusModal = ({ show, message, isError, onClose, orderId }) => {
  if (!show) return null;

  const primaryColor = "#991b1b"; // darkRed from other components
  const successColor = "#10b981"; // Green
  const errorColor = "#ef4444";  // Red
  const darkGrey = "#1f2937";
  const mediumGrey = "#6b7280";

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 200, // Same as Order Confirmation Modal
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: '380px',
          borderRadius: '20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          animation: 'modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          padding: '30px 20px',
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          {isError ? (
            <XCircle size={60} color={errorColor} style={{ margin: '0 auto', marginBottom: '15px' }} />
          ) : (
            <CheckCircle size={60} color={successColor} style={{ margin: '0 auto', marginBottom: '15px' }} />
          )}
          <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: darkGrey, marginBottom: '10px' }}>
            {isError ? 'Order Failed!' : 'Order Placed!'}
          </h3>
          <p style={{ margin: 0, fontSize: '15px', color: mediumGrey, lineHeight: '1.4' }}>
            {message}
          </p>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: isError ? errorColor : primaryColor,
            color: '#fff',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'background 0.2s',
            width: '100%',
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default MenuOrderStatusModal;
