export interface ProductVariant {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  description: string;
  category: string;
  image: string;
  images?: string[];
  variants?: ProductVariant[];
  stock: number;
  soldCount: number;
  isBestSeller?: boolean;
  isNew?: boolean;
  merchantId?: string;
  merchantName?: string;
  minOrderQuantity?: number;
  unit?: string;
  isVerified?: boolean;
  tags?: string[];
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image: string;
  videoUrl?: string;
  ctaText: string;
  ctaLink: string;
  badge?: string;
}

export const COMMISSION_RATE = 0.005; // 0.5%

export const PRODUCT_CATEGORIES = [
  'Coffee & Spices',
  'Agriculture & Food',
  'Apparel & Textiles',
  'Electronics & Gadgets',
  'Home & Garden',
  'Logistics Services',
  'Bedding Solution',
  'Beauty & Care'
];

export const PROMOTIONS: Promotion[] = [
  {
    id: 'p1',
    title: 'Premium Bedding Sale',
    description: 'Transform your sleep experience with our authentic Ethiopian cotton bedding solutions. Limited time 30% discount.',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200',
    ctaText: 'Explore Collection',
    ctaLink: 'shop',
    badge: '30% OFF'
  },
  {
    id: 'p2',
    title: 'Sidama Coffee Journey',
    description: 'Watch how we source the finest coffee beans from the heart of Sidama, ensuring ethical trade and premium quality.',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ctaText: 'Watch Video',
    ctaLink: 'promotions',
    badge: 'FEATURED'
  },
  {
    id: 'p3',
    title: 'How to Shop on ABAY',
    description: 'New to ABAY Mart? Watch our step-by-step guide on how to find products, add to cart, and checkout securely.',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://www.youtube.com/embed/S_8qM9v-2-k', // Generic Shopify customer tutorial or similar
    ctaText: 'Start Shopping',
    ctaLink: 'shop',
    badge: 'TUTORIAL'
  },
  {
    id: 'p4',
    title: 'Eco-Friendly Agriculture',
    description: 'Discover our commitment to sustainable farming and how we bring organic teff to your table.',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ctaText: 'See The Process',
    ctaLink: 'promotions',
    badge: 'SUSTAINABLE'
  }
];

export const PRODUCTS: Product[] = [
  // Coffee & Spices
  {
    id: 'c1',
    name: 'Sidama Speciality Coffee',
    price: 1200,
    costPrice: 600,
    description: 'Premium Sidama coffee beans, known for their floral and citrus notes.',
    category: 'Coffee & Spices',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=1200',
    stock: 100,
    soldCount: 450,
    isBestSeller: true,
    minOrderQuantity: 10,
    unit: 'kg',
    isVerified: true
  },
  {
    id: 'c2',
    name: 'Yirgacheffe Green Coffee',
    price: 1500,
    costPrice: 800,
    description: 'High-quality green coffee beans from the Yirgacheffe region.',
    category: 'Coffee & Spices',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200',
    stock: 50,
    soldCount: 230,
    tags: ['coffee', 'green', 'yirgacheffe', 'export']
  },

  // Agriculture & Food
  {
    id: 'ag1',
    name: 'Organic Teff Flour (Brown)',
    price: 3500,
    costPrice: 1500,
    description: 'Gluten-free, nutrient-rich brown teff flour from the Ethiopian highlands.',
    category: 'Agriculture & Food',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200',
    stock: 200,
    soldCount: 1200,
    isBestSeller: true,
    minOrderQuantity: 50,
    unit: 'kg',
    isVerified: true,
    tags: ['teff', 'flour', 'brown', 'injera', 'gluten-free', 'organic']
  },
  {
    id: 'ag2',
    name: 'Highland Honey (White)',
    price: 800,
    costPrice: 350,
    description: 'Pure, organic white honey harvested from the Ethiopian highlands.',
    category: 'Agriculture & Food',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=1200',
    stock: 80,
    soldCount: 340,
    tags: ['honey', 'white', 'organic', 'highland', 'food']
  },

  // Apparel & Textiles
  {
    id: 'tx1',
    name: 'Traditional Handwoven Gabbi',
    price: 4500,
    costPrice: 2000,
    description: 'Authentic, hand-woven Ethiopian cotton Gabbi, perfect for all seasons.',
    category: 'Apparel & Textiles',
    image: 'https://images.unsplash.com/photo-1606103920295-9a091573f160?auto=format&fit=crop&q=80&w=1200',
    stock: 30,
    soldCount: 85,
    isNew: true,
    minOrderQuantity: 5,
    unit: 'pcs',
    isVerified: true
  },
  {
    id: 'tx2',
    name: 'Habesha Kemis (Modern Design)',
    price: 12000,
    costPrice: 5000,
    description: 'Elegant, modern Habesha dress with traditional embroidery.',
    category: 'Apparel & Textiles',
    image: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&q=80&w=1200',
    stock: 15,
    soldCount: 40,
    isNew: true
  },

  // Electronics & Gadgets
  {
    id: 'el1',
    name: 'Smart Solar Lantern',
    price: 2500,
    costPrice: 1200,
    description: 'Portable solar-powered lantern with USB charging port.',
    category: 'Electronics & Gadgets',
    image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=1200',
    stock: 60,
    soldCount: 150
  },
  {
    id: 'el2',
    name: 'Wireless Power Bank 20000mAh',
    price: 3200,
    costPrice: 1500,
    description: 'High-capacity power bank with fast wireless charging.',
    category: 'Electronics & Gadgets',
    image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&q=80&w=1200',
    stock: 40,
    soldCount: 90
  },

  // Home & Garden
  {
    id: 'ha1',
    name: 'Electric Injera Mitad',
    price: 8500,
    costPrice: 4000,
    description: 'Energy-efficient electric griddle for baking perfect Injera.',
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200',
    stock: 25,
    soldCount: 110
  },
  {
    id: 'ha2',
    name: 'Solar Powered Refrigerator',
    price: 25000,
    costPrice: 12000,
    description: 'Eco-friendly refrigerator that runs entirely on solar power, ideal for remote areas.',
    category: 'Home & Garden',
    image: 'https://images.unsplash.com/photo-1571175432270-e8a1f626b58b?auto=format&fit=crop&q=80&w=1200',
    stock: 10,
    soldCount: 15
  },

  // Logistics Services
  {
    id: 'lc2',
    name: 'Local Express Delivery',
    price: 250,
    costPrice: 100,
    description: 'Fast and secure local delivery within Addis Ababa and surrounding areas.',
    category: 'Logistics Services',
    image: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&q=80&w=1200',
    stock: 999,
    soldCount: 1500
  },

  // Bedding Solution
  {
    id: 'bs1',
    name: 'Premium Cotton Bed Sheet Set',
    price: 3500,
    costPrice: 1800,
    description: 'Luxurious 100% cotton bed sheet set, including pillowcases and a duvet cover. Soft, breathable, and durable.',
    category: 'Bedding Solution',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200',
    stock: 45,
    soldCount: 120,
    isBestSeller: true,
    isVerified: true
  },
  {
    id: 'bs2',
    name: 'Orthopedic Memory Foam Pillow',
    price: 1800,
    costPrice: 900,
    description: 'Ergonomic memory foam pillow designed to provide optimal neck support and improve sleep quality.',
    category: 'Bedding Solution',
    image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=1200',
    stock: 60,
    soldCount: 85
  },

  // Beauty & Care
  {
    id: 'bt1',
    name: 'Organic Shea Butter',
    price: 1200,
    costPrice: 500,
    description: '100% pure, unrefined organic shea butter for skin and hair care.',
    category: 'Beauty & Care',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=1200',
    stock: 150,
    soldCount: 300,
    isBestSeller: true,
    isVerified: true
  }
];
