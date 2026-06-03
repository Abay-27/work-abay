/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, Component, useRef } from 'react';
import imageCompression from 'browser-image-compression';

declare global {
  interface Window {
    google: any;
  }
}
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Phone, 
  CreditCard, 
  CheckCircle2,
  ArrowRight,
  ShoppingCart,
  Trash2,
  Plus,
  Edit,
  RefreshCw,
  Minus,
  User,
  Mail,
  MapPin,
  Users,
  LayoutGrid,
  LogOut,
  LayoutDashboard,
  TrendingUp,
  ArrowUpDown,
  Package,
  DollarSign,
  Clock,
  BookOpen,
  CheckCircle,
  Languages,
  XCircle,
  MessageCircle,
  Send,
  Loader2,
  Video,
  Copy,
  Check,
  Eye,
  Heart,
  Upload,
  Truck,
  Star,
  Calendar,
  Download,
  Printer,
  Percent,
  Facebook,
  WifiOff,
  Share2,
  Instagram,
  Twitter,
  AlertCircle,
  Edit3,
  Save,
  ShieldCheck,
  FileText,
  Inbox,
  Bed,
  Leaf,
  Filter,
  Globe,
  Settings,
  Coffee,
  Cpu,
  Shirt,
  Home,
  Sparkles,
  Gem,
  Tag,
  Play,
  Zap,
  PieChart as PieIcon,
  BarChart as BarIcon,
  LineChart as LineIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { PRODUCTS, Product, COMMISSION_RATE, PRODUCT_CATEGORIES, PROMOTIONS, Promotion } from './constants';
import AIFeatures from './components/AIFeatures';
import AuthModal from './components/AuthModal';

export type UserRole = 'super_admin' | 'content_manager' | 'order_manager' | 'customer' | 'admin' | 'delivery_person' | 'merchant';
import { db, auth, signIn, logOut, handleFirestoreError, OperationType, storage, sendEmailVerification } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, increment, setDoc, where, getDocs, limit, writeBatch, enableNetwork } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import i18n from './i18n';

const DeliveryMap = ({ order }: { order: any }) => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google || !order) return;

    const defaultCenter = { lat: 9.03, lng: 38.74 }; // Addis Ababa
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 13,
      styles: [
        {
          "featureType": "poi",
          "stylers": [{ "visibility": "off" }]
        }
      ],
      disableDefaultUI: true,
      zoomControl: true,
    });

    const geocoder = new window.google.maps.Geocoder();
    const address = `${order.customerAddress}, ${order.customerArea}, ${order.customerCity || 'Addis Ababa'}, Ethiopia`;

    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === 'OK' && results && results[0]) {
        const customerPos = results[0].geometry.location;
        map.setCenter(customerPos);

        new window.google.maps.Marker({
          position: customerPos,
          map: map,
          title: 'Delivery Location',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
          }
        });

        if (order.status === 'out_for_delivery') {
          // Mock driver position: slightly offset
          const driverPos = {
            lat: customerPos.lat() + 0.005,
            lng: customerPos.lng() + 0.005
          };

          new window.google.maps.Marker({
            position: driverPos,
            map: map,
            title: 'Delivery Driver',
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#059669',
              fillOpacity: 1,
              strokeWeight: 2,
              rotation: 45
            }
          });

          new window.google.maps.Polyline({
            path: [driverPos, customerPos],
            geodesic: true,
            strokeColor: '#059669',
            strokeOpacity: 0.6,
            strokeWeight: 3,
            map: map
          });
          
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(customerPos);
          bounds.extend(driverPos);
          map.fitBounds(bounds);
        }
      }
    });
  }, [order]);

  return (
    <div className="w-full h-64 rounded-2xl overflow-hidden border border-stone-200 shadow-sm mt-4">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-stone-50">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-slate-600 mb-6">Please refresh the page or try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-stone-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-stone-500 font-medium animate-pulse">Loading ABAY MART...</p>
          </div>
        </div>
      }>
        <AppContent />
      </React.Suspense>
    </ErrorBoundary>
  );
}

interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  selectedVariants?: Record<string, string>;
}

function MobileNavBar({ 
  view, 
  setView, 
  setIsMobileMenuOpen, 
  setIsCartOpen, 
  cartCount,
  user,
  handleSignIn
}: { 
  view: string; 
  setView: (v: any) => void; 
  setIsMobileMenuOpen: (o: boolean) => void;
  setIsCartOpen: (o: boolean) => void;
  cartCount: number;
  user: any;
  handleSignIn: (mode?: 'login' | 'signup') => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-[100] pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
       <div className="flex justify-around items-center h-16">
          <button 
            onClick={() => { setView('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex flex-col items-center gap-1 flex-1 transition-all hover:scale-110 active:scale-95 ${view === 'shop' ? 'text-brand-primary' : 'text-slate-400'}`}
          >
            <div className="relative">
              <Home className="w-5 h-5" />
              {view === 'shop' && <motion.div layoutId="nav-active" className="absolute -inset-2 bg-brand-primary/5 rounded-full -z-10" />}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">{t('home')}</span>
          </button>

          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 text-slate-400 hover:scale-110 active:scale-95 hover:text-brand-primary transition-all"
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{t('allCategories')}</span>
          </button>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center gap-1 flex-1 text-slate-400 relative hover:scale-110 active:scale-95 hover:text-brand-primary transition-all"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-brand-accent text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Cart</span>
          </button>

          <button 
            onClick={() => user ? setView('profile') : handleSignIn('login')}
            className={`flex flex-col items-center gap-1 flex-1 transition-all hover:scale-110 active:scale-95 ${view === 'profile' ? 'text-brand-primary' : 'text-slate-400'}`}
          >
             <User className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{user ? 'Account' : 'Login'}</span>
          </button>
       </div>
    </div>
  );
}

const categoryKeys: Record<string, string> = {
  'Coffee & Spices': 'catCoffeeSpices',
  'Agriculture & Food': 'catAgricultureFood',
  'Apparel & Textiles': 'catApparelTextiles',
  'Electronics & Gadgets': 'catElectronicsGadgets',
  'Home & Garden': 'catHomeGarden',
  'Logistics Services': 'catLogisticsServices',
  'Bedding Solution': 'catBeddingSolution',
  'Beauty & Care': 'catBeautyCare'
};

function PromotionalBanners({ setView }: { setView: (v: any) => void }) {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % PROMOTIONS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-[2rem] overflow-hidden group shadow-2xl transition-all duration-500 hover:shadow-brand-primary/10">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img src={PROMOTIONS[current].image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/95 via-brand-primary/50 to-transparent" />
          <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-center max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {PROMOTIONS[current].badge && (
                <span className="inline-block px-4 py-1.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-6 w-fit shadow-xl shadow-brand-accent/20">
                  {PROMOTIONS[current].badge}
                </span>
              )}
              <h2 className="text-3xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight drop-shadow-sm">
                {PROMOTIONS[current].title}
              </h2>
              <p className="text-white/80 text-sm md:text-xl mb-10 line-clamp-2 md:line-clamp-none font-medium leading-relaxed max-w-lg">
                {PROMOTIONS[current].description}
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView(PROMOTIONS[current].ctaLink)}
                  className="px-10 py-5 bg-brand-accent text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-brand-accent/30 flex items-center gap-3"
                >
                  {PROMOTIONS[current].ctaText}
                  <ArrowRight className="w-4 h-4" />
                </button>
                {PROMOTIONS[current].videoUrl && (
                  <button 
                    onClick={() => setView('promotions')}
                    className="px-8 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('watchPromoVideo', 'Watch Video')}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-16 flex gap-3">
        {PROMOTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? 'w-12 bg-brand-accent shadow-lg shadow-brand-accent/50' : 'w-4 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>
      
      {/* Navigation Arrows */}
      <div className="absolute right-12 bottom-8 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={() => setCurrent(prev => (prev - 1 + PROMOTIONS.length) % PROMOTIONS.length)}
          className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setCurrent(prev => (prev + 1) % PROMOTIONS.length)}
          className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function PromotionsView({ setView }: { setView: (v: any) => void }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 pt-32">
      <div className="flex flex-col items-center text-center mb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-3 px-4 py-1.5 bg-brand-primary/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-8"
        >
          <Tag className="w-4 h-4" />
          {t('exclusiveOffers', 'Exclusive Offers')}
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight"
        >
          {t('activePromotions', 'Active Promotions')}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 max-w-2xl text-lg md:text-xl font-medium leading-relaxed"
        >
          {t('promotionsDesc', 'Discover our latest deals, limited-time offers, and exclusive discounts across all our categories across Ethiopia.')}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {PROMOTIONS.map((promo, idx) => (
          <motion.div
            key={promo.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 ring-1 ring-slate-100 hover:shadow-2xl hover:ring-brand-primary/20 transition-all duration-700 flex flex-col"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={promo.image} alt={promo.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              {promo.badge && (
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-1.5 bg-brand-accent text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl">
                    {promo.badge}
                  </span>
                </div>
              )}
              {promo.videoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform duration-500 ring-1 ring-white/30">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-10 flex-1 flex flex-col">
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-brand-primary transition-colors leading-tight">
                  {promo.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">
                  {promo.description}
                </p>
              </div>
              
              {promo.videoUrl && (
                <div className="mb-10 rounded-[2rem] overflow-hidden shadow-2xl aspect-video bg-slate-900 ring-4 ring-slate-50">
                  <iframe
                    className="w-full h-full"
                    src={promo.videoUrl.replace('watch?v=', 'embed/')}
                    title={promo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              <button 
                onClick={() => setView('shop')}
                className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-brand-accent transition-all shadow-xl shadow-brand-primary/10 active:scale-95 flex items-center justify-center gap-3 mt-auto"
              >
                {promo.ctaText}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-32 pt-20 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: <Clock className="w-6 h-6" />, title: 'Limited Time', desc: 'Offers valid while stocks last' },
          { icon: <ShieldCheck className="w-6 h-6" />, title: 'Verified Only', desc: 'Secure deals from verified sellers' },
          { icon: <Globe className="w-6 h-6" />, title: 'Nationwide', desc: 'Delivery available to all Ethiopia' },
          { icon: <Zap className="w-6 h-6" />, title: 'Flash Deals', desc: 'New promotions added weekly' },
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-xl hover:border-brand-primary/20 transition-all group">
            <div className="w-12 h-12 bg-white text-brand-primary rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-brand-primary group-hover:text-white transition-colors">
              {item.icon}
            </div>
            <div>
              <h4 className="font-black text-slate-900 text-sm mb-1">{item.title}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCard({ 
  product, 
  idx, 
  wishlist, 
  toggleWishlist, 
  setSelectedProduct, 
  setCurrentImageIndex, 
  addToCart 
}: { 
  product: Product; 
  idx: number; 
  wishlist: string[]; 
  toggleWishlist: (id: string) => void; 
  setSelectedProduct: (p: Product) => void; 
  setCurrentImageIndex: (i: number) => void; 
  addToCart: (p: Product, q: number) => void;
}) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(product.minOrderQuantity || 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05 }}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-brand-primary/30 transition-all duration-500 flex flex-col cursor-pointer"
      onClick={() => {
        setSelectedProduct(product);
        setCurrentImageIndex(0);
      }}
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        <img 
          src={product.image} 
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${product.stock <= 0 ? 'grayscale opacity-50' : ''}`}
          referrerPolicy="no-referrer"
        />
        
        {/* Buyer Protection Badge */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/90 backdrop-blur-md rounded-md shadow-sm border border-slate-100">
            <ShieldCheck className="w-3 h-3 text-brand-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-900">{t('buyerProtection')}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-all hover:scale-110 ${wishlist.includes(product.id) ? 'bg-red-500 text-white' : 'bg-white text-slate-400 hover:text-red-500'}`}
          >
            <Heart className={`w-4 h-4 ${wishlist.includes(product.id) ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-3">
          <div className="mb-2">
            <span className="text-[8px] font-bold text-brand-primary uppercase tracking-widest px-2 py-0.5 bg-brand-primary/5 rounded border border-brand-primary/10">
              {t(categoryKeys[product.category] || 'other')}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-brand-primary transition-colors min-h-[40px]">
            {product.name}
          </h3>
        </div>

        <div className="mt-auto space-y-3">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900">{product.price.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('etbPerUnit', { unit: product.unit || 'Piece' })}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t('minOrder', { min: product.minOrderQuantity || 1, unit: product.unit || 'Pieces' })}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-slate-900">4.9</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('quantity')}</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(prev => Math.max(product.minOrderQuantity || 1, prev - 1));
                }}
                disabled={quantity <= (product.minOrderQuantity || 1)}
                className="p-1 hover:text-brand-primary hover:scale-125 active:scale-90 transition-all disabled:opacity-30"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input 
                type="number" 
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setQuantity(Math.max(product.minOrderQuantity || 1, Math.min(product.stock, val)));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-8 text-center text-[10px] font-bold bg-transparent border-none focus:ring-0 p-0"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setQuantity(prev => Math.min(product.stock, prev + 1));
                }}
                disabled={quantity >= product.stock}
                className="p-1 hover:text-brand-primary hover:scale-125 active:scale-90 transition-all disabled:opacity-30"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToCart(product, quantity);
              }}
              disabled={product.stock <= 0}
              className="w-full py-2 bg-brand-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-[#0c132e] hover:scale-105 active:scale-95 transition-all shadow-md shadow-brand-primary/10 disabled:opacity-50"
            >
              {product.stock > 0 ? 'Order Now' : 'Out of Stock'}
            </button>
          </div>

          {product.merchantName && (
            <div className="flex items-center gap-2 pt-2">
              <div className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center">
                <User className="w-2.5 h-2.5 text-slate-400" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                {product.merchantName}
              </span>
              <div className="ml-auto flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest">
                <CheckCircle2 className="w-2 h-2" />
                Verified
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AppContent() {
  const { t, i18n } = useTranslation();
  const [user, loading, authError] = useAuthState(auth);
  
  // -- UI & App States --
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('abay_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('abay_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('abay_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // -- Store & Search States --
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState<'all' | '0-500' | '500-1000' | '1000+'>('all');
  const [availability, setAvailability] = useState<'all' | 'in-stock' | 'out-of-stock'>('all');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'delivery' | 'payment' | 'success'>('cart');
  const [view, setView] = useState<'shop' | 'admin' | 'wishlist' | 'profile' | 'track-order' | 'merchant-dashboard' | 'privacy-policy' | 'terms-of-service' | 'help-center' | 'contact-us' | 'seller-guide' | 'ai-features' | 'user-guide' | 'promotions'>('shop');
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  
  // -- Auth & Profile States --
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [isActive, setIsActive] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    phoneNumber: '',
    address: { city: '', area: '', street: '', houseNumber: '' }
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [shouldSaveAddress, setShouldSaveAddress] = useState(false);

  // -- Admin & Merchant States --
  const [isAdmin, setIsAdmin] = useState(false); // Derived from userRole + isActive below
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isOrderManager, setIsOrderManager] = useState(false);
  const [isContentManager, setIsContentManager] = useState(false);
  const [isDeliveryPerson, setIsDeliveryPerson] = useState(false);
  
  const [stats, setStats] = useState({ verifiedSellers: 0, happyCustomers: 0 });
  const [isRecalculatingStats, setIsRecalculatingStats] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSortConfig, setOrderSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [productSortConfig, setProductSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSortConfig, setUserSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'overview' | 'orders' | 'products' | 'users' | 'applications'>('overview');
  
  const [merchantForm, setMerchantForm] = useState({
    storeName: '',
    storeDescription: '',
    phoneNumber: '',
    address: '',
    tinNumber: ''
  });
  const [registrationFile, setRegistrationFile] = useState<File | null>(null);
  const [businessPictureFile, setBusinessPictureFile] = useState<File | null>(null);
  const [isMerchantApplying, setIsMerchantApplying] = useState(false);
  const [decliningMerchantId, setDecliningMerchantId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // -- Product Form States --
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '', description: '', price: 0, category: 'Coffee & Spices', stock: 10, minOrderQuantity: 1, unit: 'pcs', tags: []
  });
  const [productImageFiles, setProductImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // -- Tracking & Find Order States --
  const [trackingId, setTrackingId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isFindingOrder, setIsFindingOrder] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [foundOrders, setFoundOrders] = useState<any[]>([]);
  const [isFindingLoading, setIsFindingLoading] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  
  // -- Checkout States --
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('Addis Ababa');
  const [customerArea, setCustomerArea] = useState('');
  const [customerHouseNo, setCustomerHouseNo] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Telebirr' | 'CBE'>('Telebirr');
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<CartItem[]>([]);
  const [lastOrderTotal, setLastOrderTotal] = useState<number>(0);
  const [orderError, setOrderError] = useState<string | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isEditingOrderDetails, setIsEditingOrderDetails] = useState(false);
  const [editingOrderData, setEditingOrderData] = useState<any>(null);
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [isUserOrdersLoading, setIsUserOrdersLoading] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // -- Chat States --
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Hello! I am your ABAY Assistant. How can I help you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // -- Other UI States --
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  
  // -- Refs --
  const addressInputRef = useRef<HTMLInputElement>(null);
  const profileAddressInputRef = useRef<HTMLInputElement>(null);

  // -- Derived Values --
  useEffect(() => {
    const isSuper = (userRole === 'super_admin' && isActive) || user?.email?.toLowerCase() === "abaygebeyaw1996@gmail.com";
    setIsSuperAdmin(isSuper);
    setIsContentManager(isSuper || (userRole === 'content_manager' && isActive));
    setIsOrderManager(isSuper || (userRole === 'order_manager' && isActive));
    setIsDeliveryPerson(isSuper || (userRole === 'delivery_person' && isActive));
    setIsMerchant(isSuper || (userRole === 'merchant' && isActive));
    setIsAdmin(isSuper || (userRole === 'admin' && isActive) || (userRole === 'content_manager' && isActive) || (userRole === 'order_manager' && isActive) || (userRole === 'delivery_person' && isActive));
  }, [userRole, isActive, user]);

  // -- Effect: Persistence --
  useEffect(() => { localStorage.setItem('abay_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('abay_wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('abay_recently_viewed', JSON.stringify(recentlyViewed)); }, [recentlyViewed]);

  // -- Effect: Online Status --
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -- Effect: Body Scroll Lock --
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen || isMobileSearchOpen ? 'hidden' : 'unset';
  }, [isMobileMenuOpen, isMobileSearchOpen]);

  // -- Effect: Scroll Header --
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // -- Category Helpers --
  const getCategoryTranslation = (id: string) => {
    if (id === 'All') return t('all');
    const key = categoryKeys[id];
    return key ? t(key) : id;
  };

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case 'Coffee & Spices': return <Coffee className="w-4 h-4" />;
      case 'Agriculture & Food': return <Leaf className="w-4 h-4" />;
      case 'Machinery & Tools': return <Settings className="w-4 h-4" />;
      case 'Textiles & Garments': return <Shirt className="w-4 h-4" />;
      case 'Handicrafts & Gifts': return <Sparkles className="w-4 h-4" />;
      case 'Minerals & Gemstones': return <Gem className="w-4 h-4" />;
      case 'Chemicals & Plastics': return <Filter className="w-4 h-4" />;
      case 'Electronics & Technology': return <Cpu className="w-4 h-4" />;
      case 'Construction Materials': return <Home className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const toggleWishlist = async (productId: string) => {
    const isAdding = !wishlist.includes(productId);
    const newWishlist = isAdding 
      ? [...wishlist, productId] 
      : wishlist.filter(id => id !== productId);
    
    setWishlist(newWishlist);
    
    // Sync with Firestore if user is logged in
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          wishlist: newWishlist
        });
      } catch (error) {
        console.error("Error syncing wishlist to Firestore:", error);
      }
    }
    
    setNotification({ 
      message: isAdding ? 'Added to wishlist' : 'Removed from wishlist', 
      type: 'success' 
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const addToRecentlyViewed = (productId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== productId);
      const updated = [productId, ...filtered].slice(0, 10);
      return updated;
    });
  };

  const handleShare = async (product: Product) => {
    const shareData = {
      title: `ABAY - ${product.name}`,
      text: `${product.name} - ${product.price} ETB. ${product.description}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setNotification({ message: 'Link copied to clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleShareTracking = async (order: any) => {
    const shareData = {
      title: `ABAY - Track Order #${order.id}`,
      text: `Track my order status: ${order.status}. Order ID: ${order.id}`,
      url: `${window.location.origin}/?track=${order.id}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/?track=${order.id}`);
        setNotification({ message: 'Tracking link copied!', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Error sharing tracking:', err);
    }
  };

  useEffect(() => {
    setCurrentImageIndex(0);
    if (selectedProduct) {
      setModalQuantity(selectedProduct.minOrderQuantity || 1);
      // Pre-select first option for each variant
      const initialVariants: Record<string, string> = {};
      if (selectedProduct.variants) {
        selectedProduct.variants.forEach(v => {
          if (v.options && v.options.length > 0) {
            initialVariants[v.name] = v.options[0];
          }
        });
      }
      setSelectedVariants(initialVariants);
      
      addToRecentlyViewed(selectedProduct.id);
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', selectedProduct.id),
        orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error("Error fetching reviews:", error);
      });
      return () => unsubscribe();
    } else {
      setSelectedVariants({});
      setReviews([]);
    }
  }, [selectedProduct]);

  const handleAddReview = async () => {
    if (!user) {
      setNotification({ message: "Please login to leave a review", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (!reviewComment.trim()) {
      setNotification({ message: "Please enter a comment", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: selectedProduct?.id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        rating: reviewRating,
        comment: reviewComment,
        createdAt: serverTimestamp()
      });
      setReviewComment('');
      setReviewRating(5);
      setNotification({ message: "Review submitted! Thank you.", type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error adding review:", error);
      setNotification({ message: "Failed to submit review", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob | File> => {
    // Skip compression if file is already small (< 200KB)
    if (file.size < 200 * 1024) {
      return file;
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: maxWidth,
      useWebWorker: true,
      initialQuality: quality,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Error compressing image:', error);
      return file; // Fallback to original
    }
  };

  const handleBecomeMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Optional file upload validation
    // (Removed mandatory check)

    // Check file sizes (limit to 5MB)
    if (registrationFile && registrationFile.size > 5 * 1024 * 1024) {
      setNotification({ message: 'Registration document must be under 5MB.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    if (businessPictureFile && businessPictureFile.size > 5 * 1024 * 1024) {
      setNotification({ message: 'Business picture must be under 5MB.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsMerchantApplying(true);
    try {
      const uploadTasks: Promise<string>[] = [];

      // Helper for compression and upload
      const processAndUpload = async (file: File, prefix: string) => {
        const storageRef = ref(storage, `merchants/${user.uid}/${prefix}_${Date.now()}`);
        let dataToUpload: Blob | File = file;
        
        if (file.type.startsWith('image/')) {
          try {
            setIsCompressing(true);
            dataToUpload = await compressImage(file);
            setIsCompressing(false);
          } catch (err) {
            console.warn(`Compression failed for ${prefix}, uploading original:`, err);
            setIsCompressing(false);
          }
        }
        
        const snapshot = await uploadBytes(storageRef, dataToUpload);
        return await getDownloadURL(snapshot.ref);
      };

      // Start both uploads in parallel
      const [registrationDocUrl, businessPictureUrl] = await Promise.all([
        registrationFile ? processAndUpload(registrationFile, 'registration') : Promise.resolve(null),
        businessPictureFile ? processAndUpload(businessPictureFile, 'business_pic') : Promise.resolve(null)
      ]);

      await setDoc(doc(db, 'users', user.uid), {
        merchantInfo: {
          storeName: merchantForm.storeName,
          storeDescription: merchantForm.storeDescription,
          phoneNumber: merchantForm.phoneNumber,
          address: merchantForm.address,
          tinNumber: merchantForm.tinNumber,
          ...(registrationDocUrl && { registrationDocUrl }),
          ...(businessPictureUrl && { businessPictureUrl }),
          status: 'pending',
          appliedAt: new Date().toISOString()
        },
        active: false // Wait for admin approval
      }, { merge: true });

      setNotification({ message: 'Application submitted! We will review it and get back to you.', type: 'success' });
      setView('profile');
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error("Error becoming merchant:", error);
      setNotification({ message: 'Failed to apply. Please try again.', type: 'error' });
    } finally {
      setIsMerchantApplying(false);
    }
  };


  const handleApproveMerchant = async (userId: string) => {
    if (!isSuperAdmin) return;
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: 'merchant',
        'merchantInfo.status': 'approved',
        'merchantInfo.reviewedAt': new Date().toISOString(),
        'merchantInfo.reviewedBy': user?.email,
        active: true
      });
      
      // Update global stats
      await setDoc(doc(db, 'stats', 'global'), {
        verifiedSellers: increment(1)
      }, { merge: true });

      // Send Email Notification
      try {
        await fetch('/api/merchant-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetUser.email,
            storeName: targetUser.merchantInfo?.storeName || 'Your Store',
            status: 'approved'
          })
        });
      } catch (err) {
        console.error("Failed to send approval email:", err);
      }

      setNotification({ message: 'Merchant application approved!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error approving merchant:", error);
      setNotification({ message: 'Failed to approve merchant.', type: 'error' });
    }
  };

  const handleDeclineMerchant = async (userId: string, reason: string) => {
    if (!isSuperAdmin) return;
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;

    try {
      await updateDoc(doc(db, 'users', userId), {
        'merchantInfo.status': 'declined',
        'merchantInfo.reviewedAt': new Date().toISOString(),
        'merchantInfo.reviewedBy': user?.email,
        'merchantInfo.declineReason': reason
      });

      // Send Email Notification
      try {
        await fetch('/api/merchant-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetUser.email,
            storeName: targetUser.merchantInfo?.storeName || 'Your Store',
            status: 'declined',
            reason: reason || 'Your application does not meet our current requirements.'
          })
        });
      } catch (err) {
        console.error("Failed to send decline email:", err);
      }

      setNotification({ message: 'Merchant application declined.', type: 'success' });
      setDecliningMerchantId(null);
      setDeclineReason('');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error declining merchant:", error);
      setNotification({ message: 'Failed to decline merchant.', type: 'error' });
    }
  };

  const handleFindOrders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findQuery.trim()) return;

    setIsFindingLoading(true);
    setFindError(null);
    setFoundOrders([]);

    try {
      // Try searching by email
      const emailQuery = query(
        collection(db, 'orders'),
        where('customerEmail', '==', findQuery.trim()),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      let results = emailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If no results, try phone
      if (results.length === 0) {
        const phoneQuery = query(
          collection(db, 'orders'),
          where('customerPhone', '==', findQuery.trim()),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const phoneSnapshot = await getDocs(phoneQuery);
        results = phoneSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      if (results.length === 0) {
        setFindError('No orders found for this email or phone number.');
      } else {
        setFoundOrders(results);
      }
    } catch (error) {
      console.error("Find orders error:", error);
      setFindError('Failed to find orders. Please try again.');
    } finally {
      setIsFindingLoading(false);
    }
  };
  

  const recalculateGlobalStats = async () => {
    if (!isSuperAdmin) return;
    setIsRecalculatingStats(true);
    try {
      // Count merchants
      const merchantsQuery = query(collection(db, 'users'), where('role', '==', 'merchant'));
      const merchantsSnapshot = await getDocs(merchantsQuery);
      const merchantCount = merchantsSnapshot.size;

      // Count unique happy customers (users who placed at least one order)
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const customerUids = new Set();
      ordersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.customerUid) customerUids.add(data.customerUid);
      });
      const customerCount = customerUids.size || ordersSnapshot.size; // Fallback to total orders if no UIDs

      await setDoc(doc(db, 'stats', 'global'), {
        verifiedSellers: merchantCount,
        happyCustomers: customerCount
      }, { merge: true });

      setNotification({ message: 'Global stats recalculated successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error recalculating stats:", error);
      setNotification({ message: 'Failed to recalculate stats.', type: 'error' });
    } finally {
      setIsRecalculatingStats(false);
    }
  };

  useEffect(() => {
    const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || (checkoutStep !== 'delivery' && !isEditingProfile)) return;

    const loadGoogleMaps = () => {
      if (window.google) {
        initAutocomplete();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (checkoutStep === 'delivery' && addressInputRef.current && window.google) {
        setupAutocomplete(addressInputRef, false);
      }
      if (isEditingProfile && profileAddressInputRef.current && window.google) {
        setupAutocomplete(profileAddressInputRef, true);
      }
    };

    const setupAutocomplete = (inputRef: React.RefObject<HTMLInputElement | null>, isProfile: boolean) => {
      if (!inputRef.current || !window.google) return;

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'et' },
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        let streetAddress = '';
        let city = '';
        let area = '';
        let houseNumber = '';

        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes('street_number')) {
            houseNumber = component.long_name;
            streetAddress = component.long_name + ' ' + streetAddress;
          }
          if (types.includes('route')) {
            streetAddress += component.long_name;
          }
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('sublocality') || types.includes('neighborhood')) {
            area = component.long_name;
          }
        }

        if (isProfile) {
          setProfileForm(prev => ({
            ...prev,
            address: {
              ...prev.address,
              street: streetAddress || prev.address.street,
              city: city || prev.address.city,
              area: area || prev.address.area,
              houseNumber: houseNumber || prev.address.houseNumber
            }
          }));
        } else {
          if (streetAddress) setCustomerAddress(streetAddress);
          if (city) {
            const validCities = ['Addis Ababa', 'Adama', 'Bishoftu'];
            if (validCities.includes(city)) {
              setCustomerCity(city);
            } else {
              setCustomerCity('Other');
            }
          }
          if (area) setCustomerArea(area);
          if (houseNumber) setCustomerHouseNo(houseNumber);
        }
      });
    };

    loadGoogleMaps();
  }, [checkoutStep, isEditingProfile]);


  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          verifiedSellers: data.verifiedSellers || 0,
          happyCustomers: data.happyCustomers || 0
        });
      }
    });
    return () => unsub();
  }, []);
  

  // Pre-fill checkout form with user profile
  useEffect(() => {
    if (user && userProfile && checkoutStep === 'delivery') {
      if (!customerName) setCustomerName(userProfile.displayName || user.displayName || '');
      if (!customerEmail) setCustomerEmail(userProfile.email || user.email || '');
      if (!customerPhone) setCustomerPhone(userProfile.phoneNumber || '');
      if (userProfile.address) {
        if (!customerCity) setCustomerCity(userProfile.address.city || 'Addis Ababa');
        if (!customerArea) setCustomerArea(userProfile.address.area || '');
        if (!customerHouseNo) setCustomerHouseNo(userProfile.address.houseNumber || '');
        if (!customerAddress) setCustomerAddress(userProfile.address.street || '');
      }
    }
  }, [user, userProfile, checkoutStep]);



  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || productForm.price === undefined) return;

    setIsSubmitting(true);
    try {
      console.log("Saving product. Current user:", auth.currentUser?.email, "UID:", auth.currentUser?.uid);
      
      if (!auth.currentUser) {
        throw new Error("You must be logged in to upload images.");
      }

      let imageUrl = productForm.image || '';
      let galleryUrls = [...(productForm.images || [])];
      
      const mainFileInput = document.getElementById('product-image-upload') as HTMLInputElement;
      const galleryFileInput = document.getElementById('product-gallery-upload') as HTMLInputElement;

      // Handle main image upload
      if (mainFileInput && mainFileInput.files && mainFileInput.files[0]) {
        setIsUploading(true);
        setIsCompressing(true);
        setUploadProgress(0);
        const file = mainFileInput.files[0];
        
        try {
          const compressedBlob = await compressImage(file);
          setIsCompressing(false);
          const fileName = `main_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const storageRef = ref(storage, `products/${fileName}`);
          const uploadTask = uploadBytesResumable(storageRef, compressedBlob);
          
          await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
              (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
              (error) => reject(error),
              async () => {
                imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(null);
              }
            );
          });
        } catch (err) {
          console.error("Main image upload error:", err);
          throw err;
        }
      }

      // Handle gallery images upload
      if (galleryFileInput && galleryFileInput.files && galleryFileInput.files.length > 0) {
        setIsUploading(true);
        const files = Array.from(galleryFileInput.files);
        const newGalleryUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(((i) / files.length) * 100);
          setIsCompressing(true);
          
          try {
            const compressedBlob = await compressImage(file);
            setIsCompressing(false);
            const fileName = `gallery_${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = ref(storage, `products/${fileName}`);
            const uploadTask = uploadBytesResumable(storageRef, compressedBlob);
            
            await new Promise((resolve, reject) => {
              uploadTask.on('state_changed', 
                (snapshot) => {
                  const chunkProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * (100 / files.length);
                  setUploadProgress((i / files.length) * 100 + chunkProgress);
                },
                (error) => reject(error),
                async () => {
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  newGalleryUrls.push(url);
                  resolve(null);
                }
              );
            });
          } catch (err) {
            console.error(`Gallery image ${i} upload error:`, err);
            // Continue with other images even if one fails
          }
        }
        galleryUrls = [...galleryUrls, ...newGalleryUrls];
      }

      const id = editingProduct ? editingProduct.id : Math.random().toString(36).substring(2, 9);
      const productData = { 
        ...productForm, 
        id, 
        image: imageUrl,
        images: galleryUrls,
        soldCount: editingProduct ? editingProduct.soldCount : 0,
        merchantId: editingProduct ? editingProduct.merchantId : auth.currentUser.uid,
        merchantName: editingProduct ? editingProduct.merchantName : (userProfile?.merchantInfo?.storeName || userProfile?.displayName || auth.currentUser.displayName || 'ABAY')
      } as Product;
      
      if (editingProduct) {
        await updateDoc(doc(db, 'products', id), { ...productData });
        setNotification({ message: 'Product updated successfully', type: 'success' });
      } else {
        await setDoc(doc(db, 'products', id), productData);
        setNotification({ message: 'Product added successfully', type: 'success' });
      }
      
      if (mainFileInput) mainFileInput.value = '';
      if (galleryFileInput) galleryFileInput.value = '';
      
      setIsAddProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        costPrice: 0,
        category: 'Coffee & Spices',
        image: `https://picsum.photos/seed/${Math.random()}/600/600`,
        images: [],
        stock: 0
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Save product error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'products');
      setNotification({ message: 'Failed to save product', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      setIsDeletingProduct(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  // Products state synced with Firestore

  const filteredAdminOrders = useMemo(() => {
    let result = [...orders];
    if (isMerchant && !isSuperAdmin) {
      result = result.filter(o => o.items.some((item: any) => item.merchantId === user?.uid));
    }
    if (orderSearch) {
      const s = orderSearch.toLowerCase();
      result = result.filter(o => 
        o.customerName?.toLowerCase().includes(s) || 
        o.customerPhone?.toLowerCase().includes(s) || 
        o.customerEmail?.toLowerCase().includes(s) ||
        o.id?.toLowerCase().includes(s) ||
        o.paymentMethod?.toLowerCase().includes(s)
      );
    }
    if (orderStatusFilter !== 'all') {
      result = result.filter(o => o.status === orderStatusFilter);
    }
    if (orderSortConfig) {
      result.sort((a, b) => {
        const aValue = a[orderSortConfig.key];
        const bValue = b[orderSortConfig.key];
        if (aValue < bValue) return orderSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return orderSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [orders, orderSearch, orderSortConfig, orderStatusFilter]);

  const filteredAdminProducts = useMemo(() => {
    let result = [...products];
    if (isMerchant && !isSuperAdmin) {
      result = result.filter(p => p.merchantId === user?.uid);
    }
    if (productSearch) {
      const s = productSearch.toLowerCase();
      result = result.filter(p => 
        p.name?.toLowerCase().includes(s) || 
        p.description?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s) ||
        p.id?.toLowerCase().includes(s)
      );
    }
    if (productSortConfig) {
      result.sort((a, b) => {
        const aValue = (a as any)[productSortConfig.key];
        const bValue = (b as any)[productSortConfig.key];
        if (aValue < bValue) return productSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return productSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [products, productSearch, productSortConfig]);

  const filteredAdminUsers = useMemo(() => {
    let result = [...allUsers];
    if (userSearch) {
      const s = userSearch.toLowerCase();
      result = result.filter(u => 
        u.email?.toLowerCase().includes(s) || 
        u.id?.toLowerCase().includes(s) ||
        u.role?.toLowerCase().includes(s)
      );
    }
    if (userSortConfig) {
      result.sort((a, b) => {
        const aValue = a[userSortConfig.key];
        const bValue = b[userSortConfig.key];
        if (aValue < bValue) return userSortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return userSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allUsers, userSearch, userSortConfig]);

  const handleSort = (tab: 'orders' | 'products' | 'users', key: string) => {
    const setConfig = tab === 'orders' ? setOrderSortConfig : tab === 'products' ? setProductSortConfig : setUserSortConfig;
    const currentConfig = tab === 'orders' ? orderSortConfig : tab === 'products' ? productSortConfig : userSortConfig;

    if (currentConfig?.key === key) {
      setConfig({ key, direction: currentConfig.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      setConfig({ key, direction: 'asc' });
    }
  };

  const completedOrVerifiedOrders = useMemo(() => {
    let result = orders.filter(o => ['completed', 'verified', 'shipped', 'delivered'].includes(o.status));
    if (isMerchant && !isSuperAdmin) {
      result = result.filter(o => o.items.some((item: any) => item.merchantId === user?.uid));
    }
    return result;
  }, [orders, isMerchant, isSuperAdmin, user]);
  
  const revenueByDate = useMemo(() => {
    const data: { [key: string]: number } = {};
    completedOrVerifiedOrders.forEach(o => {
      if (o.createdAt) {
        const date = o.createdAt.toDate().toLocaleDateString();
        let amount = 0;
        if (isSuperAdmin) {
          amount = o.totalAmount || 0;
        } else {
          // For merchant, only sum their items
          amount = o.items?.reduce((iSum: number, item: any) => {
            if (item.merchantId === user?.uid) return iSum + (item.price * item.quantity);
            return iSum;
          }, 0) || 0;
        }
        data[date] = (data[date] || 0) + amount;
      }
    });
    return Object.entries(data).map(([date, amount]) => ({ date, amount })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [completedOrVerifiedOrders, isSuperAdmin, user]);

  const orderStatusData = useMemo(() => {
    const data: { [key: string]: number } = {};
    const relevantOrders = (isMerchant && !isSuperAdmin) 
      ? orders.filter(o => o.items.some((item: any) => item.merchantId === user?.uid))
      : orders;
    relevantOrders.forEach(o => {
      data[o.status] = (data[o.status] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [orders, isMerchant, isSuperAdmin, user]);

  const topProductsData = useMemo(() => {
    const data: { [key: string]: number } = {};
    completedOrVerifiedOrders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (isSuperAdmin || item.merchantId === user?.uid) {
          data[item.name] = (data[item.name] || 0) + item.quantity;
        }
      });
    });
    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [completedOrVerifiedOrders, isSuperAdmin, user]);

  const revenueByCategoryData = useMemo(() => {
    const data: { [key: string]: number } = {};
    completedOrVerifiedOrders.forEach(o => {
      o.items?.forEach((item: any) => {
        if (isSuperAdmin || item.merchantId === user?.uid) {
          const product = products.find(p => p.id === item.productId || p.name === item.name);
          const category = product ? product.category : 'Other';
          data[category] = (data[category] || 0) + (item.price * item.quantity);
        }
      });
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [completedOrVerifiedOrders, isSuperAdmin, user, products]);

  const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

  // Fetch user role from Firestore and ensure user document exists
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      
      // Ensure document exists
      const ensureUserDoc = async () => {
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            await setDoc(userDocRef, {
              email: user.email,
              displayName: user.displayName,
              role: 'customer',
              active: true,
              createdAt: serverTimestamp(),
              wishlist: []
            });
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('the client is offline')) {
            console.warn("Firestore is offline, will retry ensuring user document when online.");
          } else {
            console.error("Error ensuring user document:", error);
          }
        }
      };
      
      ensureUserDoc();

      const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setUserProfile({ id: snapshot.id, ...data });
          setUserRole(data.role as UserRole);
          setIsActive(data.active !== false);
          
          // Sync wishlist from Firestore
          if (data.wishlist && Array.isArray(data.wishlist)) {
            setWishlist(data.wishlist);
          }
          
          // Populate profile form if not editing
          if (!isEditingProfile) {
            setProfileForm({
              displayName: data.displayName || user.displayName || '',
              phoneNumber: data.phoneNumber || '',
              address: data.address || {
                city: '',
                area: '',
                street: '',
                houseNumber: ''
              }
            });
          }
          
          // Check if user is deactivated
          if (data.active === false && user.email?.toLowerCase() !== "abaygebeyaw1996@gmail.com") {
            logOut();
            setNotification({ 
              message: 'Your account has been deactivated. Please contact support.', 
              type: 'error' 
            });
            setTimeout(() => setNotification(null), 5000);
          }
        } else {
          // If user doc doesn't exist, check if it's the hardcoded admin
          const isHardcodedAdmin = user.email?.toLowerCase() === "abaygebeyaw1996@gmail.com";
          const initialRole = isHardcodedAdmin ? 'super_admin' : 'customer';
          setUserRole(initialRole);
          if (user.email) {
            setDoc(userDocRef, { 
              email: user.email, 
              role: initialRole,
              active: true,
              createdAt: serverTimestamp()
            }).catch(err => {
              console.error("Failed to create user document:", err);
            });
          }
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      });
      return () => unsubscribe();
    } else {
      setUserRole('customer');
      setIsActive(true);
    }
  }, [user]);

  // Sync products from Firestore
  useEffect(() => {
    const initializeProducts = async () => {
      const batch = writeBatch(db);
      for (const p of PRODUCTS) {
        const productData = {
          ...p,
          merchantId: p.merchantId || user?.uid || 'platform',
          merchantName: p.merchantName || 'ABAY'
        };
        batch.set(doc(db, 'products', p.id), productData);
      }
      try {
        await batch.commit();
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Firestore is offline, failed to initialize products. Will retry later.");
        } else {
          console.error("Failed to initialize products:", error);
        }
      }
    };

    const q = query(collection(db, 'products'), orderBy('soldCount', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hasOldCategories = snapshot.docs.some(doc => {
        const cat = (doc.data() as Product).category;
        return ['AI Fuzzy', 'Probabilistic', 'Levenshtein', 'Text Similarity'].includes(cat);
      });

      if ((snapshot.empty || hasOldCategories) && isAdmin) {
        // Initialize products collection if empty or has old categories (only for admins)
        initializeProducts();
      } else if (!snapshot.empty) {
        // Use a Map to ensure uniqueness by the 'id' field in the data
        const productMap = new Map<string, Product>();
        snapshot.docs.forEach(doc => {
          const data = doc.data() as Product;
          const id = data.id || doc.id;
          if (!productMap.has(id)) {
            productMap.set(id, { ...data, id });
          }
        });
        setProducts(Array.from(productMap.values()));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });
    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if ((isOrderManager || isMerchant) && view === 'admin' && (adminTab === 'orders' || adminTab === 'overview')) {
      let q;
      if (isOrderManager) {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      } else {
        q = query(collection(db, 'orders'), where('merchantIds', 'array-contains', user?.uid), orderBy('createdAt', 'desc'));
      }
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
      return () => unsubscribe();
    }
  }, [isOrderManager, isMerchant, view, adminTab, user]);

  useEffect(() => {
    if (isSuperAdmin && view === 'admin' && adminTab === 'overview' && stats.verifiedSellers === 0 && stats.happyCustomers === 0) {
      recalculateGlobalStats();
    }
  }, [isSuperAdmin, view, adminTab, stats]);

  useEffect(() => {
    if (isSuperAdmin && view === 'admin' && (adminTab === 'users' || adminTab === 'applications')) {
      const q = query(collection(db, 'users'), orderBy('email', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    }
  }, [isSuperAdmin, view, adminTab]);

  useEffect(() => {
    if (user && view === 'profile') {
      setIsUserOrdersLoading(true);
      const q = query(
        collection(db, 'orders'),
        where('customerUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUserOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setIsUserOrdersLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setIsUserOrdersLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [user, view]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: profileForm.displayName,
        phoneNumber: profileForm.phoneNumber,
        address: profileForm.address,
        updatedAt: serverTimestamp()
      });
      setIsEditingProfile(false);
      setNotification({ message: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Profile update error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!isSuperAdmin) return;
    try {
      await updateDoc(doc(db, 'users', userId), { active: !currentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleSignIn = (mode: any = 'login') => {
    const validMode = (mode === 'signup' || mode === 'login') ? mode : 'login';
    setAuthModalMode(validMode);
    setIsAuthModalOpen(true);
  };

  const handleSendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setNotification({ message: 'Verification email sent! Please check your inbox.', type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      setNotification({ message: 'Error sending verification email. Please try again later.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const exportOrdersToCSV = () => {
    if (orders.length === 0) return;

    const headers = ['Order ID', 'Customer Name', 'Phone', 'Email', 'Address', 'Total Amount', 'Status', 'Payment Method', 'Date'];
    const rows = orders.map(order => [
      order.id,
      order.customerName,
      order.customerPhone,
      order.customerEmail,
      `"${order.customerAddress?.replace(/"/g, '""')}"`,
      order.totalAmount,
      order.status,
      order.paymentMethod,
      order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pre-fill delivery info when user changes
  useEffect(() => {
    if (user) {
      setCustomerName(user.displayName || '');
      setCustomerEmail(user.email || '');
      
      // Fetch additional info from user profile
      const fetchProfile = async () => {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.phone) setCustomerPhone(data.phone);
            if (data.city) setCustomerCity(data.city);
            if (data.area) setCustomerArea(data.area);
            if (data.houseNo) setCustomerHouseNo(data.houseNo);
            if (data.address) setCustomerAddress(data.address);
          }
      };
      fetchProfile();
    }
  }, [user]);



  const categories = useMemo(() => ['All', ...PRODUCT_CATEGORIES], []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (p.name?.toLowerCase().includes(query) || false) || 
                           (p.description?.toLowerCase().includes(query) || false) ||
                           (p.tags?.some(tag => tag.toLowerCase().includes(query)) || false);
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      
      let matchesPrice = true;
      if (priceRange === '0-500') matchesPrice = p.price <= 500;
      else if (priceRange === '500-1000') matchesPrice = p.price > 500 && p.price <= 1000;
      else if (priceRange === '1000+') matchesPrice = p.price > 1000;
      
      let matchesAvailability = true;
      if (availability === 'in-stock') matchesAvailability = p.stock > 0;
      else if (availability === 'out-of-stock') matchesAvailability = p.stock <= 0;
      
      return matchesSearch && matchesCategory && matchesPrice && matchesAvailability;
    }).sort((a, b) => b.soldCount - a.soldCount);
  }, [searchQuery, selectedCategory, priceRange, availability, products]);


  const addToCart = (product: Product, quantity: number = 1, variants?: Record<string, string>) => {
    if (!product || product.stock <= 0) {
      console.warn("Cannot add to cart: Product out of stock or invalid", product);
      return;
    }

    // Check if all variants are selected
    if (product.variants && product.variants.length > 0) {
      const allSelected = product.variants.every(v => variants && variants[v.name]);
      if (!allSelected) {
        // If not all selected, open the product modal to let user select
        setSelectedProduct(product);
        setCurrentImageIndex(0);
        setNotification({ message: 'Please select options', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
    }
    
    const variantKey = variants ? JSON.stringify(Object.entries(variants).sort()) : '';
    const cartId = `${product.id}-${variantKey}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartId === cartId);
      if (existing) {
        const totalQty = existing.quantity + quantity;
        if (totalQty > product.stock) {
          setNotification({ message: 'Maximum stock reached', type: 'error' });
          return prev;
        }
        return prev.map(item => 
          item.cartId === cartId 
            ? { ...item, quantity: totalQty } 
            : item
        );
      }
      return [...prev, { cartId, product, quantity, selectedVariants: variants }];
    });
    
    setNotification({ message: `${product.name} added to cart`, type: 'success' });
    setCheckoutStep('cart');
    setIsCartOpen(true);
    setSelectedVariants({}); // Reset variants after adding
    
    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, Math.min(item.product.stock, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const setQuantity = (productId: string, value: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return item;
        const newQty = isNaN(value) ? 1 : Math.max(1, Math.min(product.stock, value));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handlePlaceOrder = async (paymentMethod: 'Telebirr' | 'CBE') => {
    if (user && !isActive) {
      setNotification({ message: 'Your account is disabled. Please contact support.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (!customerName || !customerPhone || !customerEmail || !customerCity || !customerArea || !customerAddress) {
      setFormError('Please fill in all delivery information.');
      setCheckoutStep('delivery');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      setFormError('Please enter a valid email address.');
      setCheckoutStep('cart');
      return;
    }

    setIsSubmitting(true);
    setOrderError(null);
    try {
      // Start generating a unique order ID in parallel with image processing
      const generateOrderId = async (): Promise<string> => {
        let orderId = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 5) {
          attempts++;
          orderId = Math.floor(100000 + Math.random() * 900000).toString();
          const checkDoc = await getDoc(doc(db, 'orders', orderId));
          if (!checkDoc.exists()) {
            isUnique = true;
          }
        }
        if (!isUnique) {
          orderId = `${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
        }
        return orderId;
      };

      const orderIdPromise = generateOrderId();
      let receiptImageUrl = '';

      if (receiptFile) {
        let uploadSuccess = false;
        let retryCount = 0;
        const maxRetries = 2;

        while (!uploadSuccess && retryCount <= maxRetries) {
          try {
            if (retryCount > 0) {
              console.log(`Retrying upload (attempt ${retryCount + 1})...`);
            }
            
            setIsCompressing(true);
            const compressedBlob = await compressImage(receiptFile);
            setIsCompressing(false);
            
            setIsUploading(true);
            const sanitizedName = receiptFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storagePath = `receipts/${Date.now()}_${sanitizedName}`;
            console.log("Starting upload to:", storagePath);
            const storageRef = ref(storage, storagePath);
            
            const uploadTask = uploadBytesResumable(storageRef, compressedBlob);
            
            const uploadPromise = new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.error("Upload timeout reached for:", storagePath);
                reject(new Error("TIMEOUT"));
              }, 300000); // 5 minutes per attempt

              uploadTask.on('state_changed', 
                (snapshot) => {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  setUploadProgress(progress);
                  console.log(`Upload progress for ${storagePath}: ${progress.toFixed(2)}%`);
                }, 
                (error) => {
                  clearTimeout(timeout);
                  console.error("Upload error for:", storagePath, error);
                  reject(error);
                }, 
                async () => {
                  clearTimeout(timeout);
                  console.log("Upload complete for:", storagePath);
                  const url = await getDownloadURL(uploadTask.snapshot.ref);
                  resolve(url);
                }
              );
            });

            receiptImageUrl = await uploadPromise as string;
            setIsUploading(false);
            setUploadProgress(100);
            uploadSuccess = true;
          } catch (uploadErr: any) {
            console.error(`Upload attempt ${retryCount + 1} failed:`, uploadErr);
            retryCount++;
            if (retryCount > maxRetries) {
              setIsCompressing(false);
              setIsUploading(false);
              setUploadProgress(0);
              if (uploadErr.message === "TIMEOUT") {
                throw new Error("Upload timed out after multiple attempts. Please check your connection.");
              }
              if (uploadErr.code === 'storage/unauthorized') {
                throw new Error("Permission denied for receipt upload. Please contact support.");
              }
              throw new Error(`Failed to upload receipt: ${uploadErr.message || 'Unknown error'}`);
            }
            // Wait a bit before retrying
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      // Wait for the order ID to be ready (it might already be)
      const orderId = await orderIdPromise;
      setLastOrderId(orderId);

      // Calculate commissions
      const merchantCommissions = cart.map(item => {
        const itemTotal = item.product.price * item.quantity;
        const commission = itemTotal * COMMISSION_RATE;
        return {
          merchantId: item.product.merchantId || 'platform',
          merchantName: item.product.merchantName || 'ABAY',
          productId: item.product.id,
          productName: item.product.name,
          itemTotal,
          commission,
          quantity: item.quantity
        };
      });

      const totalCommission = merchantCommissions.reduce((sum, mc) => sum + mc.commission, 0);

      const orderData = {
        customerName,
        customerPhone,
        customerEmail,
        customerUid: user?.uid || null,
        customerCity,
        customerArea,
        customerHouseNo: customerHouseNo || "",
        customerAddress,
        merchantIds: Array.from(new Set(cart.map(item => item.product.merchantId || 'platform'))),
        items: cart.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          selectedVariants: item.selectedVariants || {},
          merchantId: item.product.merchantId || 'platform',
          merchantName: item.product.merchantName || 'ABAY'
        })),
        totalAmount: cartTotal,
        commissionAmount: totalCommission,
        merchantCommissions,
        status: 'pending',
        paymentMethod,
        transactionRef: transactionRef || "",
        receiptImage: receiptImageUrl || "",
        createdAt: serverTimestamp()
      };

      console.log("Order Data to be sent:", JSON.stringify(orderData, null, 2));

      // Use a batch for all database writes to improve performance
      const batch = writeBatch(db);
      
      // 1. Create the order
      console.log("Adding order to batch:", orderId, orderData);
      batch.set(doc(db, 'orders', orderId), orderData);
      
      // 2. Save address to profile if requested
      if (user && shouldSaveAddress) {
        const userDocRef = doc(db, 'users', user.uid);
        console.log("Updating user profile in batch:", user.uid);
        batch.update(userDocRef, {
          displayName: customerName,
          phoneNumber: customerPhone,
          address: {
            city: customerCity,
            area: customerArea,
            street: customerAddress,
            houseNumber: customerHouseNo
          },
          updatedAt: serverTimestamp()
        });
      }
      
      // 3. Update product stock and soldCount
      for (const item of cart) {
        const productRef = doc(db, 'products', item.product.id);
        console.log("Updating product stock in batch:", item.product.id, item.quantity);
        batch.update(productRef, {
          stock: increment(-item.quantity),
          soldCount: increment(item.quantity)
        });
      }

      // 4. Update global stats for happy customers
      // We increment happyCustomers for every order placed
      const statsRef = doc(db, 'stats', 'global');
      batch.set(statsRef, {
        happyCustomers: increment(1)
      }, { merge: true });

      try {
        console.log("Committing batch...");
        await batch.commit();
        console.log("Batch commit successful!");
      } catch (err) {
        console.error("Batch commit failed:", err);
        handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
        throw err;
      }
      
      // Move to success screen immediately
      setLastOrderItems([...cart]);
      setLastOrderTotal(cartTotal);
      setCheckoutStep('success');
      setCart([]); // Clear cart on success
      setReceiptFile(null); // Clear receipt file
      setTransactionRef(''); // Clear transaction reference
      
      // Send notifications in background
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          customerName,
          customerEmail,
          customerPhone,
          items: cart.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
          })),
          totalAmount: cartTotal
        })
      }).catch(notifyError => {
        console.error("Notification error:", notifyError);
      });

    } catch (error: any) {
      console.error("Order error:", error);
      setOrderError('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsCompressing(false);
      setIsUploading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, estimatedDelivery?: string) => {
    try {
      const updateData: any = { status };
      if (estimatedDelivery) {
        updateData.estimatedDelivery = estimatedDelivery;
      }
      await updateDoc(doc(db, 'orders', orderId), updateData);
      
      // Update local state if tracking this order
      if (trackedOrder && trackedOrder.id === orderId) {
        setTrackedOrder({ ...trackedOrder, ...updateData });
      }
      
      // Update selected order in modal if open
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updateData });
      }
      
      setNotification({ message: t('orderStatusUpdated'), type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updateOrderDetails = async (orderId: string, updatedData: any) => {
    try {
      setIsSubmitting(true);
      await updateDoc(doc(db, 'orders', orderId), updatedData);
      
      // Update selected order in modal
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updatedData });
      }
      
      setIsEditingOrderDetails(false);
      setNotification({ message: 'Order details updated successfully', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error updating order details:", error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    setConfirmationModal({
      isOpen: true,
      title: t('deleteOrderTitle'),
      message: t('deleteOrderMessage'),
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
          setConfirmationModal(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
        }
      }
    });
  };

  const clearAllOrders = async () => {
    console.log("clearAllOrders called. isSuperAdmin:", isSuperAdmin, "userRole:", userRole, "email:", user?.email, "isActive:", isActive, "ordersCount:", orders.length);
    console.log("Full user object for debug:", {
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      providerData: user?.providerData
    });
    
    if (!isSuperAdmin) {
      console.warn("clearAllOrders blocked: Not a super admin.");
      return;
    }
    
    setConfirmationModal({
      isOpen: true,
      title: t('clearAllOrdersTitle'),
      message: t('clearAllOrdersMessage'),
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          const ordersRef = collection(db, 'orders');
          const snapshot = await getDocs(ordersRef);
          
          const batch = writeBatch(db);
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          setConfirmationModal(null);
          setNotification({ message: t('clearAllOrdersSuccess'), type: 'success' });
          setTimeout(() => setNotification(null), 3000);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'orders/all');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleTrackOrder = async (e?: React.FormEvent, overrideId?: string) => {
    if (e) e.preventDefault();
    const idToTrack = overrideId || trackingId.trim();
    if (!idToTrack) return;

    setIsTrackingLoading(true);
    setTrackingError(null);
    setTrackedOrder(null);

    try {
      const docRef = doc(db, 'orders', idToTrack);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setTrackedOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        setTrackingError('Order not found. Please check the ID and try again.');
      }
    } catch (error) {
      console.error("Tracking error:", error);
      setTrackingError('An error occurred while tracking.');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  useEffect(() => {
    if (products.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    const productId = params.get('product');

    if (trackId) {
      setTrackingId(trackId);
      handleTrackOrder(undefined, trackId);
      // Scroll to tracking section
      const trackingSection = document.getElementById('track-order');
      if (trackingSection) {
        trackingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }

    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [products]);

  const handleConfirmDelivery = async (orderId: string) => {
    setIsConfirmingDelivery(true);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'completed' });
      if (trackedOrder && trackedOrder.id === orderId) {
        setTrackedOrder({ ...trackedOrder, status: 'completed' });
      }
    } catch (error) {
      console.error("Confirm delivery error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    } finally {
      setIsConfirmingDelivery(false);
    }
  };


  const syncProductsWithConstants = async () => {
    if (!isAdmin || isSyncing) return;
    setIsSyncing(true);
    try {
      const batch = writeBatch(db);
      for (const p of PRODUCTS) {
        const productData = {
          ...p,
          merchantId: p.merchantId || user?.uid || 'platform',
          merchantName: p.merchantName || 'ABAY'
        };
        batch.set(doc(db, 'products', p.id), productData, { merge: true });
      }
      await batch.commit();
      setNotification({ message: 'Products synced with constants', type: 'success' });
    } catch (error) {
      console.error("Failed to sync products:", error);
      setNotification({ message: 'Failed to sync products', type: 'error' });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsChatLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not defined in environment variables.");
        setNotification({ message: "AI service is not configured.", type: 'error' });
        return;
      }
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        You are a helpful and friendly AI assistant for "ABAY", a premium e-commerce store in Ethiopia offering bedding solutions, clothing, and more.
        Your goal is to help customers find the right mattresses, pillows, and bedding accessories to improve their sleep quality.
        
        Store Information:
        - Name: ABAY
        - Mission: Bringing premium sleep quality and comfort to customers' doors.
        - Location: Bahir Dar, Ethiopia.
        - Payment Method: Telebirr (0918192081), CBE Bank (10000959890).
        - Order Tracking: Customers can track orders using their Order ID in the "Track Order" section. If they lose their ID, they can use the "Find My Order" feature within the tracking section to search by email or phone. Order statuses include: pending, verified, shipped, delivered, and completed. Customers can confirm delivery themselves once the order is shipped or delivered.
        - Support Email: ABAYGEBEYAW1996@gmail.com
        
        User Guide Summary:
        - Change Language: Use the English/አማርኛ toggle at the top (desktop) or in the mobile sidebar.
        - Add To Cart: Click on a product, select options, and click "Add to Cart" or "Buy Now".
        - Track Order: Go to the "Track Order" page and enter your Order ID.
        - Become a Merchant: Navigate to "Merchant Center" or "Become a Verified Seller" in the footer, sign in, and complete the form.
        
        Available Products:
        ${PRODUCTS.map(p => `- ${p.name}: ${p.price} ETB. ${p.description}`).join('\n')}
        
        Guidelines:
        - Be polite and professional.
        - Respond in the language used by the user (Amharic or English).
        - If a user asks for a product not in the list, politely inform them we don't have it yet but are constantly adding new items.
        - Encourage users to add items to their cart and proceed to checkout.
        - Keep responses concise and helpful.
      `;

      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: systemInstruction,
        },
        history: chatMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const result = await chat.sendMessage({ message: userMessage });
      const responseText = result.text;

      setChatMessages(prev => [...prev, { role: 'model', text: responseText || t('aiDefaultResponse') }]);
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = t('aiErrorGeneral');
      
      // Check for quota error
      if (error?.message?.includes('429') || error?.status === 429 || (typeof error === 'string' && error.includes('429'))) {
        errorMessage = t('aiErrorQuota');
      }
      
      setChatMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    setNotification({
      type: 'success',
      message: 'Thank you for subscribing to our newsletter!'
    });
    setNewsletterEmail('');
  };

  const renderMainContent = () => {
    if (view === 'admin' && (isAdmin || isMerchant)) {
      const relevantOrders = orders.filter(o => {
        if (isSuperAdmin) return true;
        if (isMerchant) return o.items.some((item: any) => item.merchantId === user?.uid);
        return true;
      });

      const completedOrVerifiedOrders = relevantOrders.filter(o => ['completed', 'verified', 'shipped', 'delivered'].includes(o.status));
      
      const totalRevenue = completedOrVerifiedOrders.reduce((sum, o) => {
        if (isSuperAdmin) return sum + (o.totalAmount || 0);
        // For merchant, only sum their items
        return sum + (o.items?.reduce((iSum: number, item: any) => {
          if (item.merchantId === user?.uid) return iSum + (item.price * item.quantity);
          return iSum;
        }, 0) || 0);
      }, 0);

      const totalQuantity = completedOrVerifiedOrders.reduce((sum, o) => {
        return sum + (o.items?.reduce((iSum: number, item: any) => {
          if (isSuperAdmin || item.merchantId === user?.uid) return iSum + item.quantity;
          return iSum;
        }, 0) || 0);
      }, 0);
      
      const totalOrdersCount = completedOrVerifiedOrders.length;
      const totalCost = completedOrVerifiedOrders.reduce((sum, o) => {
        return sum + (o.items?.reduce((iSum: number, item: any) => {
          if (isSuperAdmin || item.merchantId === user?.uid) {
            const product = products.find(p => p.id === item.productId);
            const cost = product ? product.costPrice : item.price * 0.7;
            return iSum + (cost * item.quantity);
          }
          return iSum;
        }, 0) || 0);
      }, 0);

      const totalCommission = completedOrVerifiedOrders.reduce((sum, o) => {
        if (isSuperAdmin) return sum + (o.commissionAmount || 0);
        // For merchant, sum commission paid for their items
        return sum + (o.merchantCommissions?.reduce((iSum: number, mc: any) => {
          if (mc.merchantId === user?.uid) return iSum + mc.commission;
          return iSum;
        }, 0) || 0);
      }, 0);
      
      const grossProfit = isSuperAdmin ? (totalRevenue - totalCost) : (totalRevenue - totalCost - totalCommission);
      const pendingOrders = relevantOrders.filter(o => o.status === 'pending').length;

      return (
        <>
        {/* Background Logo Watermark */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.05] z-0 overflow-hidden">
          <div className="relative transform rotate-12 scale-[3] sm:scale-[5]">
            <div className="w-64 h-64 bg-emerald-600 rounded-[3rem] flex items-center justify-center text-white font-bold shadow-2xl">
              <span className="text-[120px] leading-none -ml-4">W</span>
              <span className="text-[60px] absolute bottom-10 right-10">A</span>
            </div>
            <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap text-emerald-900 font-display font-bold text-4xl tracking-widest uppercase">
              {t('adminDashboard')}
            </div>
          </div>
        </div>

        <nav className="bg-white border-b sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('shop')} className="p-2 hover:bg-stone-100 rounded-full">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <h1 className="text-xl font-bold font-display">{t('adminDashboard')}</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-500">{user?.email} ({userRole})</span>
              <button onClick={() => logOut()} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 flex gap-8">
            {(isSuperAdmin || isOrderManager || isMerchant || isContentManager) && (
              <button 
                onClick={() => setAdminTab('overview')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${adminTab === 'overview' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
              >
                {t('overview')}
              </button>
            )}
            {(isSuperAdmin || isOrderManager || isMerchant || isDeliveryPerson) && (
              <button 
                onClick={() => setAdminTab('orders')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${adminTab === 'orders' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
              >
                {t('orders')}
              </button>
            )}
            {(isSuperAdmin || isContentManager || isMerchant) && (
              <button 
                onClick={() => setAdminTab('products')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${adminTab === 'products' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
              >
                {t('products')}
              </button>
            )}
            {isSuperAdmin && (
              <button 
                onClick={() => setAdminTab('applications')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${adminTab === 'applications' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
              >
                {t('applications')}
              </button>
            )}
            {isSuperAdmin && (
              <button 
                onClick={() => setAdminTab('users')}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${adminTab === 'users' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
              >
                {t('users')}
              </button>
            )}
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          {adminTab === 'overview' && (isSuperAdmin || isOrderManager || isMerchant || isContentManager) && (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold font-display">
                  {isMerchant && !isSuperAdmin ? t('merchantOverview') : 
                   isContentManager && !isSuperAdmin ? t('contentOverview') : 
                   isOrderManager && !isSuperAdmin ? t('orderOverview') : 
                   t('businessOverview')}
                </h2>
                {(isSuperAdmin || isMerchant || isOrderManager) && (
                  <div className="flex gap-2">
                    {isSuperAdmin && (
                      <button 
                        onClick={recalculateGlobalStats}
                        disabled={isRecalculatingStats}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold hover:bg-stone-200 transition-all"
                      >
                        {isRecalculatingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {t('recalculateStats')}
                      </button>
                    )}
                    <button 
                      onClick={exportOrdersToCSV}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <Download className="w-4 h-4" /> {t('exportFullReport')}
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                {(isSuperAdmin || isMerchant || isOrderManager) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">{t('totalRevenue')}</span>
                    </div>
                    <div className="text-3xl font-bold text-stone-900">{totalRevenue.toLocaleString()} <span className="text-sm font-normal text-stone-400">ETB</span></div>
                    <p className="text-[10px] text-stone-400 mt-1">{t('fromVerifiedOrders')}</p>
                  </div>
                )}

                {(isSuperAdmin || isMerchant || isOrderManager) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">{t('totalOrders')}</span>
                    </div>
                    <div className="text-3xl font-bold text-stone-900">{totalOrdersCount}</div>
                    <p className="text-[10px] text-stone-400 mt-1">{t('completedVerifiedOrders')}</p>
                  </div>
                )}

                {(isSuperAdmin || isMerchant) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">{t('grossProfit')}</span>
                    </div>
                    <div className="text-3xl font-bold text-emerald-600">{grossProfit.toLocaleString()} <span className="text-sm font-normal text-stone-400">ETB</span></div>
                    <p className="text-[10px] text-stone-400 mt-1">{t('revenueMinusCost')}</p>
                  </div>
                )}

                {(isSuperAdmin || isMerchant || isOrderManager || isContentManager) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                        <Package className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">
                        {isContentManager && !isSuperAdmin ? t('totalProducts') : t('quantitySold')}
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-stone-900">
                      {isContentManager && !isSuperAdmin ? products.length : totalQuantity} 
                      <span className="text-sm font-normal text-stone-400">
                        {' '}{t('items')}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {isContentManager && !isSuperAdmin ? t('activeListings') : t('totalUnitsMoved')}
                    </p>
                  </div>
                )}

                {(isSuperAdmin || isMerchant || isOrderManager) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                        <Clock className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">{t('pendingOrders')}</span>
                    </div>
                    <div className="text-3xl font-bold text-stone-900">{pendingOrders}</div>
                    <p className="text-[10px] text-stone-400 mt-1">{t('awaitingVerification')}</p>
                  </div>
                )}

                {(isSuperAdmin || isMerchant) && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                        <Percent className="w-6 h-6" />
                      </div>
                      <span className="text-stone-500 font-medium">
                        {isSuperAdmin ? t('totalCommission') : t('commissionPaid')}
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-rose-600">{totalCommission.toLocaleString()} <span className="text-sm font-normal text-stone-400">ETB</span></div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {isSuperAdmin ? t('platformEarnings') : t('platformFee')}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue Over Time */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <LineIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-stone-900">Revenue Trend</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueByDate}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`${value.toLocaleString()} ETB`, 'Revenue']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <BarIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-stone-900">{t('topSellingProducts')}</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProductsData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#64748b' }}
                          width={100}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#3b82f6" 
                          radius={[0, 4, 4, 0]} 
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Order Status Distribution */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <PieIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-stone-900">{t('orderStatus')}</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {orderStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue by Category */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <PieIcon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-stone-900">{t('revenueByCategory')}</h3>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueByCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {revenueByCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`${value.toLocaleString()} ETB`, t('revenue')]}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-lg font-bold">{t('recentOrders')}</h2>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setAdminTab('orders')} className="text-emerald-600 text-sm font-medium hover:underline">{t('viewAll')}</button>
                    {isSuperAdmin && orders.length > 0 && (
                      <button 
                        onClick={clearAllOrders}
                        className="flex items-center gap-2 text-xs text-red-600 font-bold hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> {t('clearAllOrders')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold">{t('customer')}</th>
                        <th className="px-6 py-4 font-bold">{t('amount')}</th>
                        <th className="px-6 py-4 font-bold">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredAdminOrders.slice(0, 5).map(order => (
                        <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-stone-900">{order.customerName}</div>
                            <div className="text-[10px] text-stone-400">{order.createdAt?.toDate().toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600">
                            {order.totalAmount?.toLocaleString()} ETB
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                              order.status === 'delivered' ? 'bg-indigo-100 text-indigo-700' :
                              order.status === 'declined' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {t(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {adminTab === 'orders' && (isSuperAdmin || isOrderManager || isMerchant) && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{t('orderManagement')}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <button 
                      onClick={exportOrdersToCSV}
                      className="flex items-center gap-2 text-xs text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                    >
                      <Download className="w-3 h-3" /> {t('exportReportCSV')}
                    </button>
                    {isSuperAdmin && orders.length > 0 && (
                      <button 
                        onClick={clearAllOrders}
                        className="flex items-center gap-2 text-xs text-red-600 font-bold hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> {t('clearAllOrders')}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                  <select 
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="pending">{t('pending')}</option>
                    <option value="verified">{t('verified')}</option>
                    <option value="processing">{t('processing')}</option>
                    <option value="shipped">{t('shipped')}</option>
                    <option value="out_for_delivery">{t('outForDelivery')}</option>
                    <option value="delivered">{t('delivered')}</option>
                    <option value="completed">{t('completed')}</option>
                    <option value="declined">{t('declined')}</option>
                  </select>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder={t('searchOrders')} 
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'customerName')}>
                        <div className="flex items-center gap-1">{t('customer')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'createdAt')}>
                        <div className="flex items-center gap-1">{t('date')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'customerPhone')}>
                        <div className="flex items-center gap-1">{t('phone')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold">{t('items')}</th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'totalAmount')}>
                        <div className="flex items-center gap-1">{t('amount')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      {isSuperAdmin && (
                        <th className="px-6 py-4 font-bold">{t('commission')}</th>
                      )}
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'paymentMethod')}>
                        <div className="flex items-center gap-1">{t('payment')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('orders', 'status')}>
                        <div className="flex items-center gap-1">{t('status')} <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAdminOrders.map(order => (
                      <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{order.customerName}</div>
                          <div className="text-[8px] text-stone-300">ID: {order.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-stone-600 font-medium">{order.createdAt?.toDate().toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-stone-600">{order.customerPhone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-stone-600 max-w-xs truncate">
                            {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-emerald-600">
                          {order.totalAmount?.toLocaleString()} ETB
                        </td>
                        {isSuperAdmin && (
                          <td className="px-6 py-4 font-bold text-rose-600">
                            {order.commissionAmount?.toLocaleString() || 0} ETB
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="text-sm text-stone-600 capitalize">{order.paymentMethod?.replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                            order.status === 'out_for_delivery' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'delivered' ? 'bg-indigo-100 text-indigo-700' :
                            order.status === 'declined' ? 'bg-red-100 text-red-700' :
                            'bg-stone-200 text-stone-600'
                          }`}>
                            {t(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsOrderDetailsModalOpen(true);
                              }}
                              className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-stone-100 rounded-lg active:scale-90 transition-all"
                              title={t('viewDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {order.receiptImage && (
                              <a 
                                href={order.receiptImage} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title={t('viewReceipt')}
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            {order.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'verified')}
                                  className="p-2 text-blue-600 hover:bg-blue-50 hover:scale-110 active:scale-90 rounded-lg transition-all"
                                  title={t('verifyPayment')}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'declined')}
                                  className="p-2 text-red-500 hover:bg-red-50 hover:scale-110 active:scale-90 rounded-lg transition-all"
                                  title={t('declinePayment')}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {order.status === 'verified' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'processing')}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title={t('startProcessing')}
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'processing' && (
                              <button 
                                onClick={() => {
                                  const days = prompt(t('estDeliveryPrompt'), '3');
                                  if (days) {
                                    const date = new Date();
                                    date.setDate(date.getDate() + parseInt(days));
                                    updateOrderStatus(order.id, 'shipped', date.toISOString());
                                  }
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title={t('markAsShipped')}
                              >
                                <Package className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title={t('outForDelivery')}
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title={t('markAsDelivered')}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {(order.status === 'delivered' || order.status === 'verified' || order.status === 'processing' || order.status === 'shipped' || order.status === 'out_for_delivery') && (
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title={t('completeOrder')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {isSuperAdmin && (
                              <button 
                                onClick={() => deleteOrder(order.id)}
                                className="p-2 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                                title={t('deleteOrder')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAdminOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-stone-400 italic">
                          {t('noOrdersFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {adminTab === 'products' && (isSuperAdmin || isContentManager || isMerchant) && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold">Product Management</h2>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={syncProductsWithConstants}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 rounded-xl text-sm font-bold hover:bg-stone-200 transition-colors disabled:opacity-50"
                    title="Sync existing products with hardcoded data to fix missing descriptions"
                  >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Sync Data
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        description: '',
                        price: 0,
                        costPrice: 0,
                        category: 'Coffee & Spices',
                        image: `https://picsum.photos/seed/${Math.random()}/600/600`,
                        stock: 0
                      });
                      setIsAddProductModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('products', 'name')}>
                        <div className="flex items-center gap-1">Product <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold">Images</th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('products', 'category')}>
                        <div className="flex items-center gap-1">Category <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('products', 'price')}>
                        <div className="flex items-center gap-1">Price <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('products', 'stock')}>
                        <div className="flex items-center gap-1">Stock <ArrowUpDown className="w-3 h-3" /></div>
                      </th>
                      <th className="px-6 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAdminProducts.map(product => (
                      <tr key={product.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{product.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-stone-400 font-mono">ID: {product.id}</span>
                            {isSuperAdmin && product.merchantName && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-bold uppercase tracking-wider rounded">
                                {product.merchantName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 overflow-x-auto max-w-[150px] pb-1 scrollbar-hide">
                            <img src={product.image} alt={product.name} className="w-8 h-8 rounded bg-stone-100 object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                            {product.images?.filter(img => img !== product.image).map((img, idx) => (
                              <img key={idx} src={img} alt={`${product.name} ${idx}`} className="w-8 h-8 rounded bg-stone-100 object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-[10px] font-bold uppercase tracking-wider">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-stone-900">{product.price.toLocaleString()} ETB</div>
                          <div className="text-[10px] text-stone-400">Cost: {product.costPrice.toLocaleString()} ETB</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`font-bold ${product.stock < 5 ? 'text-red-500' : 'text-stone-900'}`}>
                              {product.stock}
                            </div>
                            {product.stock < 5 && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider rounded">
                                Low Stock
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                setEditingProduct(product);
                                setProductForm({ ...product });
                                setIsAddProductModalOpen(true);
                              }}
                              className="p-2 text-stone-400 hover:text-emerald-600 rounded-lg transition-colors"
                              title={t('editProduct')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setIsDeletingProduct(product.id)}
                              className="p-2 text-stone-400 hover:text-red-500 rounded-lg transition-colors"
                              title={t('deleteProduct')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAdminProducts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">
                          {t('noProductsFound')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add/Edit Product Modal */}
              <AnimatePresence>
                {isAddProductModalOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsAddProductModalOpen(false)}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-white z-50 shadow-2xl rounded-3xl overflow-hidden flex flex-col"
                    >
                      <div className="p-6 border-b flex items-center justify-between bg-stone-50">
                        <h2 className="text-xl font-bold font-display flex items-center gap-2">
                          <Package className="w-5 h-5 text-emerald-600" />
                          {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </h2>
                        <button onClick={() => setIsAddProductModalOpen(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Product Name</label>
                          <input 
                            type="text" 
                            required
                            value={productForm.name}
                            onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                            className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Category</label>
                          <select 
                            required
                            value={productForm.category}
                            onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                            className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                            <option value="Agriculture & Food">Agriculture & Food</option>
                            <option value="Coffee & Spices">Coffee & Spices</option>
                            <option value="Apparel & Textiles">Apparel & Textiles</option>
                            <option value="Bedding Solution">Bedding Solution</option>
                            <option value="Home & Garden">Home & Garden</option>
                            <option value="Logistics Services">Logistics Services</option>
                            <option value="Beauty & Care">Beauty & Care</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Description</label>
                          <textarea 
                            required
                            rows={2}
                            value={productForm.description}
                            onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                            className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('sellingPrice')}</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={productForm.price}
                              onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                              className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('costPrice')}</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={productForm.costPrice}
                              onChange={(e) => setProductForm({...productForm, costPrice: Number(e.target.value)})}
                              className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('stockLevel')}</label>
                            <input 
                              type="number" 
                              required
                              min="0"
                              value={productForm.stock}
                              onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                              className="w-full px-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('productImage')}</label>
                          <div className="flex items-center gap-4">
                            {productForm.image && (
                              <img 
                                src={productForm.image} 
                                alt="Preview" 
                                className="w-16 h-16 object-cover rounded-xl border border-stone-200"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            <div className="flex-1">
                              <input 
                                type="file" 
                                id="product-image-upload"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setProductForm({...productForm, image: reader.result as string});
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                              <label 
                                htmlFor="product-image-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-600 cursor-pointer hover:bg-stone-200 hover:border-stone-400 transition-all"
                              >
                                <Upload className="w-4 h-4" />
                                {productForm.image ? t('changeImage') : t('uploadImage')}
                              </label>
                              <p className="text-[10px] text-stone-400 mt-1">{t('recommendedSize')}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t('productGalleryImages')}</label>
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {productForm.images?.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group">
                                <img 
                                  src={img} 
                                  alt={`Gallery ${idx}`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newImages = [...(productForm.images || [])];
                                    newImages.splice(idx, 1);
                                    setProductForm({...productForm, images: newImages});
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <input 
                                type="file" 
                                id="product-gallery-upload"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                  const count = e.target.files?.length || 0;
                                  setNotification({ message: `${count} gallery images selected`, type: 'success' });
                                  setTimeout(() => setNotification(null), 2000);
                                }}
                              />
                              <label 
                                htmlFor="product-gallery-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-stone-100 border-2 border-dashed border-stone-300 rounded-xl text-sm font-medium text-stone-600 cursor-pointer hover:bg-stone-200 hover:border-stone-400 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                                {t('addGalleryImages')}
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setIsAddProductModalOpen(false)}
                            className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                          >
                            {t('cancel')}
                          </button>
                          <button 
                            type="submit"
                            disabled={isSubmitting || isUploading}
                            className="relative flex-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 overflow-hidden"
                          >
                            {isUploading && (
                              <div 
                                className="absolute inset-0 bg-emerald-500/30 transition-all duration-300" 
                                style={{ width: `${uploadProgress}%` }}
                              />
                            )}
                            <span className="relative z-10">
                              {isSubmitting ? (
                                isUploading ? (
                                  isCompressing ? t('compressing') : `${t('uploading')} ${Math.round(uploadProgress)}%`
                                ) : t('saving')
                              ) : editingProduct ? t('updateProduct') : t('addProduct')}
                            </span>
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Delete Product Confirmation Modal */}
              <AnimatePresence>
                {isDeletingProduct && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsDeletingProduct(null)}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-50 shadow-2xl rounded-3xl overflow-hidden p-8 text-center"
                    >
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 className="w-8 h-8" />
                      </div>
                      <h2 className="text-2xl font-bold font-display mb-2">{t('deleteProductTitle')}</h2>
                      <p className="text-stone-500 mb-8">
                        {t('deleteProductDesc')}
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setIsDeletingProduct(null)}
                          className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                        >
                          {t('cancel')}
                        </button>
                        <button 
                          onClick={() => deleteProduct(isDeletingProduct)}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {adminTab === 'applications' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h2 className="text-lg font-bold mb-2">Merchant Applications</h2>
                <p className="text-xs text-stone-500 mb-6">Review and approve new merchant requests</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Merchant Info</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">TIN & Documents</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Applied At</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">Status</th>
                        <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {allUsers.filter(u => u.merchantInfo?.status === 'pending').map(app => (
                        <tr key={app.id} className="group hover:bg-stone-50/50 transition-colors">
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-stone-100 overflow-hidden border border-stone-200">
                                {app.merchantInfo.businessPictureUrl ? (
                                  <img src={app.merchantInfo.businessPictureUrl} alt="Store" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-400">
                                    <ShoppingBag className="w-5 h-5" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-stone-900">{app.merchantInfo.storeName}</p>
                                <p className="text-[10px] text-stone-500">{app.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="space-y-1">
                              <p className="text-xs font-mono text-stone-600">TIN: {app.merchantInfo.tinNumber}</p>
                              <a 
                                href={app.merchantInfo.registrationDocUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" /> {t('viewRegistration')}
                              </a>
                            </div>
                          </td>
                          <td className="py-4">
                            <p className="text-xs text-stone-600">
                              {app.merchantInfo.appliedAt ? new Date(app.merchantInfo.appliedAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-widest">
                              {t('pending')}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleApproveMerchant(app.id)}
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDecliningMerchantId(app.id)}
                                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="Decline"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allUsers.filter(u => u.merchantInfo?.status === 'pending').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-stone-400">
                              <Inbox className="w-8 h-8" />
                              <p className="text-sm">No pending applications</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Decline Reason Modal */}
              <AnimatePresence>
                {decliningMerchantId && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setDecliningMerchantId(null)}
                      className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[110]"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white z-[120] shadow-2xl rounded-3xl overflow-hidden p-8"
                    >
                      <h3 className="text-xl font-bold text-stone-900 mb-2">Decline Application</h3>
                      <p className="text-sm text-stone-500 mb-6">Please provide a reason for declining this merchant application. This will be sent to the user via email.</p>
                      
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g. Missing valid business license, TIN number mismatch..."
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all resize-none mb-6"
                        rows={4}
                      />

                      <div className="flex gap-3">
                        <button
                          onClick={() => setDecliningMerchantId(null)}
                          className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeclineMerchant(decliningMerchantId, declineReason)}
                          disabled={!declineReason.trim()}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                        >
                          Confirm Decline
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {adminTab === 'users' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Total Users</p>
                      <p className="text-2xl font-bold">{allUsers.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                      <LayoutDashboard className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Staff Members</p>
                      <p className="text-2xl font-bold">{allUsers.filter(u => u.role !== 'customer').length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Active Admins</p>
                      <p className="text-2xl font-bold">{allUsers.filter(u => u.role === 'super_admin' || u.role === 'admin').length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
                <h3 className="text-sm font-bold mb-4">Role Permissions Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-red-600 mb-1 uppercase tracking-widest">Super Admin</p>
                    <p className="text-[10px] text-stone-500">Full access to all features, including user management and system settings.</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-orange-600 mb-1 uppercase tracking-widest">Admin</p>
                    <p className="text-[10px] text-stone-500">Access to overview, orders, and products. Cannot manage users.</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-widest">Content Manager</p>
                    <p className="text-[10px] text-stone-500">Can only manage products and categories.</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-purple-600 mb-1 uppercase tracking-widest">Order Manager</p>
                    <p className="text-[10px] text-stone-500">Can only manage orders and view overview stats.</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-emerald-600 mb-1 uppercase tracking-widest">Merchant</p>
                    <p className="text-[10px] text-stone-500">Can manage their own products and orders.</p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs font-bold text-indigo-600 mb-1 uppercase tracking-widest">Delivery Person</p>
                    <p className="text-[10px] text-stone-500">Can view orders for delivery purposes.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">User Role Management</h2>
                    <p className="text-xs text-stone-500">Assign roles to staff and manage permissions</p>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('users', 'email')}>
                          <div className="flex items-center gap-1">User <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="px-6 py-4 font-bold cursor-pointer hover:text-stone-700" onClick={() => handleSort('users', 'role')}>
                          <div className="flex items-center gap-1">Current Role <ArrowUpDown className="w-3 h-3" /></div>
                        </th>
                        <th className="px-6 py-4 font-bold">Status</th>
                        <th className="px-6 py-4 font-bold">Change Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredAdminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 font-bold text-xs">
                                {u.email?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <span className="font-bold text-stone-900">{u.email}</span>
                                  {u.active === false && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-bold uppercase rounded">Deactivated</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-stone-400 font-mono">{u.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                              u.role === 'admin' ? 'bg-orange-100 text-orange-700' :
                              u.role === 'merchant' ? 'bg-emerald-100 text-emerald-700' :
                              u.role === 'content_manager' ? 'bg-blue-100 text-blue-700' :
                              u.role === 'order_manager' ? 'bg-purple-100 text-purple-700' :
                              u.role === 'delivery_person' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-stone-100 text-stone-700'
                            }`}>
                              {u.role?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => toggleUserStatus(u.id, u.active !== false)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                                u.active !== false ? 'bg-emerald-600' : 'bg-stone-200'
                              }`}
                              disabled={u.email === 'abaygebeyaw1996@gmail.com'}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                u.active !== false ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                              className="text-sm border border-stone-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all hover:border-emerald-300"
                              disabled={u.email === 'abaygebeyaw1996@gmail.com'}
                            >
                              <option value="customer">Customer</option>
                              <option value="merchant">Merchant</option>
                              <option value="admin">Admin</option>
                              <option value="content_manager">Content Manager</option>
                              <option value="order_manager">Order Manager</option>
                              <option value="delivery_person">Delivery Person</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {filteredAdminUsers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </>
    );
  }

  // Shop and Other Views
  return (
    <div className="bg-stone-50">

      {/* Top Bar */}
      <div className="bg-brand-primary text-white/80 py-2 text-[10px] font-bold uppercase tracking-widest hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Languages className="w-3 h-3 text-brand-accent" />
              <button onClick={() => i18n.changeLanguage('en')} className={`hover:text-brand-accent transition-all ${i18n.language === 'en' ? 'text-brand-accent underline' : ''}`}>EN</button>
              <span className="opacity-30">|</span>
              <button onClick={() => i18n.changeLanguage('am')} className={`hover:text-brand-accent transition-all ${i18n.language === 'am' ? 'text-brand-accent underline' : ''}`}>አማ</button>
            </div>
            <span className="opacity-30">|</span>
            <span>ETB - {i18n.language === 'am' ? 'ኢትዮጵያ' : 'Ethiopia'}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('merchant-dashboard')} className="hover:text-brand-accent transition-colors">Become a Verified Seller</button>
            <button onClick={() => setIsChatOpen(true)} className="hover:text-brand-accent transition-colors">Help Center</button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-stone-100 sticky top-0 md:relative z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => { 
            setView('shop'); 
            setSelectedCategory('All');
            const el = document.getElementById('featured-products');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-brand-primary/20">
              W
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-brand-primary leading-none">Work_Abay</span>
              <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-slate-400">Mart Ethiopia</span>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative flex items-center w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within:text-brand-accent transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Search products..." 
                className="w-full pl-11 pr-32 py-3 bg-slate-50 border-2 border-slate-100 rounded-full text-sm focus:outline-none focus:border-brand-accent focus:bg-white transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                    title="Clear Search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button className="p-2 text-slate-400 hover:text-brand-accent transition-colors" title="Search by Image">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <button 
                onClick={() => {
                  setView('shop');
                  const el = document.getElementById('featured-products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="absolute right-1 top-1 bottom-1 px-6 bg-brand-primary text-white rounded-full font-bold text-xs flex items-center gap-2 hover:bg-[#0c132e] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
              >
                {t('search', 'Search')}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-8">
              {/* Mobile Search Trigger */}
              <button 
                onClick={() => setIsMobileSearchOpen(true)}
                className="lg:hidden p-2 text-slate-500 hover:text-brand-primary active:scale-90 transition-all"
              >
                <Search className="w-6 h-6" />
              </button>

              {/* Language Switcher */}
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 group">
                <Languages className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-primary transition-colors" />
                <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest">
                  <button 
                    onClick={() => i18n.changeLanguage('en')} 
                    className={`transition-all hover:scale-110 active:scale-95 px-1 ${i18n.language === 'en' ? 'text-brand-primary' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    EN
                  </button>
                  <div className="w-[1px] h-2 bg-slate-200" />
                  <button 
                    onClick={() => i18n.changeLanguage('am')} 
                    className={`transition-all hover:scale-110 active:scale-95 px-1 ${i18n.language === 'am' ? 'text-brand-primary' : 'text-slate-400 hover:text-brand-primary'}`}
                  >
                    አማ
                  </button>
                </div>
              </div>

              <button 
                onClick={() => user ? setView('profile') : handleSignIn('login')} 
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-brand-primary hover:scale-110 active:scale-95 transition-all group"
              >
              <div className="relative">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-stone-100" />
                ) : (
                  <User className="w-6 h-6" />
                )}
                {user && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
              </div>
              <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest">
                {user ? (userProfile?.displayName?.split(' ')[0] || t('account')) : t('login')}
              </span>
            </button>

              <button 
                onClick={() => setIsCartOpen(true)} 
                className="flex flex-col items-center gap-1 text-slate-500 hover:text-brand-primary hover:scale-110 active:scale-95 transition-all relative group"
              >
                <ShoppingCart className="w-6 h-6" />
                <span className="hidden sm:block text-[9px] font-bold uppercase tracking-widest">{t('cart')}</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-2 bg-brand-accent text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bg-white border-b border-stone-100 hidden lg:block sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-12">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => { 
                setView('shop'); 
                setSelectedCategory('All');
                const el = document.getElementById('featured-products');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-widest text-white bg-brand-primary px-6 py-2.5 rounded-full hover:bg-brand-primary/90 transition-all shadow-sm"
            >
              <Menu className="w-4 h-4" /> {t('allCategories')}
            </button>
            <div className="flex items-center gap-8 text-[10px] font-bold tracking-widest uppercase text-slate-400">
              <button 
                onClick={() => { 
                  setView('shop'); 
                  setSelectedCategory('All');
                  const el = document.getElementById('featured-products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`${view === 'shop' && selectedCategory === 'All' ? 'text-brand-primary' : 'hover:text-brand-primary'} transition-all hover:scale-105 active:scale-95 relative group`}
              >
                {t('all')}
                {view === 'shop' && selectedCategory === 'All' && <motion.div layoutId="nav-underline" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-brand-primary" />}
              </button>
              <button 
                onClick={() => setView('ai-features')}
                className={`${view === 'ai-features' ? 'text-brand-primary' : 'hover:text-brand-primary'} transition-all hover:scale-105 active:scale-95 relative group`}
              >
                {t('aiFeatures')}
                {view === 'ai-features' && <motion.div layoutId="nav-underline" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-brand-primary" />}
              </button>

              <button 
                onClick={() => setView('promotions')}
                className={`${view === 'promotions' ? 'text-brand-primary' : 'hover:text-brand-primary'} transition-all hover:scale-105 active:scale-95 relative group`}
              >
                {t('promotions', 'Promotions')}
                {view === 'promotions' && <motion.div layoutId="nav-underline" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-brand-primary" />}
              </button>

              {PRODUCT_CATEGORIES.map((catId) => (
                <button 
                  key={catId}
                  onClick={() => { 
                    setView('shop'); 
                    setSelectedCategory(catId);
                    const el = document.getElementById('featured-products');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`${view === 'shop' && selectedCategory === catId ? 'text-brand-primary' : 'hover:text-brand-primary'} transition-all hover:scale-105 active:scale-95 relative group whitespace-nowrap`}
                >
                  {getCategoryTranslation(catId)}
                  {view === 'shop' && selectedCategory === catId && <motion.div layoutId="nav-underline" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-brand-primary" />}
                </button>
              ))}
              <button 
                onClick={() => setView('track-order')}
                className={`${view === 'track-order' ? 'text-brand-primary' : 'hover:text-brand-primary'} transition-colors relative group flex items-center gap-2`}
              >
                <Clock className="w-3.5 h-3.5" />
                {t('trackOrder')}
                {view === 'track-order' && <motion.div layoutId="nav-underline" className="absolute -bottom-4 left-0 right-0 h-0.5 bg-brand-primary" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSearchOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
              />
              {/* Overlay */}
              <motion.div 
                initial={{ y: '-100%' }}
                animate={{ y: 0 }}
                exit={{ y: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 left-0 right-0 bg-white z-[110] p-6 rounded-b-[2.5rem] shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('searchProducts', 'Search Products')}</h3>
                  <button 
                    onClick={() => setIsMobileSearchOpen(false)}
                    className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative mb-8">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-brand-primary" />
                  </div>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder={t('searchPlaceholder', 'What are you looking for?')} 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg focus:outline-none focus:border-brand-primary focus:bg-white transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsMobileSearchOpen(false);
                    }}
                  />
                </div>

                {searchQuery.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {filteredProducts.length} Results Found
                      </h4>
                      <button 
                        onClick={() => {
                          setIsMobileSearchOpen(false);
                          const el = document.getElementById('featured-products');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-brand-primary hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="max-h-[30vh] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {filteredProducts.slice(0, 5).map(p => (
                        <button 
                          key={p.id}
                          onClick={() => {
                            setSelectedProduct(p);
                            setIsMobileSearchOpen(false);
                          }}
                          className="w-full flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 group"
                        >
                          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col items-start overflow-hidden">
                            <span className="font-bold text-slate-900 truncate w-full text-sm group-hover:text-brand-primary transition-colors">{p.name}</span>
                            <span className="text-xs text-brand-accent font-black">{p.price.toLocaleString()} ETB</span>
                          </div>
                          <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Popular Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {PRODUCT_CATEGORIES.slice(0, 4).map(cat => (
                      <button 
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsMobileSearchOpen(false);
                          setView('shop');
                        }}
                        className="px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-xs font-bold hover:bg-brand-primary hover:text-white transition-all border border-slate-200"
                      >
                        {getCategoryTranslation(cat)}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] lg:hidden"
              />
              {/* Drawer */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[70] lg:hidden shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-6 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-black text-lg">W</div>
                    <span className="text-xl font-bold tracking-tight text-slate-900 uppercase">ABAY MART</span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-stone-500 hover:text-stone-900 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Categories */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Categories</h3>
                    <div className="grid gap-2">
                      {categories.map((catId) => (
                        <button 
                          key={catId}
                          onClick={() => { 
                            setSelectedCategory(catId); 
                            setIsMobileMenuOpen(false);
                            setView('shop');
                            const el = document.getElementById('featured-products');
                            el?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all ${selectedCategory === catId ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-stone-50 text-slate-600 hover:bg-stone-100'}`}
                        >
                          <span className="font-medium">{getCategoryTranslation(catId)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Switcher in Mobile Drawer */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Language / ቋንቋ</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => i18n.changeLanguage('en')}
                        className={`p-4 rounded-xl font-bold transition-all ${i18n.language === 'en' ? 'bg-brand-primary text-white shadow-lg' : 'bg-stone-50 text-slate-600'}`}
                      >
                        English (EN)
                      </button>
                      <button 
                        onClick={() => i18n.changeLanguage('am')}
                        className={`p-4 rounded-xl font-bold transition-all ${i18n.language === 'am' ? 'bg-brand-primary text-white shadow-lg' : 'bg-stone-50 text-slate-600'}`}
                      >
                        Amharic (አማ)
                      </button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400">Quick Actions</h3>
                    <div className="space-y-2">
                      <button 
                        onClick={() => { setView('promotions'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all group ${view === 'promotions' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-600 hover:bg-stone-100'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${view === 'promotions' ? 'bg-slate-800' : 'bg-white'}`}>
                          <Tag className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{t('promotions', 'Promotions')}</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setView('track-order'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all group ${view === 'track-order' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-600 hover:bg-stone-100'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${view === 'track-order' ? 'bg-slate-800' : 'bg-white'}`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Track Order</span>
                        </div>
                      </button>

                      <button 
                        onClick={() => { setView('user-guide'); setIsMobileMenuOpen(false); }}
                        className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all group ${view === 'user-guide' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-600 hover:bg-stone-100'}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform ${view === 'user-guide' ? 'bg-slate-800' : 'bg-white'}`}>
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">User Guide</span>
                        </div>
                      </button>

                      {(isAdmin || isMerchant) && (
                        <button 
                          onClick={() => { setView('admin'); setIsMobileMenuOpen(false); }}
                          className="flex items-center gap-4 w-full p-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all group"
                        >
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <LayoutDashboard className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">Admin Dashboard</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer / User */}
                <div className="p-6 border-t border-stone-100 bg-stone-50/50">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="font-medium text-stone-900 truncate">{user.displayName || 'User'}</span>
                          <span className="text-xs text-stone-500 truncate">{user.email}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => { setView('profile'); setIsMobileMenuOpen(false); }}
                          className="flex items-center justify-center gap-2 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                        <button 
                          onClick={() => { logOut(); setIsMobileMenuOpen(false); }}
                          className="flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { handleSignIn(); setIsMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-3 w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                    >
                      <User className="w-5 h-5" />
                      Login
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      {view === 'ai-features' ? (
        <AIFeatures />
      ) : view === 'shop' ? (
        <>
          {user && !user.emailVerified && (
            <div className="bg-amber-50 border-b border-amber-100 py-3 px-4">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-amber-800">
                  <Mail className="w-4 h-4" />
                  <p className="text-xs font-medium">
                    Please verify your email address to secure your account.
                  </p>
                </div>
                <button 
                  onClick={handleSendVerification}
                  className="text-[10px] font-bold uppercase tracking-widest text-amber-900 hover:underline"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <div className="bg-slate-50 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
              
              {/* Mobile Horizontal Categories */}
              <div className="lg:hidden -mx-4 px-4 pb-4 overflow-x-auto flex gap-2 no-scrollbar">
                {categories.map((catId) => (
                  <button
                    key={catId}
                    onClick={() => {
                      setSelectedCategory(catId);
                      const el = document.getElementById('featured-products');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${selectedCategory === catId ? 'bg-brand-primary text-white shadow-brand-primary/20' : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'}`}
                  >
                    {getCategoryTranslation(catId)}
                  </button>
                ))}
              </div>

              {/* Sidebar Categories (Desktop) */}
              <div className="w-64 hidden lg:block flex-shrink-0">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-400">{t('shopByCategory')}</h3>
                  </div>
                  <div className="p-2">
                    {PRODUCT_CATEGORIES.map((catId) => (
                      <button 
                        key={catId}
                        onClick={() => {
                          setSelectedCategory(catId);
                          const el = document.getElementById('featured-products');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${selectedCategory === catId ? 'bg-brand-primary text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-primary'}`}
                      >
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(catId)}
                          {getCategoryTranslation(catId)}
                        </div>
                        <ChevronRight className={`w-3 h-3 ${selectedCategory === catId ? 'text-white' : 'text-slate-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Hero Content */}
              <div className="flex-1 space-y-6">
                <PromotionalBanners setView={setView} />

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t('verifiedSellers'), value: stats.verifiedSellers.toLocaleString(), icon: <ShieldCheck className="w-5 h-5 text-emerald-500" /> },
                    { label: t('happyCustomers'), value: stats.happyCustomers.toLocaleString(), icon: <BarIcon className="w-5 h-5 text-brand-accent" /> },
                    { label: t('nationwideDelivery'), value: t('allRegions', 'All Regions'), icon: <Globe className="w-5 h-5 text-blue-500" /> },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center">
                        {stat.icon}
                      </div>
                      <div>
                        <div className="text-xl font-black text-slate-900">{stat.value}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Products Section - Moved here to be "below category" */}
                <div id="featured-products" className="pt-12">
                  <div className="flex items-end justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {searchQuery ? (
                          <span className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-brand-primary" />
                            {t('searchResultsFor', 'Results for')} "{searchQuery}"
                          </span>
                        ) : (
                          selectedCategory === 'All' ? t('recommendedForYou') : getCategoryTranslation(selectedCategory)
                        )}
                      </h2>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                        {searchQuery 
                          ? t('foundMatchCount', { count: filteredProducts.length, query: searchQuery }) 
                          : (selectedCategory === 'All' ? t('basedOnPreferences') : t('topProductsInCategory', { category: getCategoryTranslation(selectedCategory) }))}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-[10px] font-black tracking-[0.2em] uppercase text-slate-300">
                        {filteredProducts.length} Products
                      </div>
                      <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all">
                        <option>Best Match</option>
                        <option>Price: Low to High</option>
                        <option>Price: High to Low</option>
                        <option>Newest First</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product, idx) => (
                        <ProductCard 
                          key={product.id}
                          product={product}
                          idx={idx}
                          wishlist={wishlist}
                          toggleWishlist={toggleWishlist}
                          setSelectedProduct={setSelectedProduct}
                          setCurrentImageIndex={setCurrentImageIndex}
                          addToCart={addToCart}
                        />
                      ))
                    ) : (
                      <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm">
                          <Search className="w-10 h-10" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900">{t('noResultsTitle', 'No products found')}</h3>
                          <p className="text-slate-500 max-w-xs mx-auto text-sm mt-2">
                            {t('noResultsDesc', "We couldn't find anything matching your search. Try adjusting your keywords or category filters.")}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('All');
                          }}
                          className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-[#0c132e] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
                        >
                          Clear all Filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Sidebar - User Actions */}
              <div className="w-72 hidden xl:block flex-shrink-0 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Welcome to Work Abay</div>
                      <div className="text-[10px] text-slate-500">Sign in to start shopping</div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <button onClick={() => handleSignIn('signup')} className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-xs hover:bg-brand-primary/90 transition-all">{t('signup')}</button>
                    <button onClick={() => handleSignIn('login')} className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all">{t('login')}</button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <h4 className="font-black text-sm text-slate-900 mb-2 text-center">{t('trackYourOrder')}</h4>
                  <p className="text-[10px] text-slate-500 mb-4 text-center">{t('trackOrderRealTime')}</p>
                  <button 
                    onClick={() => setView('track-order')}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {t('trackOrder')}
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <h4 className="font-black text-sm text-slate-900 mb-2">{t('verifiedSellers')}</h4>
                  <p className="text-[10px] text-slate-500 mb-4">{t('shopFromTrustedSellers')}</p>
                  <button className="w-full py-3 bg-slate-50 text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all">{t('exploreStores')}</button>
                </div>
              </div>
            </div>
          </div>

    </>
  ) : view === 'merchant-dashboard' ? (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-[60vh]">
      {!user ? (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{t('loginRequired')}</h1>
          <p className="text-stone-500 mb-8">{t('loginRequiredDesc')}</p>
          <button 
            onClick={handleSignIn}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            {t('signInWithGoogle')}
          </button>
        </div>
      ) : (isMerchant && userProfile?.merchantInfo) ? (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{t('alreadyMerchant')}</h1>
          <p className="text-stone-500 mb-8">{t('alreadyMerchantDesc')}</p>
          <button 
            onClick={() => { setView('admin'); setAdminTab('overview'); }}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            {t('goToDashboard')}
          </button>
        </div>
      ) : (userProfile?.merchantInfo?.status === 'pending') ? (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">{t('applicationPending')}</h1>
          <p className="text-stone-500 mb-8">{t('applicationPendingDesc')}</p>
          <button 
            onClick={() => setView('shop')}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            {t('backToShop')}
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-display font-medium mb-4">{t('applyMerchantTitle')}</h1>
          <p className="text-stone-500">{t('applyMerchantDesc')}</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm">
          <form onSubmit={handleBecomeMerchant} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Store Name</label>
                <input 
                  type="text" 
                  required
                  value={merchantForm.storeName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, storeName: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. Addis Luxury Bedding"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Store Phone</label>
                <input 
                  type="tel" 
                  required
                  value={merchantForm.phoneNumber}
                  onChange={(e) => setMerchantForm({ ...merchantForm, phoneNumber: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="09..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">TIN Number</label>
                <input 
                  type="text" 
                  required
                  value={merchantForm.tinNumber}
                  onChange={(e) => setMerchantForm({ ...merchantForm, tinNumber: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="Enter your 10-digit TIN"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Business Address</label>
                <input 
                  type="text" 
                  required
                  value={merchantForm.address}
                  onChange={(e) => setMerchantForm({ ...merchantForm, address: e.target.value })}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g. Bole, Addis Ababa"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Store Description</label>
              <textarea 
                required
                value={merchantForm.storeDescription}
                onChange={(e) => setMerchantForm({ ...merchantForm, storeDescription: e.target.value })}
                rows={4}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                placeholder="Tell us about your products and business..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Registration Document</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".pdf,image/*"
                    onChange={(e) => setRegistrationFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="registration-upload"
                  />
                  <label 
                    htmlFor="registration-upload"
                    className="flex items-center gap-3 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 truncate">
                      {registrationFile ? registrationFile.name : 'Upload Registration (PDF/IMG)'}
                    </span>
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 block">Business Picture</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setBusinessPictureFile(e.target.files?.[0] || null)}
                    className="hidden" 
                    id="business-pic-upload"
                  />
                  <label 
                    htmlFor="business-pic-upload"
                    className="flex items-center gap-3 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm cursor-pointer hover:bg-slate-100 transition-all"
                  >
                    <Upload className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 truncate">
                      {businessPictureFile ? businessPictureFile.name : 'Upload Store/Office Photo'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900 mb-1">Merchant Agreement</h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    By clicking "Apply Now", you agree to our merchant terms. ABAY collects a 0.5% commission on every successful sale. You are responsible for product quality and fulfillment.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setView('profile')}
                className="flex-1 py-5 bg-stone-50 text-stone-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-stone-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isMerchantApplying}
                className="flex-[2] py-5 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isMerchantApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isCompressing ? 'Optimizing...' : 'Applying...'}
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Apply Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div>
) : view === 'wishlist' ? (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-[60vh]">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">{t('myWishlist')}</h1>
          <p className="text-slate-500">{t('savedForLater')}</p>
        </div>
        <button 
          onClick={() => setView('shop')}
          className="text-xs font-bold tracking-widest uppercase text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Back to Shop
        </button>
      </div>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Heart className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg">Your wishlist is empty</p>
          <button 
            onClick={() => setView('shop')}
            className="mt-8 px-8 py-4 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-full"
          >
            Discover Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.filter(p => wishlist.includes(p.id)).map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedProduct(product);
                setCurrentImageIndex(0);
              }}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 mb-4">
                <img src={product.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/80 backdrop-blur-md text-red-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
              <h3 className="text-sm font-medium mb-1">{product.name}</h3>
              <p className="text-emerald-600 font-bold">{product.price.toLocaleString()} ETB</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  ) : view === 'profile' ? (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-[60vh]">
      {!user ? (
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Login Required</h1>
          <p className="text-stone-500 mb-8">Please sign in to your account to view your profile and orders.</p>
          <button 
            onClick={handleSignIn}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            Sign In with Google
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-display font-medium mb-2">My Account</h1>
          <p className="text-stone-500">Manage your profile and view your orders.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => logOut()}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
          <button 
            onClick={() => setView('shop')}
            className="text-xs font-bold tracking-widest uppercase text-stone-400 hover:text-stone-900 transition-colors flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Shop
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar / Profile Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-stone-50 p-8 rounded-[2.5rem] border border-stone-100 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="relative">
                  <img 
                    src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || user?.email}&background=random`} 
                    alt="" 
                    className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                  />
                  {user?.emailVerified ? (
                    <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Verified">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white shadow-sm" title="Unverified">
                      <AlertCircle className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{userProfile?.displayName || user?.displayName || 'User'}</h2>
                  <p className="text-xs text-stone-500">{user?.email}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-stone-200 text-stone-600 text-[8px] font-bold tracking-widest uppercase rounded-full">
                    {userRole}
                  </span>
                </div>
              </div>

              {!isEditingProfile ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t('phoneNumber')}</p>
                      <p className="text-sm font-medium">{userProfile?.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t('shippingAddress')}</p>
                      {userProfile?.address ? (
                        <div className="text-sm space-y-0.5">
                          <p className="font-medium">{typeof userProfile.address === 'string' ? userProfile.address : `${userProfile.address.city || ''}, ${userProfile.address.area || ''}`}</p>
                          <p className="text-slate-500 text-xs">{typeof userProfile.address === 'string' ? '' : `${userProfile.address.street || ''}, House #${userProfile.address.houseNumber || ''}`}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">{t('noAddressSaved')}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t('editProfile')}
                  </button>

                  {userRole !== 'customer' && (
                    <button 
                      onClick={() => setView('admin')}
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t('adminDashboard')}
                    </button>
                  )}

                  {userRole === 'customer' && (
                    <div className="pt-6 border-t border-slate-100">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 mb-2">{t('sellOnAbay')}</h3>
                        <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                          {t('sellOnAbayDesc')}
                        </p>
                        <button 
                          onClick={() => setView('merchant-dashboard')}
                          className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {t('becomeMerchant')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 mb-1 block">{t('fullName')}</label>
                      <input 
                        type="text" 
                        value={profileForm.displayName}
                        onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        placeholder={t('yourName')}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2 mb-1 block">{t('phoneNumber')}</label>
                      <input 
                        type="tel" 
                        value={profileForm.phoneNumber}
                        onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        placeholder="09..."
                      />
                    </div>
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Shipping Address</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input 
                          type="text" 
                          placeholder="City"
                          value={profileForm.address.city}
                          onChange={(e) => setProfileForm({ ...profileForm, address: { ...profileForm.address, city: e.target.value } })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                        <input 
                          type="text" 
                          placeholder="Area"
                          value={profileForm.address.area}
                          onChange={(e) => setProfileForm({ ...profileForm, address: { ...profileForm.address, area: e.target.value } })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          placeholder="Street"
                          ref={profileAddressInputRef}
                          value={profileForm.address.street}
                          onChange={(e) => setProfileForm({ ...profileForm, address: { ...profileForm.address, street: e.target.value } })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                        <input 
                          type="text" 
                          placeholder="House #"
                          value={profileForm.address.houseNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, address: { ...profileForm.address, houseNumber: e.target.value } })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> {t('save')}</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          </div>

          {!user?.emailVerified && (
            <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 mb-1">Verify Email</h3>
                  <p className="text-xs text-amber-800/70 mb-4 leading-relaxed">
                    Please verify your email to unlock all features and secure your account.
                  </p>
                  <button 
                    onClick={handleSendVerification}
                    className="text-[10px] font-bold uppercase tracking-widest text-amber-900 hover:underline flex items-center gap-2"
                  >
                    Resend Email
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content / Order History */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-display font-medium">Order History</h2>
            <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 bg-stone-100 px-3 py-1 rounded-full">
              {userOrders.length} Orders
            </span>
          </div>

          {isUserOrdersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 bg-stone-50 rounded-[2.5rem] border border-stone-100 border-dashed">
              <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-20" />
              <p className="text-sm font-medium">Loading your orders...</p>
            </div>
          ) : userOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 bg-stone-50 rounded-[2.5rem] border border-stone-100 border-dashed">
              <ShoppingBag className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">No orders yet</p>
              <button 
                onClick={() => setView('shop')}
                className="mt-8 px-8 py-4 bg-white border border-stone-200 text-stone-900 text-[10px] font-bold tracking-widest uppercase rounded-full hover:bg-stone-50 transition-all shadow-sm"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 bg-stone-50 rounded-2xl flex items-center justify-center shrink-0 border border-stone-100 overflow-hidden">
                        {order.items[0]?.image ? (
                          <img src={order.items[0].image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Package className="w-8 h-8 text-stone-200" />
                        )}
                      </div>
                      <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900">Order #{order.id.slice(-6).toUpperCase()}</span>
                          <span className={`px-2 py-0.5 text-[7px] font-bold tracking-widest uppercase rounded-full ${
                            order.status === 'delivered' || order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            order.status === 'declined' ? 'bg-red-50 text-red-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Recent'} • {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </p>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-slate-900">{order.totalAmount.toLocaleString()} ETB</span>
                          <button 
                            onClick={() => {
                              setTrackingId(order.id);
                              setView('track-order');
                              handleTrackOrder({ preventDefault: () => {} } as any, order.id);
                            }}
                            className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-1"
                          >
                            Track
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center md:items-end flex-col justify-center gap-2">
                      {order.status === 'delivered' && (
                        <button 
                          onClick={() => handleConfirmDelivery(order.id)}
                          disabled={isConfirmingDelivery}
                          className="w-full md:w-auto px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                        >
                          {isConfirmingDelivery ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Confirm Delivery
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedProduct(products.find(p => p.id === order.items[0]?.id) || null);
                          if (order.items[0]?.id) setView('shop');
                        }}
                        className="w-full md:w-auto px-6 py-3 bg-stone-50 text-stone-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-100 transition-all"
                      >
                        Buy Again
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
    )}
  </div>
) : view === 'privacy-policy' ? (
    <div className="pt-32 pb-20 bg-slate-50 min-h-screen transition-colors duration-700">
      <div className="max-w-3xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </button>
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-stone-100">
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          <div className="prose prose-stone max-w-none text-slate-600 space-y-6">
            <p className="text-sm leading-relaxed">
              At WORK_ABAY MART ETHIOPIA, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our application.
            </p>
            
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>Personal Identification Information: Name, email address, phone number, and physical address.</li>
                <li>Payment Information: Transaction details (we do not store your full credit card or bank details directly; these are handled by secure payment processors).</li>
                <li>Order History: Details of products you have purchased and your shopping preferences.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-sm leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm mt-2">
                <li>Process and fulfill your orders.</li>
                <li>Provide customer support and respond to your inquiries.</li>
                <li>Send you order confirmations and shipping updates.</li>
                <li>Improve our services and user experience.</li>
                <li>Send promotional offers and newsletters (only if you have opted in).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Data Sharing and Disclosure</h2>
              <p className="text-sm leading-relaxed">
                We may share your information with:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm mt-2">
                <li>Delivery partners to ensure your orders reach you.</li>
                <li>Payment gateways (Telebirr, CBE) to process transactions.</li>
                <li>Legal authorities if required by law or to protect our rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Data Security</h2>
              <p className="text-sm leading-relaxed">
                We implement a variety of security measures to maintain the safety of your personal information. We use Firebase, a secure platform provided by Google, for data storage and authentication.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Your Rights</h2>
              <p className="text-sm leading-relaxed">
                You have the right to access, correct, or delete your personal information. You can manage your profile details within the app or contact our support team for assistance.
              </p>
            </section>

            <p className="text-xs text-slate-400 pt-8 border-t border-stone-100">
              Last updated: April 12, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  ) : view === 'terms-of-service' ? (
    <div className="pt-32 pb-20 bg-zinc-50 min-h-screen transition-colors duration-700">
      <div className="max-w-3xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </button>
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-stone-100">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          <div className="prose prose-stone max-w-none text-slate-600 space-y-6">
            <p className="text-sm leading-relaxed">
              Welcome to WORK_ABAY MART ETHIOPIA. By accessing or using our application, you agree to be bound by these Terms of Service.
            </p>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">1. Use of the Service</h2>
              <p className="text-sm leading-relaxed">
                You must be at least 18 years old or have the consent of a parent or guardian to use this service. You are responsible for maintaining the confidentiality of your account and password.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">2. Product Information and Pricing</h2>
              <p className="text-sm leading-relaxed">
                We strive to provide accurate product descriptions and pricing. However, we do not warrant that product descriptions or other content are accurate, complete, or error-free. We reserve the right to correct any errors and to change or update information at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">3. Orders and Payments</h2>
              <p className="text-sm leading-relaxed">
                All orders are subject to acceptance and availability. We accept payments via Telebirr and Commercial Bank of Ethiopia (CBE). By placing an order, you represent that you are authorized to use the chosen payment method.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">4. Shipping and Delivery</h2>
              <p className="text-sm leading-relaxed">
                Delivery times are estimates and not guaranteed. We are not responsible for delays caused by shipping carriers or other factors beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">5. Returns and Refunds</h2>
              <p className="text-sm leading-relaxed">
                Please refer to our return policy for information on returns and refunds. Items must be returned in their original condition and packaging.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">6. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed">
                WORK_ABAY MART ETHIOPIA shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with the use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-4">7. Governing Law</h2>
              <p className="text-sm leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of Ethiopia.
              </p>
            </section>

            <p className="text-xs text-slate-400 pt-8 border-t border-stone-100">
              Last updated: April 12, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  ) : view === 'help-center' ? (
    <div className="pt-32 pb-20 bg-cyan-50/30 min-h-screen transition-colors duration-700">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> {t('backToShop')}
        </button>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">{t('helpCenterTitle')}</h1>
          <p className="text-slate-500">{t('helpCenterDesc')}</p>
        </div>
        <div className="grid gap-6">
          {[
            { q: t('faq1Q'), a: t('faq1A') },
            { q: t('faq2Q'), a: t('faq2A') },
            { q: t('faq3Q'), a: t('faq3A') },
            { q: t('faq4Q'), a: t('faq4A') },
            { q: t('faq5Q'), a: t('faq5A') }
          ].map((faq, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-3">{faq.q}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : view === 'contact-us' ? (
    <div className="pt-32 pb-20 bg-emerald-50/20 min-h-screen transition-colors duration-700">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> {t('backToShop')}
        </button>
        <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-stone-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-12 bg-slate-900 text-white">
              <h1 className="text-3xl font-bold mb-6">{t('contactUsTitle')}</h1>
              <p className="text-slate-400 mb-12">{t('contactUsDesc')}</p>
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{t('email')}</p>
                    <p className="font-medium">support@workabay.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{t('phone')}</p>
                    <p className="font-medium">+251 911 223 344</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{t('address')}</p>
                    <p className="font-medium">Bole, Addis Ababa, Ethiopia</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-12 bg-white">
              <h2 className="text-2xl font-bold mb-8">{t('sendMessage')}</h2>
              <form className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">{t('fullName')}</label>
                  <input type="text" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">{t('emailAddress')}</label>
                  <input type="email" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-2">{t('message')}</label>
                  <textarea rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" placeholder={t('howCanWeHelp')} />
                </div>
                <button className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-emerald-100">{t('sendMessage')}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : view === 'promotions' ? (
    <div className="bg-amber-50/20 min-h-screen transition-colors duration-700">
      <PromotionsView setView={setView} />
    </div>
  ) : view === 'user-guide' ? (
    <div className="pt-32 pb-20 bg-blue-50/40 min-h-screen transition-colors duration-700">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> {t('backToShop')}
        </button>
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-stone-100">
          <h1 className="text-4xl font-display font-medium mb-12 text-center text-slate-900">{t('userGuideTitle')}</h1>
          
          <div className="space-y-12">
            {/* Video Tutorial Section */}
            <section className="bg-stone-900 rounded-[2rem] p-4 sm:p-8 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-brand-primary/40 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
                <div className="flex-1 text-white">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6">
                    <Video className="w-3 h-3 text-emerald-400" />
                    Video Tutorial
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black mb-4 leading-tight">Learn how to shop at ABAY Mart in 2 minutes</h2>
                  <p className="text-white/70 text-sm mb-8 leading-relaxed max-w-lg">
                    Discover the easiest way to find authentic Ethiopian products, manage your cart, and enjoy secure door-to-door delivery.
                  </p>
                  <button 
                    onClick={() => {
                      const videoEl = document.getElementById('user-guide-video');
                      videoEl?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Watch Now
                  </button>
                </div>
                <div id="user-guide-video" className="w-full lg:w-[450px] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/10 group-hover:ring-white/20 transition-all">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/S_8qM9v-2-k"
                    title="How to buy on ABAY Mart"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </section>

            {/* Language Change */}
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white text-brand-primary rounded-2xl flex items-center justify-center shadow-sm">
                  <Languages className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('changeLanguageTitle')}</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">{t('changeLanguageDesc')}</p>
              <div className="space-y-3">
                {(t('changeLanguageSteps', { returnObjects: true }) as string[]).map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Adding Products */}
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('addToCartTitle')}</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">{t('addToCartDesc')}</p>
              <div className="space-y-3">
                {(t('addToCartSteps', { returnObjects: true }) as string[]).map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Searching */}
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Search className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('searchProductsTitle')}</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">{t('searchProductsDesc')}</p>
              <div className="space-y-3">
                {(t('searchProductsSteps', { returnObjects: true }) as string[]).map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tracking Orders */}
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white text-purple-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <Truck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('trackOrderTitle')}</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">{t('trackOrderDesc')}</p>
              <div className="space-y-3">
                {(t('trackOrderSteps', { returnObjects: true }) as string[]).map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Becoming a Merchant */}
            <section className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-white text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{t('becomeMerchantTitle')}</h2>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">{t('becomeMerchantDesc')}</p>
              <div className="space-y-3">
                {(t('becomeMerchantSteps', { returnObjects: true }) as string[]).map((step: string, i: number) => (
                  <div key={i} className="flex gap-4">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                    <p className="text-sm text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  ) : view === 'seller-guide' ? (
    <div className="pt-32 pb-20 bg-teal-50/30 min-h-screen transition-colors duration-700">
      <div className="max-w-4xl mx-auto px-4">
        <button 
          onClick={() => setView('shop')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 mb-8 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shop
        </button>
        <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-stone-100">
          <h1 className="text-4xl font-bold mb-8">Seller Guide</h1>
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">1</span>
                Create Your Store
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Apply through the Merchant Center. You'll need a store name, description, and business address. Once approved, you can start listing products immediately.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">2</span>
                List Your Products
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Upload high-quality images, set competitive prices, and write detailed descriptions. Accurate categorization helps buyers find your items faster.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">3</span>
                Manage Orders
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Receive real-time notifications for new orders. Prepare items for shipping and update order status to keep buyers informed.
              </p>
            </section>
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">4</span>
                Get Paid
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Payments are processed securely. Funds are released to your registered account after successful delivery confirmation. A small commission of 0.5% applies to each sale.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  ) : view === 'track-order' ? (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-[60vh]">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Track Order</h1>
          <p className="text-slate-400 text-sm mt-1">Check your delivery status</p>
        </div>
        <button 
          onClick={() => setView('shop')}
          className="text-[10px] font-bold tracking-widest uppercase text-slate-300 hover:text-slate-900 transition-colors flex items-center gap-2"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          Back to Shop
        </button>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-50 p-8 md:p-10 rounded-2xl border border-slate-100">
          {!isFindingOrder ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Enter Order ID</h2>
                <p className="text-xs text-slate-400 mb-6">Enter your order ID to see progress.</p>
                <form onSubmit={handleTrackOrder} className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="Order ID"
                    className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-300 outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={isTrackingLoading || !trackingId.trim()}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-slate-800 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isTrackingLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Track'}
                  </button>
                </form>
              </div>

              <button 
                onClick={() => setIsFindingOrder(true)}
                className="flex items-center gap-2 text-xs text-slate-400 font-bold tracking-widest uppercase hover:text-slate-900 transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                Forgot Order ID?
              </button>

              {trackingError && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100 flex items-start gap-4"
                >
                  <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">Tracking Error</p>
                    <p className="text-sm opacity-90">{trackingError}</p>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <button 
                  onClick={() => setIsFindingOrder(false)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Tracking
                </button>
                <h2 className="text-xl font-bold mb-2">Find Your Order</h2>
                <p className="text-sm text-slate-500 mb-6">Enter the email or phone number used during checkout.</p>
                <form onSubmit={handleFindOrders} className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    placeholder="Email or Phone Number"
                    className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-slate-900/5 outline-none shadow-sm"
                  />
                  <button 
                    type="submit"
                    disabled={isFindingLoading || !findQuery.trim()}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-200 active:scale-95"
                  >
                    {isFindingLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Finding...</span>
                      </div>
                    ) : 'Find Orders'}
                  </button>
                </form>
              </div>

              {findError && (
                <div className="p-6 bg-red-50 text-red-600 rounded-3xl border border-red-100">
                  <p className="text-sm">{findError}</p>
                </div>
              )}

              {foundOrders.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Orders Found</h3>
                  <div className="grid gap-3">
                    {foundOrders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => {
                          setTrackingId(order.id);
                          setIsFindingOrder(false);
                          handleTrackOrder(new Event('submit') as any, order.id);
                        }}
                        className="w-full p-6 bg-white border border-slate-100 rounded-3xl text-left hover:border-slate-900 hover:shadow-md transition-all group flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-sm font-bold text-slate-900">ID: {order.id}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-wider">
                              {order.status === 'placed' ? 'Placed' : 
                               order.status === 'verified' ? 'Verified' : 
                               order.status === 'processing' ? 'Processing' : 
                               order.status === 'shipped' ? 'Shipped' : 
                               order.status === 'out_for_delivery' ? 'Out for Delivery' : 
                               order.status === 'delivered' ? 'Delivered' : order.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{order.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{order.totalAmount?.toLocaleString()} ETB</p>
                          <p className="text-[10px] text-slate-900 font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1 justify-end">
                            Track <ChevronRight className="w-3 h-3" />
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {trackedOrder && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 space-y-8 pt-12 border-t border-stone-200"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-2">Order Status</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${
                      trackedOrder.status === 'completed' ? 'bg-emerald-500' :
                      trackedOrder.status === 'declined' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <span className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${
                      trackedOrder.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      trackedOrder.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      trackedOrder.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                      trackedOrder.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                      trackedOrder.status === 'out_for_delivery' ? 'bg-amber-100 text-amber-700' :
                      trackedOrder.status === 'delivered' ? 'bg-indigo-100 text-indigo-700' :
                      trackedOrder.status === 'declined' ? 'bg-red-100 text-red-700' :
                      'bg-stone-200 text-stone-600'
                    }`}>
                      {trackedOrder.status === 'placed' ? 'Placed' : 
                       trackedOrder.status === 'verified' ? 'Verified' : 
                       trackedOrder.status === 'processing' ? 'Processing' : 
                       trackedOrder.status === 'shipped' ? 'Shipped' : 
                       trackedOrder.status === 'out_for_delivery' ? 'Out for Delivery' : 
                       trackedOrder.status === 'delivered' ? 'Delivered' : 
                       trackedOrder.status === 'completed' ? 'Completed' : 
                       trackedOrder.status === 'declined' ? 'Declined' : trackedOrder.status}
                    </span>
                    <button 
                      onClick={() => handleShareTracking(trackedOrder)}
                      className="p-2 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-all"
                      title="Share Tracking"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-2">Total Amount</p>
                  <p className="text-3xl font-display font-medium text-emerald-600">{trackedOrder.totalAmount?.toLocaleString()} ETB</p>
                </div>
              </div>

              {/* Visual Status Tracker */}
              <div className="py-6 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                <div className="flex justify-between relative min-w-[500px] py-2">
                  <div className="absolute top-[1.75rem] left-0 w-full h-0.5 bg-slate-100 -z-0 rounded-full" />
                  <div 
                    className="absolute top-[1.75rem] left-0 h-0.5 bg-slate-900 -z-0 transition-all duration-1000 rounded-full" 
                    style={{ 
                      width: `${(() => {
                        const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                        const status = trackedOrder.status === 'completed' ? 'delivered' : trackedOrder.status;
                        const index = steps.indexOf(status);
                        return index === -1 ? 0 : (index / 5) * 100;
                      })()}%` 
                    }}
                  />
                  
                  {[
                    { id: 'pending', label: 'Placed', icon: Package },
                    { id: 'verified', label: 'Verified', icon: CheckCircle2 },
                    { id: 'processing', label: 'Processing', icon: Clock },
                    { id: 'shipped', label: 'Shipped', icon: Truck },
                    { id: 'out_for_delivery', label: 'Out', icon: MapPin },
                    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
                  ].map((step, idx) => {
                    const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                    const currentStatus = trackedOrder.status === 'completed' ? 'delivered' : trackedOrder.status;
                    const currentIdx = steps.indexOf(currentStatus);
                    const isActive = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const Icon = step.icon;
                    
                    return (
                      <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                          isActive ? 'bg-slate-900 border-white text-white shadow-sm' : 'bg-white border-slate-100 text-slate-200'
                        } ${isCurrent ? 'ring-2 ring-slate-100 scale-110' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-center">
                          <p className={`text-[8px] font-bold uppercase tracking-widest ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Map */}
              {trackedOrder.status === 'out_for_delivery' && (
                <div className="space-y-4">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Live Delivery Tracking</h3>
                  <DeliveryMap order={trackedOrder} />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Delivery Details</h3>
                  <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Customer</span>
                      <span className="font-bold text-slate-900">{trackedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Phone</span>
                      <span className="font-bold text-slate-900">{trackedOrder.customerPhone}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Location</span>
                      <span className="font-bold text-slate-900">{trackedOrder.customerCity || 'Addis Ababa'}, {trackedOrder.customerArea}</span>
                    </div>
                  </div>

                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-6">Payment Details</h3>
                  <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-400">Method</span>
                      <span className="font-bold text-slate-900 capitalize">{trackedOrder.paymentMethod?.replace('_', ' ')}</span>
                    </div>
                    {trackedOrder.transactionRef && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Reference</span>
                        <span className="font-bold text-slate-900">{trackedOrder.transactionRef}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-300">Order Items</h3>
                  <div className="space-y-2 bg-white p-6 rounded-2xl border border-slate-100">
                    {trackedOrder.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] py-1.5 border-b border-slate-50 last:border-0">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{item.name}</span>
                          <span className="text-[9px] text-slate-400">Qty: {item.quantity}</span>
                        </div>
                        <span className="font-medium text-slate-900">{(item.price * item.quantity).toLocaleString()} ETB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {trackedOrder.status === 'delivered' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-emerald-900 mb-2">Order Delivered!</h3>
                  <p className="text-emerald-700 text-sm mb-6">Your order has been delivered. Please confirm receipt to complete the order.</p>
                  <button 
                    onClick={() => handleConfirmDelivery(trackedOrder.id)}
                    disabled={isConfirmingDelivery}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
                  >
                    {isConfirmingDelivery ? 'Confirming...' : 'Confirm Receipt'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-indigo-50/20 pt-32 pb-20 min-h-screen transition-colors duration-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Account</h1>
        </div>
        <button 
          onClick={() => logOut()}
          className="text-[10px] font-bold tracking-widest uppercase text-red-500 hover:text-red-600 transition-colors flex items-center gap-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 text-xl font-bold">
                {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{user?.displayName || 'Customer'}</h3>
                <p className="text-[11px] text-slate-400">{user?.email}</p>
                {user && !user.emailVerified && (
                  <div className="mt-1.5 flex items-center gap-2 text-[9px] text-amber-600 font-bold uppercase tracking-wider">
                    <XCircle className="w-3 h-3" />
                    Unverified
                    <button 
                      onClick={handleSendVerification}
                      className="ml-1 underline hover:text-amber-700"
                    >
                      Verify
                    </button>
                  </div>
                )}
                {user && user.emailVerified && (
                  <div className="mt-1.5 flex items-center gap-2 text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Member Since</span>
                <span className="font-medium text-slate-900">{new Date(user?.metadata.creationTime || '').toLocaleDateString()}</span>
              </div>
              
              <div className="pt-4 space-y-4">
                <h4 className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Delivery Info</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-300 uppercase">Phone</label>
                    <input 
                      type="tel" 
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-300 uppercase">City</label>
                      <select 
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-300"
                      >
                        <option value="Addis Ababa">Addis Ababa</option>
                        <option value="Adama">Adama</option>
                        <option value="Bishoftu">Bishoftu</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-300 uppercase">Area</label>
                      <input 
                        type="text" 
                        value={customerArea}
                        onChange={(e) => setCustomerArea(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase">House No.</label>
                    <input 
                      type="text" 
                      value={customerHouseNo}
                      onChange={(e) => setCustomerHouseNo(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase">Detailed Address</label>
                    <textarea 
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await updateDoc(doc(db, 'users', user.uid), {
                          phone: customerPhone,
                          city: customerCity,
                          area: customerArea,
                          houseNo: customerHouseNo,
                          address: customerAddress
                        });
                        setOrderError('Profile updated successfully!');
                        setTimeout(() => setOrderError(null), 3000);
                      } catch (error) {
                        console.error("Update profile error:", error);
                      }
                    }}
                    className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-stone-800 transition-colors"
                  >
                    Save Delivery Info
                  </button>
                </div>
              </div>
            </div>
          </div>

            {/* Merchant Section */}
            {!isMerchant && !isAdmin && (
              <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-900">Sell on ABAY</h4>
                    <p className="text-xs text-emerald-700 opacity-80">Start your business today</p>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 mb-6 leading-relaxed">
                  Join hundreds of merchants selling their products on Ethiopia's premium marketplace.
                </p>
                <button 
                  onClick={() => setView('merchant-dashboard')}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  Become a Merchant
                </button>
              </div>
            )}

            {isMerchant && (
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-slate-800 text-emerald-400 rounded-2xl flex items-center justify-center">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">Merchant Panel</h4>
                    <p className="text-xs text-slate-400">Manage your store</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setView('admin');
                    setAdminTab('overview');
                  }}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            )}

            {/* Recently Viewed Section */}
          {recentlyViewed.length > 0 && (
            <div className="bg-stone-50 p-8 rounded-3xl border border-stone-100">
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-6">Recently Viewed</h4>
              <div className="space-y-4">
                {recentlyViewed.map(id => {
                  const product = products.find(p => p.id === id);
                  if (!product) return null;
                  return (
                    <div 
                      key={id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setCurrentImageIndex(0);
                      }}
                      className="flex items-center gap-4 group cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-stone-200 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-medium text-stone-900 truncate group-hover:underline">{product.name}</h5>
                        <p className="text-[10px] text-emerald-600 font-bold">{product.price.toLocaleString()} ETB</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-2xl font-display font-medium mb-8">Order History</h2>
          <div className="space-y-6">
            {isUserOrdersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : userOrders.length > 0 ? (
              userOrders.map((order) => (
                <div key={order.id} className="bg-stone-50 rounded-3xl border border-stone-100 overflow-hidden">
                  <div className="p-6 border-b border-stone-200 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1">Order ID</p>
                      <p className="font-mono text-sm font-bold">{order.id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderDetailsModalOpen(true);
                          }}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          View Details
                        </button>
                        {order.status !== 'pending' && order.status !== 'declined' && (
                          <button 
                            onClick={() => {
                              setTrackingId(order.id);
                              setView('track-order');
                            }}
                            className="text-xs font-bold text-stone-600 hover:underline flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" /> Track Order
                          </button>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1">Status</p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'out_for_delivery' ? 'bg-amber-100 text-amber-700' :
                          order.status === 'delivered' ? 'bg-indigo-100 text-indigo-700' :
                          order.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-stone-200 text-stone-600'
                        }`}>
                          {order.status === 'placed' ? 'Placed' : 
                           order.status === 'verified' ? 'Verified' : 
                           order.status === 'processing' ? 'Processing' : 
                           order.status === 'shipped' ? 'Shipped' : 
                           order.status === 'out_for_delivery' ? 'Out for Delivery' : 
                           order.status === 'delivered' ? 'Delivered' : 
                           order.status === 'completed' ? 'Completed' : 
                           order.status === 'declined' ? 'Declined' : order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Visual Status Tracker */}
                    <div className="mb-6 px-2 overflow-x-auto pb-4 scrollbar-hide">
                      <div className="flex justify-between relative min-w-[400px]">
                        <div className="absolute top-4 left-0 w-full h-0.5 bg-stone-200 -z-0" />
                        <div 
                          className="absolute top-4 left-0 h-0.5 bg-emerald-500 -z-0 transition-all duration-500" 
                          style={{ 
                            width: `${(() => {
                              const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                              const status = order.status === 'completed' ? 'delivered' : order.status;
                              const index = steps.indexOf(status);
                              return index === -1 ? 0 : (index / 5) * 100;
                            })()}%` 
                          }}
                        />
                        
                        {[
                          { id: 'pending', icon: Package, label: 'Placed' },
                          { id: 'verified', icon: CheckCircle2, label: 'Verified' },
                          { id: 'processing', icon: Clock, label: 'Processing' },
                          { id: 'shipped', icon: Truck, label: 'Shipped' },
                          { id: 'out_for_delivery', icon: MapPin, label: 'Out' },
                          { id: 'delivered', icon: CheckCircle, label: 'Delivered' },
                        ].map((step, idx) => {
                          const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                          const currentStatus = order.status === 'completed' ? 'delivered' : order.status;
                          const currentIdx = steps.indexOf(currentStatus);
                          const isActive = idx <= currentIdx;
                          const Icon = step.icon;
                          
                          return (
                            <div key={step.id} className="flex flex-col items-center gap-1 relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-stone-200 text-stone-300'
                              }`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className={`text-[8px] font-bold uppercase ${isActive ? 'text-emerald-600' : 'text-stone-400'}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-stone-600">{item.quantity}x {item.name}</span>
                          <span className="font-medium">{(item.price * item.quantity).toLocaleString()} ETB</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-stone-200 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-emerald-600">{order.totalAmount?.toLocaleString()} ETB</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase mb-1">Date</p>
                        <p className="text-sm font-medium">{order.createdAt?.toDate().toLocaleDateString()}</p>
                      </div>
                    </div>
                    {order.estimatedDelivery && (
                      <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <Truck className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">Estimated Delivery</p>
                          <p className="text-sm font-bold text-emerald-900">
                            {new Date(order.estimatedDelivery).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {order.status === 'delivered' && (
                      <button
                        onClick={() => handleConfirmDelivery(order.id)}
                        disabled={isConfirmingDelivery}
                        className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isConfirmingDelivery ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Confirm Delivery
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-stone-50 rounded-3xl border border-stone-100 text-center text-stone-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No orders found yet.</p>
                <button 
                  onClick={() => setView('shop')}
                  className="mt-6 px-6 py-3 bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-full"
                >
                  Start Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Newsletter Section */}
      <section className="py-32 bg-stone-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-medium mb-6">Join the Comfort Club</h2>
          <p className="text-stone-400 text-sm mb-10 max-w-lg mx-auto leading-relaxed">Subscribe to receive updates, access to exclusive deals, and more. Plus, get 10% off your first order.</p>
          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
            <input 
              type="email" 
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email" 
              className="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-full text-sm focus:outline-none focus:border-white transition-colors"
            />
            <button type="submit" className="px-10 py-4 bg-white text-stone-900 rounded-full text-[10px] font-bold tracking-widest uppercase hover:bg-stone-200 transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-4xl h-fit max-h-[90vh] bg-white z-[90] shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-stone-900 hover:bg-stone-900 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto relative overflow-hidden bg-stone-100 group/gallery">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={selectedProduct.images?.[currentImageIndex] || selectedProduct.image}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={selectedProduct.images?.[currentImageIndex] || selectedProduct.image} 
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>

                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => (prev === 0 ? selectedProduct.images!.length - 1 : prev - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-stone-900 hover:bg-stone-900 hover:text-white transition-all opacity-0 group-hover/gallery:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(prev => (prev === selectedProduct.images!.length - 1 ? 0 : prev + 1));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-md rounded-full text-stone-900 hover:bg-stone-900 hover:text-white transition-all opacity-0 group-hover/gallery:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                      {selectedProduct.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${currentImageIndex === idx ? 'bg-stone-900 w-4' : 'bg-stone-400'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto flex flex-col">
                <div className="mb-8">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                    <p className="text-[10px] text-stone-400 font-bold tracking-[0.3em] uppercase">{selectedProduct.category}</p>
                    {selectedProduct.merchantName && selectedProduct.merchantName !== 'ABAY' && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                        <ShoppingBag className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">{selectedProduct.merchantName}</span>
                      </div>
                    )}
                  </div>
                  <h2 className="text-3xl font-display font-medium text-stone-900 mb-1">{selectedProduct.name}</h2>
                  <p className="text-2xl font-bold text-emerald-600">{selectedProduct.price.toLocaleString()} ETB</p>
                </div>
                
                <div className="space-y-6 mb-12 flex-1">
                  <div>
                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-900 mb-3">Description</h4>
                    <p className="text-stone-600 text-sm leading-relaxed mb-2">{selectedProduct.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Availability</p>
                      <p className="text-sm font-bold text-stone-900">{selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}</p>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Shipping</p>
                      <p className="text-sm font-bold text-stone-900">Bahir Dar & Beyond</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-900 mb-4">Key Features</h4>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-xs text-stone-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        100% Premium Long-Staple Cotton
                      </li>
                      <li className="flex items-center gap-3 text-xs text-stone-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Oeko-Tex® Certified (No Harmful Chemicals)
                      </li>
                      <li className="flex items-center gap-3 text-xs text-stone-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Machine Washable & Easy Care
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-900 mb-4">Customer Reviews</h4>
                    
                    {/* Add Review Form */}
                    {user ? (
                      <div className="mb-8 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mb-4">Leave a Review</p>
                        <div className="flex gap-1 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className={`transition-colors ${reviewRating >= star ? 'text-amber-400' : 'text-stone-200'}`}
                            >
                              <Star className={`w-5 h-5 ${reviewRating >= star ? 'fill-current' : ''}`} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your thoughts..."
                          className="w-full bg-white border border-stone-200 rounded-xl p-4 text-xs focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none min-h-[100px] mb-4"
                        />
                        <button
                          onClick={handleAddReview}
                          disabled={isSubmittingReview}
                          className="w-full py-3 bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-full hover:bg-[#0c132e] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                      </div>
                    ) : (
                      <div className="mb-8 p-6 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                        <p className="text-xs text-stone-400 italic mb-4">Please login to leave a review.</p>
                        <button 
                          onClick={() => handleSignIn()}
                          className="px-6 py-2 bg-stone-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-full hover:bg-[#0c132e] hover:scale-105 active:scale-95 transition-all"
                        >
                          Login
                        </button>
                      </div>
                    )}

                    {/* Reviews List */}
                    <div className="space-y-8">
                      {reviews.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs text-stone-400 italic">No reviews yet. Be the first to review!</p>
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <div key={review.id} className="border-b border-stone-50 pb-6 last:border-0">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-xs font-bold text-stone-900">{review.userName}</p>
                                <div className="flex gap-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                      key={star} 
                                      className={`w-3 h-3 ${review.rating >= star ? 'text-amber-400 fill-current' : 'text-stone-200'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-[8px] text-stone-400 font-bold tracking-widest uppercase">
                                {review.createdAt?.toDate().toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 leading-relaxed">{review.comment}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-stone-100">
                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-900 mb-4">Related Products</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {PRODUCTS.filter(p => p.category === selectedProduct.category && p.id !== selectedProduct.id).slice(0, 3).map(p => (
                        <button 
                          key={p.id} 
                          onClick={() => setSelectedProduct(p)}
                          className="group/rel"
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 mb-2">
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover/rel:scale-110 transition-transform" referrerPolicy="no-referrer" />
                          </div>
                          <p className="text-[8px] font-bold text-stone-900 truncate uppercase tracking-widest">{p.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-8 space-y-6">
                  {selectedProduct.variants && selectedProduct.variants.map((variant) => (
                    <div key={variant.name} className="space-y-3">
                      <h4 className="text-[10px] font-bold tracking-widest uppercase text-stone-400">
                        Select {variant.name}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {variant.options.map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: option }))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedVariants[variant.name] === option
                                ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-200'
                                : 'bg-stone-50 text-stone-600 border-stone-100 hover:border-stone-300'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {selectedProduct.stock > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400">Quantity</span>
                      <div className="flex items-center bg-stone-100 rounded-full px-4 py-2">
                        <button 
                          onClick={() => setModalQuantity(prev => Math.max(selectedProduct.minOrderQuantity || 1, prev - 1))}
                          disabled={modalQuantity <= (selectedProduct.minOrderQuantity || 1)}
                          className="p-1 hover:text-emerald-600 transition-colors disabled:opacity-30"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input 
                          type="number" 
                          value={modalQuantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setModalQuantity(Math.max(selectedProduct.minOrderQuantity || 1, Math.min(selectedProduct.stock, val)));
                            }
                          }}
                          className="w-12 text-center text-sm font-bold bg-transparent border-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button 
                          onClick={() => setModalQuantity(prev => Math.min(selectedProduct.stock, prev + 1))}
                          disabled={modalQuantity >= selectedProduct.stock}
                          className="p-1 hover:text-emerald-600 transition-colors disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={selectedProduct.stock <= 0}
                      onClick={() => {
                        addToCart(selectedProduct, modalQuantity, selectedVariants);
                        setSelectedProduct(null);
                      }}
                      className="flex-1 py-5 bg-stone-100 text-stone-900 text-[10px] font-bold tracking-[0.1em] uppercase rounded-full hover:bg-stone-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-stone-200 active:scale-95"
                    >
                      {selectedProduct.stock > 0 ? 'Add to Cart' : 'Sold Out'}
                    </button>
                    <button 
                      disabled={selectedProduct.stock <= 0}
                      onClick={() => {
                        // Check if all variants are selected
                        if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                          const allSelected = selectedProduct.variants.every(v => selectedVariants && selectedVariants[v.name]);
                          if (!allSelected) {
                            setNotification({ message: 'Please select all options', type: 'error' });
                            setTimeout(() => setNotification(null), 3000);
                            return;
                          }
                        }
                        
                        addToCart(selectedProduct, modalQuantity, selectedVariants);
                        setSelectedProduct(null);
                        setIsCartOpen(true);
                        setCheckoutStep('delivery');
                      }}
                      className="flex-1 py-5 bg-stone-900 text-white text-[10px] font-bold tracking-[0.1em] uppercase rounded-full hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-stone-200 active:scale-95"
                    >
                      {selectedProduct.stock > 0 ? t('buyNow') : t('soldOut')}
                    </button>
                    <button 
                      onClick={() => toggleWishlist(selectedProduct.id)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 border ${
                        wishlist.includes(selectedProduct.id) 
                          ? 'bg-red-50 text-red-500 border-red-100' 
                          : 'bg-stone-50 text-stone-900 border-stone-200 hover:bg-stone-100'
                      }`}
                      title={wishlist.includes(selectedProduct.id) ? t('removeFromWishlist') : t('saveForLater')}
                    >
                      <Heart className={`w-5 h-5 ${wishlist.includes(selectedProduct.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={() => handleShare(selectedProduct)}
                      className="w-14 h-14 bg-stone-50 text-stone-900 rounded-full flex items-center justify-center hover:bg-stone-100 transition-all active:scale-95 border border-stone-200"
                      title={t('share')}
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">{t('yourCart')}</h2>
                  <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300">
                    <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">{t('cartEmpty')}</p>
                    <button 
                      onClick={() => {
                        setIsCartOpen(false);
                        setView('shop');
                      }}
                      className="mt-6 px-8 py-3 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-md shadow-slate-200"
                    >
                      {t('shopNow')}
                    </button>
                  </div>
                ) : checkoutStep === 'cart' ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {cart.map(item => (
                        <div key={item.cartId} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl">
                          <img 
                            src={item.product.image} 
                            alt={item.product.name} 
                            className="w-16 h-16 object-cover rounded-xl"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-xs text-slate-900">{item.product.name}</h4>
                            {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {Object.entries(item.selectedVariants).map(([name, value]) => (
                                  <span key={name} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[8px] font-bold uppercase tracking-wider">
                                    {name}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-slate-900 font-bold text-xs mb-2">{item.product.price.toLocaleString()} ETB</p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center bg-slate-50 rounded-lg px-2 py-1">
                                <button onClick={() => updateQuantity(item.cartId, -1)} className="p-1 hover:text-slate-900"><Minus className="w-2.5 h-2.5" /></button>
                                <span className="w-6 text-center text-[11px] font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.cartId, 1)} className="p-1 hover:text-slate-900"><Plus className="w-2.5 h-2.5" /></button>
                              </div>
                              <button onClick={() => removeFromCart(item.cartId)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : checkoutStep === 'delivery' ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                          <Truck className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900">{t('deliveryInfo')}</h3>
                      </div>

                      <div className="space-y-4">
                        {formError && (
                          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-100">
                            {formError}
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('fullName')}</label>
                            <input 
                              type="text" 
                              value={customerName}
                              onChange={(e) => {
                                setCustomerName(e.target.value);
                                if (formError) setFormError(null);
                              }}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                              placeholder={t('yourName')}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('phone')}</label>
                              <input 
                                type="tel" 
                                value={customerPhone}
                                onChange={(e) => {
                                  setCustomerPhone(e.target.value);
                                  if (formError) setFormError(null);
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                                placeholder="09..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('email')}</label>
                              <input 
                                type="email" 
                                value={customerEmail}
                                onChange={(e) => {
                                  setCustomerEmail(e.target.value);
                                  if (formError) setFormError(null);
                                }}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                                placeholder="mail@example.com"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('city')}</label>
                              <select 
                                value={customerCity}
                                onChange={(e) => setCustomerCity(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                              >
                                <option value="Addis Ababa">Addis Ababa</option>
                                <option value="Adama">Adama</option>
                                <option value="Bishoftu">Bishoftu</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('area')}</label>
                              <input 
                                type="text" 
                                value={customerArea}
                                onChange={(e) => setCustomerArea(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                                placeholder="Sub-city / Area"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('houseNo')}</label>
                              <input 
                                type="text" 
                                value={customerHouseNo}
                                onChange={(e) => setCustomerHouseNo(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                                placeholder="123"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('address')}</label>
                              <input 
                                type="text" 
                                ref={addressInputRef}
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-300 transition-all"
                                placeholder="Landmarks, building, etc."
                              />
                            </div>
                          </div>
                        </div>

                        {user && (
                          <div className="pt-4 border-t border-slate-100">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${shouldSaveAddress ? 'bg-slate-900 border-slate-900' : 'border-slate-200 group-hover:border-slate-300'}`}>
                                <input 
                                  type="checkbox" 
                                  className="hidden" 
                                  checked={shouldSaveAddress}
                                  onChange={(e) => setShouldSaveAddress(e.target.checked)}
                                />
                                {shouldSaveAddress && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-700">{t('saveToProfile')}</span>
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="font-bold text-slate-900">{cartTotal.toLocaleString()} ETB</span>
                    </div>
                  </div>
                ) : checkoutStep === 'payment' ? (
                  <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                      {['Telebirr', 'CBE'].map(method => (
                        <button 
                          key={method}
                          onClick={() => setSelectedPaymentMethod(method as any)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                            selectedPaymentMethod === method 
                              ? 'bg-slate-900 text-white shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {method === 'CBE' ? 'CBE Bank' : method}
                        </button>
                      ))}
                    </div>

                    {orderError && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-100">
                        {orderError}
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                          {selectedPaymentMethod === 'Telebirr' ? <Phone className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                        </div>
                        <h3 className="font-bold text-slate-900">{selectedPaymentMethod === 'Telebirr' ? 'Telebirr' : 'CBE Bank'}</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('amount')}</span>
                          <span className="font-bold text-slate-900 text-lg">{cartTotal.toLocaleString()} ETB</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('accountNumber')}</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              readOnly
                              value={selectedPaymentMethod === 'Telebirr' ? '0918192081' : '10000959890'}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                            />
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(selectedPaymentMethod === 'Telebirr' ? '0918192081' : '10000959890');
                                setNotification({ message: 'Copied to clipboard', type: 'success' });
                                setTimeout(() => setNotification(null), 2000);
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-900"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('transactionRefOptional')}</label>
                          <input 
                            type="text" 
                            placeholder="Enter transaction ID/reference"
                            value={transactionRef}
                            onChange={(e) => setTransactionRef(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-slate-900 transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('attachReceiptOptional')}</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReceiptFile(e.target.files[0]);
                          }
                        }}
                        className="hidden" 
                        id="receipt-upload"
                      />
                      <label 
                        htmlFor="receipt-upload"
                        className={`w-full flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl cursor-pointer transition-all ${
                          receiptFile ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                        }`}
                      >
                        {isUploading || isCompressing ? (
                          <div className="flex flex-col items-center w-full">
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
                              <motion.div 
                                className="h-full bg-slate-900"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">
                              {isCompressing ? t('compressing') : `${t('uploading')} ${Math.round(uploadProgress)}%`}
                            </span>
                          </div>
                        ) : receiptFile ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-6 h-6 text-slate-900 mb-2" />
                            <span className="text-[10px] font-bold text-slate-700 truncate max-w-[200px]">{receiptFile.name}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-6 h-6 text-slate-400 mb-2" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{t('uploadReceipt')}</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-full max-w-xs mb-6">
                      <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-2">Your Order ID</p>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-4xl font-mono font-black text-slate-900 tracking-tighter">
                            {lastOrderId}
                          </span>
                          <button 
                            onClick={() => {
                              if (lastOrderId) {
                                navigator.clipboard.writeText(lastOrderId);
                                const btn = document.getElementById('copy-btn');
                                if (btn) {
                                  const originalHtml = btn.innerHTML;
                                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check w-4 h-4"><path d="M20 6 9 17l-5-5"/></svg>';
                                  setTimeout(() => {
                                    btn.innerHTML = originalHtml;
                                  }, 2000);
                                }
                              }
                            }}
                            id="copy-btn"
                            className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-slate-900 border border-slate-100"
                            title="Copy Order ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest">Save this ID to track your order</p>
                      </div>
                    </div>

                    <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{t('orderPlaced')}</h3>

                    <p className="text-slate-500 mb-6 max-w-sm text-sm">
                      {t('orderPlacedNotice')}
                    </p>

                    <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 text-left border border-slate-100">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t('orderSummary')}</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {lastOrderItems.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <p className="text-[11px] font-bold text-slate-900">{item.product.name}</p>
                              <p className="text-[9px] text-slate-400">Qty: {item.quantity}</p>
                              {item.selectedVariants && Object.entries(item.selectedVariants).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {Object.entries(item.selectedVariants).map(([name, value]) => (
                                    <span key={name} className="text-[8px] text-slate-400 uppercase tracking-wider">
                                      {name}: {value}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-900">
                              {(item.product.price * item.quantity).toLocaleString()} ETB
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{t('totalPaid')}</span>
                        <span className="text-sm font-black text-slate-900">{lastOrderTotal.toLocaleString()} ETB</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setCheckoutStep('cart');
                        setIsCartOpen(false);
                        setLastOrderId(null);
                        setLastOrderItems([]);
                        setLastOrderTotal(0);
                      }}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex flex-col items-center text-sm shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <span>{t('continueShopping')}</span>
                    </button>
                  </div>
                )}
              </div>

              {cart.length > 0 && checkoutStep !== 'success' && (
                <div className="p-6 border-t border-slate-100 bg-slate-50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('subtotal')}</span>
                      <span className="text-lg font-bold text-slate-900">{cartTotal.toLocaleString()} ETB</span>
                    </div>
                    
                    {checkoutStep === 'cart' ? (
                      <button 
                        onClick={() => setCheckoutStep('delivery')}
                        className="w-full py-4 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        {t('checkout')}
                      </button>
                    ) : checkoutStep === 'delivery' ? (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setCheckoutStep('cart')}
                          className="flex-1 py-4 bg-white text-slate-900 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-slate-200 hover:bg-slate-50 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          {t('back')}
                        </button>
                        <button 
                          onClick={() => {
                            if (!customerName || !customerPhone || !customerEmail || !customerArea) {
                              setFormError(t('fillRequiredFields'));
                              return;
                            }
                            setCheckoutStep('payment');
                          }}
                          className="flex-[2] py-4 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          {t('continue')}
                        </button>
                      </div>
                    ) : checkoutStep === 'payment' ? (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setCheckoutStep('delivery')}
                          className="flex-1 py-4 bg-white text-slate-900 text-[10px] font-bold tracking-widest uppercase rounded-xl border border-slate-200 hover:bg-slate-50 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          {t('back')}
                        </button>
                        <button 
                          onClick={() => handlePlaceOrder(selectedPaymentMethod)}
                          disabled={isSubmitting}
                          className="flex-[2] py-4 bg-slate-900 text-white text-[10px] font-bold tracking-widest uppercase rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? t('processing') : t('confirmOrder')}
                        </button>
                      </div>
                    ) : null}
                  
                  <div className="mt-8 flex items-center justify-center gap-4 opacity-40 grayscale">
                    <div className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Secure Payment</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Verified Quality</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-[8px] font-bold uppercase tracking-widest">Fast Delivery</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeletingProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">{t('deleteProductTitle')}</h3>
              <p className="text-stone-500 text-center mb-8">
                {t('deleteProductDesc')}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeletingProduct(null)}
                  className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => deleteProduct(isDeletingProduct)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  {t('delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chatbot */}
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-[60] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">ABAY Assistant</h3>
                    <p className="text-[10px] opacity-80">Online | AI Powered</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none' 
                        : 'bg-white border border-stone-200 text-stone-800 rounded-tl-none shadow-sm'
                    }`}>
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span className="text-xs text-stone-400">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex gap-2">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2 bg-stone-100 border-none rounded-full text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
            isChatOpen ? 'bg-stone-900 text-white rotate-90' : 'bg-emerald-600 text-white'
          }`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
};

  return (
    <div className={`min-h-screen relative overflow-x-hidden font-sans text-stone-900 selection:bg-stone-200 pb-16 lg:pb-0 transition-colors duration-700 ${view === 'admin' ? 'bg-stone-100' : 'bg-stone-50'}`}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 sticky top-0 z-[100] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You are currently offline. You can still browse and your changes will sync when you reconnect.</span>
          </div>
          <button 
            onClick={async () => {
              try {
                await enableNetwork(db);
                setIsOnline(true);
                setNotification({ message: 'Reconnected to Firestore', type: 'success' });
                setTimeout(() => setNotification(null), 3000);
              } catch (err) {
                console.error("Failed to reconnect:", err);
              }
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
          >
            Reconnect Now
          </button>
        </div>
      )}

      {renderMainContent()}

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-stone-900 text-white border-stone-800' : 'bg-red-600 text-white border-red-500'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4" />}
            <span className="text-xs font-bold tracking-wider uppercase">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Footer */}
      <footer className="bg-slate-50 pt-24 pb-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900">WORK ABAY <span className="text-brand-accent">MART</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                {t('footerDesc')}
              </p>
              <div className="flex items-center gap-4">
                {['facebook', 'twitter', 'linkedin', 'instagram'].map(social => (
                  <button key={social} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-primary hover:border-brand-primary transition-all">
                    <Globe className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{t('shopping')}</h4>
              <ul className="space-y-4">
                {[
                  { label: t('catCoffeeSpices'), key: 'Coffee & Spices' },
                  { label: t('catAgriFood'), key: 'Agriculture & Food' },
                  { label: t('catApparelTextiles'), key: 'Apparel & Textiles' },
                  { label: t('catElectronicsGadgets'), key: 'Electronics & Gadgets' }
                ].map(item => (
                  <li key={item.key}><button className="text-sm font-bold text-slate-600 hover:text-brand-primary transition-colors">{item.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{t('sellOnAbay')}</h4>
              <ul className="space-y-4">
                {[
                  { label: t('merchantCenter'), action: () => isMerchant ? setView('admin') : setView('merchant-dashboard') },
                  { label: t('sellerGuide'), action: () => setView('seller-guide') },
                  { label: t('verifiedSeller'), action: () => setView('merchant-dashboard') },
                  { label: t('logisticsSupport'), action: () => setView('help-center') }
                ].map(item => (
                  <li key={item.label}><button onClick={item.action} className="text-sm font-bold text-slate-600 hover:text-brand-primary transition-colors">{item.label}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{t('support')}</h4>
              <ul className="space-y-4">
                {[
                  { label: t('helpCenter'), view: 'help-center' },
                  { label: t('userGuide', 'User Guide'), view: 'user-guide' },
                  { label: t('contactUs'), view: 'contact-us' },
                  { label: t('privacyPolicy'), view: 'privacy-policy' },
                  { label: t('termsOfService'), view: 'terms-of-service' }
                ].map(item => (
                  <li key={item.label}><button onClick={() => setView(item.view as any)} className="text-sm font-bold text-slate-600 hover:text-brand-primary transition-colors">{item.label}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('allRightsReserved')}</p>
            <div className="flex items-center gap-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" alt="Visa" className="h-4 grayscale opacity-50" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" alt="Mastercard" className="h-6 grayscale opacity-50" />
              <div className="text-[10px] font-black text-slate-400">TELEBIRR</div>
              <div className="text-[10px] font-black text-slate-400">CBE BIRR</div>
            </div>
          </div>
        </div>
      </footer>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isOrderDetailsModalOpen && selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOrderDetailsModalOpen(false);
                setIsEditingOrderDetails(false);
              }}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-white z-[110] shadow-2xl rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-xl font-bold">{t('orderDetails')}</h2>
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{t('orderId', { id: selectedOrder.id })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(isSuperAdmin || isOrderManager) && !isEditingOrderDetails && (
                    <button 
                      onClick={() => {
                        setIsEditingOrderDetails(true);
                        setEditingOrderData({
                          customerName: selectedOrder.customerName,
                          customerPhone: selectedOrder.customerPhone,
                          customerEmail: selectedOrder.customerEmail,
                          customerCity: selectedOrder.customerCity,
                          customerArea: selectedOrder.customerArea,
                          customerHouseNo: selectedOrder.customerHouseNo,
                          customerAddress: selectedOrder.customerAddress,
                          status: selectedOrder.status
                        });
                      }}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title={t('editCustomerDetails')}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => window.print()}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors print:hidden"
                    title="Print"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                      setIsOrderDetailsModalOpen(false);
                      setIsEditingOrderDetails(false);
                    }} 
                    className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                {/* Status and Date */}
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{t('status')}</p>
                      {isEditingOrderDetails ? (
                        <select 
                          value={editingOrderData.status}
                          onChange={(e) => setEditingOrderData({...editingOrderData, status: e.target.value})}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="pending">{t('pending')}</option>
                          <option value="verified">{t('verified')}</option>
                          <option value="processing">{t('processing')}</option>
                          <option value="shipped">{t('shipped')}</option>
                          <option value="out_for_delivery">{t('outForDelivery')}</option>
                          <option value="delivered">{t('delivered')}</option>
                          <option value="completed">{t('completed')}</option>
                          <option value="declined">{t('declined')}</option>
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          selectedOrder.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          selectedOrder.status === 'verified' ? 'bg-blue-100 text-blue-700' :
                          selectedOrder.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                          selectedOrder.status === 'out_for_delivery' ? 'bg-amber-100 text-amber-700' :
                          selectedOrder.status === 'delivered' ? 'bg-indigo-100 text-indigo-700' :
                          selectedOrder.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {t(selectedOrder.status)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{t('date')}</p>
                      <p className="text-sm font-medium flex items-center gap-2 justify-end">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {selectedOrder.createdAt?.toDate().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Status Tracker */}
                  {!isEditingOrderDetails && (
                    <div className="px-2 overflow-x-auto pb-4 scrollbar-hide">
                      <div className="flex justify-between relative min-w-[500px]">
                        <div className="absolute top-5 left-0 w-full h-0.5 bg-stone-200 -z-0" />
                        <div 
                          className="absolute top-5 left-0 h-0.5 bg-emerald-500 -z-0 transition-all duration-500" 
                          style={{ 
                            width: `${(() => {
                              const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                              const status = selectedOrder.status === 'completed' ? 'delivered' : selectedOrder.status;
                              const index = steps.indexOf(status);
                              return index === -1 ? 0 : (index / 5) * 100;
                            })()}%` 
                          }}
                        />
                        
                        {[
                          { id: 'pending', label: t('statusPlaced'), icon: Package },
                          { id: 'verified', label: t('statusVerified'), icon: CheckCircle2 },
                          { id: 'processing', label: t('statusProcessing'), icon: Clock },
                          { id: 'shipped', label: t('statusShipped'), icon: Truck },
                          { id: 'out_for_delivery', label: t('statusOut'), icon: MapPin },
                          { id: 'delivered', label: t('statusDelivered'), icon: CheckCircle },
                        ].map((step, idx) => {
                          const steps = ['pending', 'verified', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
                          const currentStatus = selectedOrder.status === 'completed' ? 'delivered' : selectedOrder.status;
                          const currentIdx = steps.indexOf(currentStatus);
                          const isActive = idx <= currentIdx;
                          const Icon = step.icon;
                          
                          return (
                            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                isActive ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-stone-200 text-stone-300'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <p className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? 'text-emerald-600' : 'text-stone-400'}`}>
                                {step.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Delivery Map */}
                  {selectedOrder.status === 'out_for_delivery' && !isEditingOrderDetails && (
                    <div className="space-y-4">
                      <h3 className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{t('liveTracking')}</h3>
                      <DeliveryMap order={selectedOrder} />
                    </div>
                  )}

                  {/* Customer and Delivery Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-3 h-3" /> {t('customerInfo')}
                    </h3>
                    {isEditingOrderDetails ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('customerName')}</label>
                          <input 
                            type="text" 
                            value={editingOrderData.customerName}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerName: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('email')}</label>
                          <input 
                            type="email" 
                            value={editingOrderData.customerEmail}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerEmail: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('phone')}</label>
                          <input 
                            type="tel" 
                            value={editingOrderData.customerPhone}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerPhone: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-bold">{selectedOrder.customerName}</p>
                        <p className="text-sm text-stone-600 flex items-center gap-2">
                          <Mail className="w-3 h-3" /> {selectedOrder.customerEmail}
                        </p>
                        <p className="text-sm text-stone-600 flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {selectedOrder.customerPhone}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {t('deliveryAddress')}
                    </h3>
                    {isEditingOrderDetails ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('city')}</label>
                          <input 
                            type="text" 
                            value={editingOrderData.customerCity}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerCity: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('area')}</label>
                          <input 
                            type="text" 
                            value={editingOrderData.customerArea}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerArea: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('houseNo')}</label>
                          <input 
                            type="text" 
                            value={editingOrderData.customerHouseNo}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerHouseNo: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none"
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">{t('detailedAddress')}</label>
                          <textarea 
                            value={editingOrderData.customerAddress}
                            onChange={(e) => setEditingOrderData({...editingOrderData, customerAddress: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none h-20"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <p className="text-[9px] text-stone-400 uppercase font-bold">{t('city')}</p>
                          <p className="font-bold">{selectedOrder.customerCity || 'Addis Ababa'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400 uppercase font-bold">{t('area')}</p>
                          <p className="font-bold">{selectedOrder.customerArea}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-stone-400 uppercase font-bold">{t('houseNo')}</p>
                          <p className="font-bold">{selectedOrder.customerHouseNo}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[9px] text-stone-400 uppercase font-bold">{t('detailedAddress')}</p>
                          <p className="font-bold">{selectedOrder.customerAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isEditingOrderDetails && (
                  <div className="flex gap-4 pt-4 border-t border-stone-100">
                    <button 
                      onClick={() => setIsEditingOrderDetails(false)}
                      className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      onClick={() => updateOrderDetails(selectedOrder.id, editingOrderData)}
                      disabled={isSubmitting}
                      className="flex-[2] py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200"
                    >
                      {isSubmitting ? t('saving') : t('saveOrderDetails')}
                    </button>
                  </div>
                )}

                {/* Payment Info */}
                {!isEditingOrderDetails && (
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <CreditCard className="w-3 h-3" /> {t('paymentInfo')}
                    </h3>
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] text-stone-400 uppercase font-bold">{t('method')}</p>
                        <p className="text-sm font-bold capitalize">{selectedOrder.paymentMethod?.replace('_', ' ')}</p>
                      </div>
                      {selectedOrder.transactionRef && (
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-400 uppercase font-bold">{t('reference')}</p>
                          <p className="text-sm font-bold text-stone-900">{selectedOrder.transactionRef}</p>
                        </div>
                      )}
                      {selectedOrder.receiptImage && (
                          <a 
                            href={selectedOrder.receiptImage} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> {t('viewReceipt')}
                          </a>
                        )}
                      </div>
                    </div>
                )}

                  {/* Order Items */}
                {!isEditingOrderDetails && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t('orderItems')}</h3>
                    <div className="space-y-3">
                      {selectedOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-2xl">
                          <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center overflow-hidden">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Package className="w-6 h-6 text-stone-300" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-stone-500">
                                {item.variant ? Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(' | ') : t('noVariants')}
                              </p>
                              {item.merchantName && (
                                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 text-[8px] font-bold uppercase tracking-wider rounded">
                                  Merchant: {item.merchantName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{item.price.toLocaleString()} ETB</p>
                            <p className="text-[10px] text-stone-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                {!isEditingOrderDetails && (
                  <div className="pt-6 border-t border-stone-200 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase">{t('shippingAddress')}</p>
                      <p className="text-sm text-stone-600 max-w-xs">{selectedOrder.customerAddress || 'N/A'}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] text-stone-400 font-bold tracking-widest uppercase">{t('totalAmount')}</p>
                      <p className="text-2xl font-bold text-emerald-600">{selectedOrder.totalAmount?.toLocaleString()} ETB</p>
                    </div>
                  </div>
                )}

                {selectedOrder.estimatedDelivery && !isEditingOrderDetails && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase">{t('updateEstimatedDelivery')}</p>
                      <p className="text-sm font-bold text-emerald-900">
                        {new Date(selectedOrder.estimatedDelivery).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal 
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmationModal?.isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmationModal(null)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[120]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white z-[130] shadow-2xl rounded-3xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">{confirmationModal.title}</h3>
              <p className="text-sm text-stone-500 mb-8">{confirmationModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmationModal(null)}
                  className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {t('cancel')}
                </button>
                <button 
                  onClick={confirmationModal.onConfirm}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('confirm')
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MobileNavBar 
        view={view}
        setView={setView}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        setIsCartOpen={setIsCartOpen}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        user={user}
        handleSignIn={handleSignIn}
      />
    </div>
  );
}
