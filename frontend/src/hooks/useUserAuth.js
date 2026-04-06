import { useContext } from 'react';
import AuthContext from '../context/AuthContext';

const useUserAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Fallback if AuthProvider is not wrapping the component
    // This maintains backward compatibility if some parts of the app are not wrapped yet
    // though it's better to wrap the whole App.
    return {
        user: null,
        token: localStorage.getItem('token'),
        isAuthenticated: false,
        isVerifyingToken: false,
        loading: false,
        error: '',
        logout: () => {},
        loginSuccess: () => {},
    };
  }
  return context;
};

export default useUserAuth;
