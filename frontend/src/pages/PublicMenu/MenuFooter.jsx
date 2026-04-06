import { 
  UtensilsCrossed, 
  Receipt, 
  ShoppingCart, 
  ReceiptText // New icon for Bill
} from 'lucide-react';

export default function MenuFooter({
  activeTab = 'Menu',
  orderNotificationCount = 0,
  cartCount = 0,
  showCart = false,
  setShowCart = () => {},
  onOrdersClick = () => {},
  onBillClick = () => {}, // New prop for bill click
}) {

  // Theme Constants
  const darkRed = "#991b1b";

  // Helper function to get tab classes
  const getTabClass = (tabName) => {
    const isActive = activeTab === tabName;
    return `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
      isActive ? 'text-red-700' : 'text-gray-400 hover:text-gray-500'
    }`;
  };

  return (
    <>
      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)] z-40 pb-safe">
        <nav className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          
          {/* 1. Menu Tab */}
          <button 
            onClick={() => {}}
            className={getTabClass('Menu')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', height: '100%' }}
          >
            <UtensilsCrossed className={`w-6 h-6 ${activeTab === 'Menu' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-bold tracking-wide">Menu</span>
          </button>

          {/* 2. Orders Tab (placeholder) */}
          <button 
            onClick={onOrdersClick}
            className={getTabClass('Orders')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', height: '100%' }}
          >
            <div style={{ position: 'relative' }}>
              <Receipt className={`w-6 h-6 ${activeTab === 'Orders' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {orderNotificationCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  border: '2px solid white'
                }} />
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide">Orders</span>
          </button>

          {/* 3. Cart Tab */}
          <button 
            onClick={() => setShowCart(!showCart)}
            className={getTabClass('Cart')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', height: '100%', marginBottom: '4px' }}
          >
            <div style={{ position: 'relative' }}>
              <ShoppingCart className={`w-6 h-6 ${showCart ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: darkRed,
                  border: '2px solid white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wide">Cart</span>
          </button>

          {/* 4. Bill Tab */}
          <button 
            onClick={onBillClick}
            className={getTabClass('Bill')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', height: '100%' }}
          >
            <ReceiptText className={`w-6 h-6 ${activeTab === 'Bill' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className="text-[10px] font-bold tracking-wide">Bill</span>
          </button>

        </nav>
      </footer>
    </>
  );
}
