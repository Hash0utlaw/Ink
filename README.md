# InkFinder 🎨

A comprehensive platform connecting tattoo enthusiasts with talented artists and reputable shops worldwide.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/misfitderbysocietygmailcoms-projects/v0-ink-finder)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by Supabase](https://img.shields.io/badge/Powered%20by-Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com/)

## 🌟 Features

### For Tattoo Enthusiasts
- **AI Tattoo Generator**: Create unique tattoo designs using advanced AI technology
- **Artist Discovery**: Find and connect with talented tattoo artists worldwide
- **Shop Locator**: Discover reputable tattoo shops in your area
- **Style Explorer**: Browse different tattoo styles with curated galleries
- **Booking System**: Schedule consultations and appointments directly
- **Portfolio Browsing**: View artist portfolios and previous work

### For Tattoo Artists
- **Professional Profiles**: Showcase your work and expertise
- **Portfolio Management**: Upload and organize your tattoo artwork
- **Appointment Management**: Handle bookings and client communications
- **Analytics Dashboard**: Track your performance and client engagement
- **Client Reviews**: Build reputation through verified reviews

### For Tattoo Shops
- **Shop Profiles**: Highlight your studio and resident artists
- **Multi-Artist Management**: Manage multiple artists under one roof
- **Booking Coordination**: Handle appointments for all shop artists
- **Shop Analytics**: Monitor business performance and metrics

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Hooks + Context API
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

### Backend & Database
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### AI & External Services
- **AI Image Generation**: Replicate API
- **Maps**: Mapbox (planned)
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

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/inkfinder.git
   cd inkfinder
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
   
   # Replicate API (for AI tattoo generation)
   REPLICATE_API_TOKEN=your_replicate_api_token
   
   # Optional: Custom site URL
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   \`\`\`

4. **Set up Supabase**
   - Create a new Supabase project
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
inkfinder/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Authentication pages
│   ├── api/                      # API routes
│   ├── artists/                  # Artist-related pages
│   ├── dashboard/                # User dashboard
│   ├── generator/                # AI tattoo generator
│   ├── shops/                    # Shop-related pages
│   └── styles/                   # Tattoo style pages
├── components/                   # Reusable React components
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Layout components
│   ├── auth/                     # Authentication components
│   ├── artists/                  # Artist-specific components
│   ├── shops/                    # Shop-specific components
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

## 🎨 Design System

The project uses a custom design system built on top of Tailwind CSS and shadcn/ui:

- **Colors**: Custom burgundy accent color palette
- **Typography**: Consistent font scales and weights
- **Components**: Reusable UI components with consistent styling
- **Spacing**: Standardized spacing system
- **Responsive**: Mobile-first responsive design

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

### Code Style

- **ESLint**: Configured for Next.js and TypeScript
- **Prettier**: Code formatting (coming soon)
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for components

### Git Workflow

1. Create feature branches from `main`
2. Use conventional commit messages
3. Submit pull requests for review
4. Ensure all tests pass before merging

## 🌐 Deployment

The application is automatically deployed to Vercel when changes are pushed to the main branch.

**Live URL**: [https://vercel.com/misfitderbysocietygmailcoms-projects/v0-ink-finder](https://vercel.com/misfitderbysocietygmailcoms-projects/v0-ink-finder)

### Environment Variables (Production)

Ensure the following environment variables are set in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REPLICATE_API_TOKEN`

## 🤝 Contributing

We welcome contributions to InkFinder! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style and conventions
- Write clear, descriptive commit messages
- Add tests for new features (when testing is implemented)
- Update documentation as needed
- Ensure your code is accessible and responsive

## 📋 Roadmap

### Phase 1: Core Platform (Current)
- [x] Basic UI/UX implementation
- [x] AI tattoo generator
- [x] Artist and shop discovery
- [x] User authentication setup
- [ ] Database schema implementation
- [ ] Booking system

### Phase 2: Enhanced Features
- [ ] Real-time messaging
- [ ] Payment integration
- [ ] Advanced search and filtering
- [ ] Mobile app (React Native)

### Phase 3: Community Features
- [ ] User reviews and ratings
- [ ] Social features and sharing
- [ ] Artist verification system
- [ ] Community forums

## 🐛 Known Issues

- Supabase authentication integration needs completion
- Mobile responsiveness needs optimization on some pages
- Search functionality requires backend API implementation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for the beautiful component library
- **Vercel** for seamless deployment
- **Supabase** for backend infrastructure
- **Replicate** for AI image generation capabilities
- **Lucide** for the icon library

## 📞 Support

For support, email support@inkfinder.com or join our Discord community.

---

**Built with ❤️ for the tattoo community**
