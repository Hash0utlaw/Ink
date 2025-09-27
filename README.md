# TattooMaps 🗺️

A comprehensive platform connecting tattoo enthusiasts with talented artists and reputable shops worldwide through location-based discovery.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/misfitderbysocietygmailcoms-projects/v0-tattoo-maps)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com/)

## 🌟 Features

### For Tattoo Enthusiasts
- **Interactive Map Discovery**: Find artists and shops on an interactive map interface
- **AI Tattoo Generator**: Create unique tattoo designs using advanced AI technology
- **Location-Based Search**: Discover artists and shops near you or any location
- **Style Explorer**: Browse different tattoo styles with curated galleries
- **Route Planning**: Plan visits to multiple shops and artists
- **Booking System**: Schedule consultations and appointments directly

### For Tattoo Artists
- **Geographic Presence**: Showcase your location and service areas on the map
- **Professional Profiles**: Display your work and expertise with location context
- **Portfolio Management**: Upload and organize your tattoo artwork
- **Appointment Management**: Handle bookings and client communications
- **Analytics Dashboard**: Track your geographic reach and client engagement

### For Tattoo Shops
- **Shop Mapping**: Highlight your studio location and catchment area
- **Multi-Artist Coordination**: Manage multiple artists with location-based services
- **Area Coverage**: Show service areas and travel availability
- **Local SEO**: Improve discoverability in local searches

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Mapbox integration for interactive mapping
- **State Management**: React Hooks + Context API
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend & Database
- **Database**: Supabase (PostgreSQL) with PostGIS for geospatial data
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### AI & External Services
- **AI Image Generation**: Replicate API
- **Maps & Geocoding**: Mapbox API
- **Payments**: Stripe (planned)
- **Email**: Resend (planned)

### Development & Deployment
- **Language**: TypeScript
- **Deployment**: Vercel
- **Version Control**: Git
- **Package Manager**: npm

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for database and auth)
- Mapbox account (for mapping features)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/tattoomaps.git
   cd tattoomaps
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   \`\`\`env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   # Mapbox Configuration
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
   
   # Replicate API (for AI tattoo generation)
   REPLICATE_API_TOKEN=your_replicate_api_token
   
   # Optional: Custom site URL
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   \`\`\`

4. **Set up Supabase**
   - Create a new Supabase project
   - Enable PostGIS extension for geospatial features
   - Run the database migrations (coming soon)
   - Configure authentication providers
   - Set up storage buckets for images

5. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

\`\`\`
tattoomaps/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication pages
│   ├── api/                      # API routes
│   ├── artists/                  # Artist-related pages
│   ├── dashboard/                # User dashboard
│   ├── generator/                # AI tattoo generator
│   ├── shops/                    # Shop-related pages
│   ├── map/                      # Interactive map pages
│   └── styles/                   # Tattoo style pages
├── components/                   # Reusable React components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   ├── auth/                     # Authentication components
│   ├── artists/                  # Artist-specific components
│   ├── shops/                    # Shop-specific components
│   ├── map/                      # Map-related components
│   └── generator/                # AI generator components
├── hooks/                        # Custom React hooks
├── lib/                          # Utility functions and configurations
├── types/                        # TypeScript type definitions
├── utils/                        # Helper utilities
│   └── supabase/                 # Supabase client configurations
├── public/                       # Static assets
│   ├── styles/                   # Style-specific images
│   └── ...                       # Other static files
└── styles/                       # Global CSS files
\`\`\`

## 🗺️ Mapping Features

TattooMaps leverages advanced mapping technology to provide:

- **Interactive Map Interface**: Explore artists and shops visually
- **Geospatial Search**: Find services within specific radius
- **Route Optimization**: Plan efficient visits to multiple locations
- **Area Coverage**: Visualize artist service areas
- **Location Analytics**: Understand geographic distribution of services

## 🎨 Design System

The project uses a map-inspired design system:

- **Colors**: Earth tones with map-like color palette
- **Typography**: Clean, readable fonts suitable for map interfaces
- **Components**: Location-aware UI components
- **Icons**: Map and location-focused iconography
- **Responsive**: Mobile-first with map-optimized layouts

## 🔧 Development

### Available Scripts

\`\`\`bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Database (coming soon)
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
\`\`\`

## 🌐 Deployment

The application is automatically deployed to Vercel when changes are pushed to the main branch.

**Live URL**: [https://vercel.com/misfitderbysocietygmailcoms-projects/v0-tattoo-maps](https://vercel.com/misfitderbysocietygmailcoms-projects/v0-tattoo-maps)

### Environment Variables (Production)

Ensure the following environment variables are set in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `REPLICATE_API_TOKEN`

## 🤝 Contributing

We welcome contributions to TattooMaps! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📋 Roadmap

### Phase 1: Core Platform (Current)
- [x] Basic UI/UX implementation
- [x] AI tattoo generator
- [x] Artist and shop discovery
- [x] User authentication setup
- [ ] Interactive map integration
- [ ] Geospatial database schema
- [ ] Location-based search

### Phase 2: Enhanced Mapping
- [ ] Advanced map filters
- [ ] Route planning features
- [ ] Area coverage visualization
- [ ] Mobile location services

### Phase 3: Community & Analytics
- [ ] Location-based reviews
- [ ] Geographic analytics
- [ ] Territory management for artists
- [ ] Local community features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mapbox** for powerful mapping capabilities
- **shadcn/ui** for the beautiful component library
- **Vercel** for seamless deployment
- **Supabase** for backend infrastructure with PostGIS
- **Replicate** for AI image generation capabilities

## 📞 Support

For support, email support@tattoomaps.com or join our Discord community.

---

**Built with ❤️ for the global tattoo community**
