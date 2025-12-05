# 🏢 ERP/CRM Management System

A comprehensive Enterprise Resource Planning and Customer Relationship Management system built with MERN stack (MongoDB, Express, React, Node.js) for modern businesses.

---

## ✨ Features

### 👥 User Management
- Multi-role system (Admin, HR, HoD, HoP, Employee, Client)
- Role-based access control and permissions
- User profile management with picture upload
- Department and team management

### ⏰ Attendance System
- Clock in/out functionality
- Manual attendance modifications (HR)
- Attendance reports and analytics
- Department attendance overview
- Late arrival tracking

### 🏖️ Leave Management
- Leave request submission
- Approval workflow
- Leave balance tracking
- Leave history and reports

### 📁 Project Management
- Project creation and management
- Team assignment
- Task/slot management
- Progress tracking
- Workload balancing

### 📋 Work Assignment
- Task creation with priorities
- Smart employee assignment
- Workload indicators
- Department-specific work forms
- Approval workflows

### 📢 Communication
- Company-wide announcements
- Targeted announcements by role/department
- Real-time notification system
- Notification routing and icons

### 📅 Calendar & Scheduling
- Content calendar
- Event scheduling
- Task deadlines

### 💰 Billing & Invoicing
- Client billing management
- Invoice generation with PDF export
- Payment tracking
- Revenue analytics

### 📊 Dashboards
- Role-based dashboards
- Real-time data visualization
- Performance metrics
- Workload analytics

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Bootstrap** - UI components
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Context API** - State management
- **React Toastify** - Notifications
- **Chart.js** - Data visualization

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads
- **AWS S3** - File storage

### DevOps
- **PM2** - Process manager (optional)
- **Docker** - Containerization (optional)

---

## 📋 Prerequisites

- Node.js 18.x or higher
- MongoDB (Atlas or local installation)
- npm or yarn package manager

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/erp-crm-system.git
cd erp-crm-system
```

### 2. Setup Backend
```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start backend server
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install

# Create .env file with backend API URL
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start frontend development server
npm run dev
```

### 4. Access Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000

### 5. Default Login
After seeding the database, use these credentials:
- **Admin:** admin@company.com / password
- **HR:** hr@company.com / password
- **Employee:** employee@company.com / password

---

## 📁 Project Structure

```
erp-crm-system/
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Authentication & validation
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Helper functions
│   │   └── server.js       # Entry point
│   ├── .env.example        # Environment template
│   └── package.json
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/            # API integration
│   │   ├── components/     # Reusable components
│   │   ├── context/        # State management
│   │   ├── pages/          # Page components
│   │   ├── routes/         # Routing configuration
│   │   ├── services/       # Frontend services
│   │   ├── styles/         # CSS files
│   │   ├── utils/          # Helper functions
│   │   └── App.jsx         # Main app
│   ├── .env                # Environment config
│   └── package.json
│
├── .gitignore
└── README.md               # This file
```

---

## 👥 User Roles & Permissions

| Role | Key Permissions |
|------|----------------|
| **Admin** | Full system access, user management, system settings |
| **HR** | Employee management, attendance tracking, leave approvals |
| **HoD** (Head of Department) | Department oversight, team management, attendance review |
| **HoP** (Head of Project) | Project management, task assignment, team coordination |
| **Employee** | Personal dashboard, attendance, task management, leave requests |
| **Client** | Project view, billing information, communication |

---

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/erp-crm

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d

# AWS S3 (Optional - for file uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Frontend Environment Variables (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update profile

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Attendance
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics
- `PUT /api/attendance/:id` - Update attendance (HR only)

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:id/approve` - Approve leave
- `PUT /api/leaves/:id/reject` - Reject leave

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks/Work
- `GET /api/tasks` - Get tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Announcements
- `GET /api/announcements` - Get announcements
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update announcement
- `DELETE /api/announcements/:id` - Delete announcement

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

---

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt password encryption
- **Role-Based Access Control** - Granular permissions system
- **Input Validation** - Server-side validation for all inputs
- **CORS Configuration** - Controlled cross-origin requests
- **XSS Protection** - Sanitized user inputs
- **MongoDB Injection Prevention** - Mongoose schema validation

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Run linting
npm run lint
```

---

## 📈 Performance Optimization

- Lazy loading for routes and components
- Image optimization
- API response caching
- Database query optimization with indexes
- Pagination for large datasets
- Debounced search inputs

---

## 🚀 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm install --production
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ folder with a web server
```

### Environment Setup for Production
- Set `NODE_ENV=production`
- Use strong JWT secret
- Configure production MongoDB URI
- Set up CORS for your domain
- Enable HTTPS/SSL

---

## 🗺️ Roadmap

### ✅ Completed
- User authentication & authorization
- Role-based access control
- Attendance management system
- Leave management system
- Project management
- Work assignment system
- Announcements & notifications
- Dashboard analytics
- Workload management

### 🚧 In Progress
- Mobile responsiveness improvements
- Performance optimization
- Advanced reporting

### 📋 Planned
- Email notifications
- Real-time updates with WebSockets
- Mobile application
- Advanced analytics dashboard
- API documentation with Swagger
- Automated testing suite
- CI/CD pipeline

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

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- MERN Stack community
- React Bootstrap team
- MongoDB team
- All open-source contributors

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Contact the development team

---

*Built with ❤️ using MERN Stack*
