# 🚀 CRM System - Complete Business Management Solution

A full-stack CRM system built with MERN stack (MongoDB, Express, React, Node.js) featuring billing management, payment verification, invoice generation, and multi-company support.

---

## ✨ Features

### 🎯 Core Features
- **Multi-Company Support** - Manage multiple companies with easy switching
- **Service Management** - Create and manage services with pricing tiers
- **Plan Builder** - Build custom plans with multiple services
- **Invoice Generation** - Create and send invoices with PDF export
- **Payment Verification** - Admin workflow for payment approval
- **Dashboard Analytics** - Revenue tracking and business insights
- **Notification System** - Real-time notifications for important events
- **Profile Management** - User profiles with picture upload

### 🔐 Security
- JWT Authentication
- Role-based access control (Admin, Client)
- Secure file uploads to AWS S3
- Environment-based configuration

### 💼 Business Features
- Subscription management
- Billing cycle tracking
- Payment proof uploads
- Invoice status tracking
- Revenue analytics
- Popular services/plans tracking

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Bootstrap 5** - UI components
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Context API** - State management
- **React Toastify** - Notifications

### Backend
- **Node.js 20** - Runtime
- **Express 5** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Sharp** - Image processing
- **AWS S3** - File storage
- **Nodemailer** - Email (optional)

### DevOps
- **PM2** - Process manager
- **Nginx** - Web server
- **Docker** - Containerization (optional)
- **Let's Encrypt** - SSL certificates

---

## 📋 Prerequisites

- Node.js 20.x or higher
- MongoDB (Atlas or local)
- AWS S3 account
- npm or yarn

---

## 🚀 Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/crm-website.git
cd crm-website
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend-new
npm install
# Edit .env with API URL
npm run dev
```

### 4. Access Application
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## 🌐 Production Deployment

### 📚 Complete Deployment Guides Available!

We have comprehensive step-by-step guides for deploying your CRM system:

### 🎯 Start Here:
👉 **[docs/DEPLOYMENT_QUICK_START.md](./docs/DEPLOYMENT_QUICK_START.md)**
- Choose your deployment method
- Compare options
- Get cost estimates
- Quick setup instructions

### 📖 Detailed Guides:

1. **[Simple Deployment Guide](./docs/SERVER_DEPLOYMENT_GUIDE.md)** (Recommended for beginners)
   - Traditional deployment with PM2 + Nginx
   - Step-by-step instructions
   - ~45 minutes setup time
   - $12-15/month cost

2. **[Docker Deployment Guide](./docs/DOCKER_DEPLOYMENT_GUIDE.md)** (Recommended for production)
   - Containerized deployment
   - Easy updates and scaling
   - ~45 minutes setup time
   - $12-15/month cost

3. **[Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)**
   - Complete checklist for deployment
   - Testing procedures
   - Maintenance schedule

### 🐳 Docker Quick Start:
```bash
# Clone and configure
git clone https://github.com/yourusername/crm-website.git
cd crm-website

# Configure environment
nano backend/.env.production
nano frontend-new/.env.production

# Start with Docker
docker-compose up -d --build

# Access at http://your_server_ip:3000
```

---

## 📁 Project Structure

```
crm-website/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Custom middleware
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Entry point
│   ├── .env.example        # Environment template
│   ├── Dockerfile          # Docker config
│   └── package.json
│
├── frontend-new/           # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # Context providers
│   │   ├── services/       # API services
│   │   └── App.jsx         # Main app
│   ├── .env                # Environment config
│   ├── Dockerfile          # Docker config
│   └── package.json
│
├── docs/                   # Documentation
│   ├── README.md           # Docs index
│   ├── DEPLOYMENT_QUICK_START.md
│   ├── SERVER_DEPLOYMENT_GUIDE.md
│   ├── DOCKER_DEPLOYMENT_GUIDE.md
│   └── ...more guides
│
├── docker-compose.yml      # Docker Compose config
└── README.md              # This file
```

---

## 🎯 Key Features Implemented

### ✅ Completed (Tasks 1-7):
- [x] Project structure and infrastructure
- [x] Company context and multi-company support
- [x] Notification system with real-time updates
- [x] Shared components (DataTable, SearchBar, Filters, etc.)
- [x] Complete API service layer
- [x] Service Management (CRUD)
- [x] Plan Management with wizard builder
- [x] Invoice Management with PDF generation
- [x] Payment Verification workflow
- [x] Admin Dashboard with analytics
- [x] Profile picture upload (AWS S3)

### 📋 In Progress (Tasks 8-18):
- [ ] Responsive design enhancements
- [ ] Accessibility improvements
- [ ] Advanced data table features
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Final documentation

---

## 🔧 Configuration

### Backend Environment Variables (.env):
```env
MONGO_URI=mongodb://localhost:27017/crm-database
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=crm-payment-proofs
PORT=5000
NODE_ENV=development
```

### Frontend Environment Variables (.env):
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📊 API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Services
- `GET /api/services` - Get all services
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Plans
- `GET /api/plans` - Get all plans
- `POST /api/plans` - Create plan
- `PUT /api/plans/:id` - Update plan
- `DELETE /api/plans/:id` - Delete plan

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/:id/send` - Send invoice
- `GET /api/invoices/:id/pdf` - Generate PDF

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/pending-verification` - Get pending payments
- `PUT /api/payments/:id/verify` - Verify payment
- `PUT /api/payments/:id/reject` - Reject payment

*Full API documentation coming soon*

---

## 🧪 Testing

### Run Tests:
```bash
# Backend tests
cd backend
npm test

# Frontend tests (coming soon)
cd frontend-new
npm test
```

---

## 📈 Performance

- Page load time: < 3 seconds
- API response time: < 500ms
- Image optimization: Automatic (Sharp)
- Caching: Nginx static file caching
- Database: Indexed queries

---

## 🔒 Security Features

- JWT token authentication
- Password hashing (bcrypt)
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Rate limiting (optional)
- SQL injection prevention (Mongoose)
- XSS protection
- HTTPS/SSL support

---

## 💰 Deployment Costs

### Monthly Costs:
- **Server:** $12/month (DigitalOcean 2GB)
- **Domain:** $1/month ($12/year)
- **MongoDB Atlas:** Free (512MB tier)
- **AWS S3:** $1-2/month
- **SSL:** Free (Let's Encrypt)

**Total: ~$14-16/month**

---

## 📚 Documentation

All documentation is in the `docs/` folder:

- **[Documentation Index](./docs/README.md)** - Complete docs overview
- **[Deployment Quick Start](./docs/DEPLOYMENT_QUICK_START.md)** - Start here!
- **[Server Deployment Guide](./docs/SERVER_DEPLOYMENT_GUIDE.md)** - Traditional deployment
- **[Docker Deployment Guide](./docs/DOCKER_DEPLOYMENT_GUIDE.md)** - Docker deployment
- **[Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)** - Deployment checklist
- **[Feature Analysis](./docs/TASKS_2-6_ANALYSIS.md)** - What's been built
- **[AWS S3 Setup](./docs/AWS_S3_CONFIGURATION_COMPLETE.md)** - S3 configuration

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Sahin Mondal**

---

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the database
- AWS for S3 storage
- Bootstrap team for UI components
- All open-source contributors

---

## 📞 Support

For deployment help or issues:
1. Check the [documentation](./docs/README.md)
2. Review the [troubleshooting guides](./docs/SERVER_DEPLOYMENT_GUIDE.md#troubleshooting)
3. Open an issue on GitHub

---

## 🗺️ Roadmap

### Phase 1: Core Features ✅ COMPLETE
- Authentication & Authorization
- Service & Plan Management
- Invoice & Payment System
- Dashboard Analytics

### Phase 2: Enhancements (Current)
- Responsive design
- Accessibility
- Performance optimization
- Comprehensive testing

### Phase 3: Advanced Features (Future)
- Email notifications
- Advanced reporting
- Mobile app
- API documentation
- Automated testing
- CI/CD pipeline

---

## 🎉 Ready to Deploy?

1. **Read the guides:** Start with [DEPLOYMENT_QUICK_START.md](./docs/DEPLOYMENT_QUICK_START.md)
2. **Choose your method:** Simple or Docker deployment
3. **Follow step-by-step:** Complete deployment guide
4. **Test everything:** Use the deployment checklist
5. **Go live:** Launch your CRM system!

**Good luck! 🚀**

---

*Built with ❤️ using MERN Stack*
