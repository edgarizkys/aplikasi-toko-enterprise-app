'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  Barcode,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  submenu?: SidebarSubitem[];
  badge?: number;
}

interface SidebarSubitem {
  label: string;
  href: string;
}

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Produk']);

  const sidebarItems: SidebarItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      label: 'Produk',
      icon: <Package size={20} />,
      submenu: [
        { label: 'Daftar Produk', href: '/products' },
        { label: 'Kategori', href: '/products/categories' },
        { label: 'Stok', href: '/products/stock' },
      ],
    },
    {
      label: 'Penjualan',
      icon: <ShoppingCart size={20} />,
      submenu: [
        { label: 'Transaksi', href: '/sales/transactions' },
        { label: 'Laporan Penjualan', href: '/sales/reports' },
      ],
      badge: 3,
    },
    {
      label: 'Pelanggan',
      href: '/customers',
      icon: <Users size={20} />,
    },
    {
      label: 'Laporan',
      icon: <FileText size={20} />,
      submenu: [
        { label: 'Penjualan Harian', href: '/reports/daily-sales' },
        { label: 'Penjualan Bulanan', href: '/reports/monthly-sales' },
        { label: 'Stok Barang', href: '/reports/inventory' },
      ],
    },
    {
      label: 'Barcode',
      href: '/barcode',
      icon: <Barcode size={20} />,
    },
    {
      label: 'Pengaturan',
      href: '/settings',
      icon: <Settings size={20} />,
    },
  ];

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isSubmenuActive = (submenu?: SidebarSubitem[]) => {
    if (!submenu) return false;
    return submenu.some((item) => isActive(item.href));
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
          isOpen ? 'w-64' : 'w-0 md:w-64'
        } md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-sm">Toko Enterprise</h1>
              <p className="text-xs text-gray-500">Retail Management</p>
            </div>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-2 overflow-y-auto h-[calc(100vh-200px)]">
          {sidebarItems.map((item) => (
            <div key={item.label}>
              {item.submenu ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                    isSubmenuActive(item.submenu)
                      ? 'bg-gradient-to-r from-sky-50 to-indigo-50 text-sky-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`${
                        isSubmenuActive(item.submenu)
                          ? 'text-sky-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {expandedItems.includes(item.label) ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`${
                      isActive(item.href) ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )}

              {item.submenu && expandedItems.includes(item.label) && (
                <div className="pl-4 mt-2 space-y-1 border-l border-gray-200">
                  {item.submenu.map((subitem) => (
                    <Link
                      key={subitem.href}
                      href={subitem.href}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive(subitem.href)
                          ? 'bg-sky-100 text-sky-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {subitem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white space-y-2">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500" />
            <span className="font-medium">Profil</span>
          </Link>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <LogOut size={18} className="text-gray-500" />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${isOpen ? 'md:ml-64' : ''}`} />
    </>
  );
};

export default Sidebar;