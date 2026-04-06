import { usePublicMenu } from '../../context/PublicMenuContext';

const FavoritesPage = () => {
  const { restaurantInfo, setIsNavOpen } = usePublicMenu();

  return (
    <div className="min-h-screen bg-gray-50 pt-4 px-4">
      <button
        onClick={() => setIsNavOpen(true)}
        className="mb-4 px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold"
      >
        ☰ Menu
      </button>

      <div className="max-w-2xl mx-auto bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Favorite Items</h1>
        <p className="text-gray-600 mb-6">{restaurantInfo.name}</p>

        <div className="p-8 bg-gray-100 rounded-lg text-center">
          <p className="text-gray-500 text-lg">❤️ No favorites yet</p>
          <p className="text-gray-400 text-sm mt-2">Click the heart icon on menu items to add them</p>
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;
