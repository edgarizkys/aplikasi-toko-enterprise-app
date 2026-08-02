'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ProductsTab from '@/components/tabs/ProductsTab';
import SalesTab from '@/components/tabs/SalesTab';
import CustomersTab from '@/components/tabs/CustomersTab';
import AnalyticsTab from '@/components/tabs/AnalyticsTab';

type TabType = 'products' | 'sales' | 'customers' | 'analytics';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem('accessToken');
          router.push('/login');
          return;
        }

        const data = await response.json();
        setUser(data.data);
        setIsLoading(false);
      } catch (error) {
        localStorage.removeItem('accessToken');
        router.push('/login');
      }
    };

    verifyAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="animate-spin">
          <div className="h-12 w-12 rounded-full border-4 border-sky-500 border-t-indigo-600"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'products' as TabType, label: 'Produk', icon: '📦' },
    { id: 'sales' as TabType, label: 'Penjualan', icon: '💰' },
    { id: 'customers' as TabType, label: 'Pelanggan', icon: '👥' },
    { id: 'analytics' as TabType, label: 'Laporan', icon: '📊' },
  ];

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header user={user} onLogout={handleLogout} />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 border-b border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-b-2 border-sky-500 text-sky-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="animate-fadeIn">
              {activeTab === 'products' && <ProductsTab />}
              {activeTab === 'sales' && <SalesTab />}
              {activeTab === 'customers' && <CustomersTab />}
              {activeTab === 'analytics' && <AnalyticsTab />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}