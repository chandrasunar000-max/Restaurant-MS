import { usePublicMenu } from '../../context/PublicMenuContext';

const OrdersPage = () => {
  const { rid, tableNumber, isRoom, setIsNavOpen } = usePublicMenu();

  return (
    <div className="min-h-screen bg-gray-50 pt-4 px-4">
      <button
        onClick={() => setIsNavOpen(true)}
        className="mb-4 px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold"
      >
        ☰ Menu
      </button>

      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">My Orders</h1>
        <p className="text-gray-600">
          {isRoom ? 'Room' : 'Table'} {tableNumber}
        </p>
        <div className="mt-6 p-8 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-500 text-lg">No orders yet</p>
          <p className="text-gray-400 text-sm mt-2">Your orders will appear here</p>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
