import { Routes, Route, Navigate } from 'react-router-dom';
import { FeedPage } from '@/pages/Feed';
import { LoginPage } from '@/pages/Auth';
import { CreatePage } from '@/pages/Create';
import AdminPage from '@/pages/Admin';
import { MarketplacePage } from '@/pages/Marketplace';
import { SearchPage } from '@/pages/Search';
import { ReelsPage } from '@/pages/Reels';
import { NotificationsPage } from '@/pages/Notifications';
import { MessagesPage } from '@/pages/Messages';
import { ProfilePage } from '@/pages/Profile';
import { StoreProfilePage } from '@/pages/StoreProfile';
import { EditStorePage } from '@/pages/EditStore';
import { ProductDetailPage } from '@/pages/ProductDetail';
import { CartPage } from '@/pages/Cart';
import { MenuPage } from '@/pages/Menu';
import { BusinessManagementPage } from '@/pages/BusinessManagement';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const AppRoutes = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<FeedPage />} />
      <Route path="/auth" element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route 
        path="/create" 
        element={user ? <CreatePage /> : <Navigate to="/auth" />} 
      />
      <Route 
        path="/admin" 
        element={user && profile?.is_admin ? <AdminPage /> : <Navigate to="/" />} 
      />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/reels" element={<ReelsPage />} />
      <Route 
        path="/notifications" 
        element={user ? <NotificationsPage /> : <Navigate to="/auth" />} 
      />
      <Route 
        path="/messages" 
        element={user ? <MessagesPage /> : <Navigate to="/auth" />} 
      />
      <Route 
        path="/profile" 
        element={user ? <ProfilePage /> : <Navigate to="/auth" />} 
      />
      <Route path="/profile/:userId" element={<ProfilePage />} />
      <Route path="/store/:storeId" element={<StoreProfilePage />} />
      <Route 
        path="/edit-store/:storeId" 
        element={user ? <EditStorePage /> : <Navigate to="/auth" />} 
      />
      <Route 
        path="/business-management/:storeId" 
        element={user ? <BusinessManagementPage /> : <Navigate to="/auth" />} 
      />
      <Route path="/product/:productId" element={<ProductDetailPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};
