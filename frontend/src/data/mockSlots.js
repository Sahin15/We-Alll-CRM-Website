// Mock data for Slot + Calendar System
// This will be replaced with real API calls later

// Mock Clients
export const mockClients = [
  {
    _id: "client1",
    name: "ABC Restaurant",
    company: "ABC Restaurant Pvt Ltd",
    email: "contact@abcrestaurant.com",
    phone: "9876543210",
  },
  {
    _id: "client2",
    name: "XYZ Fashion Store",
    company: "XYZ Fashion Pvt Ltd",
    email: "info@xyzfashion.com",
    phone: "9876543211",
  },
  {
    _id: "client3",
    name: "Tech Solutions Inc",
    company: "Tech Solutions Inc",
    email: "hello@techsolutions.com",
    phone: "9876543212",
  },
];

// Mock Employees
export const mockEmployees = [
  {
    _id: "emp1",
    name: "Sarah Johnson",
    email: "sarah@wealll.com",
    role: "employee",
    designation: "Senior Graphic Designer",
    profilePicture: null,
  },
  {
    _id: "emp2",
    name: "John Doe",
    email: "john@wealll.com",
    role: "employee",
    designation: "Video Editor",
    profilePicture: null,
  },
  {
    _id: "emp3",
    name: "Emily Chen",
    email: "emily@wealll.com",
    role: "employee",
    designation: "Content Writer",
    profilePicture: null,
  },
  {
    _id: "emp4",
    name: "Michael Brown",
    email: "michael@wealll.com",
    role: "employee",
    designation: "Social Media Manager",
    profilePicture: null,
  },
  {
    _id: "emp5",
    name: "Lisa Anderson",
    email: "lisa@wealll.com",
    role: "employee",
    designation: "Graphic Designer",
    profilePicture: null,
  },
];

// Mock Projects with Project Heads
export const mockProjects = [
  {
    _id: "proj1",
    name: "ABC Restaurant - Instagram Marketing Q1 2025",
    client: mockClients[0],
    projectHead: mockEmployees[3], // Michael Brown
    description: "Complete Instagram marketing campaign for Q1 2025",
    startDate: "2025-01-01",
    endDate: "2025-03-31",
    status: "In Progress",
    assignedUsers: [mockEmployees[0], mockEmployees[1], mockEmployees[2]],
  },
  {
    _id: "proj2",
    name: "XYZ Fashion - Social Media Campaign",
    client: mockClients[1],
    projectHead: mockEmployees[3], // Michael Brown
    description: "Multi-platform social media campaign for fashion brand",
    startDate: "2025-01-15",
    endDate: "2025-06-30",
    status: "In Progress",
    assignedUsers: [mockEmployees[0], mockEmployees[4]],
  },
  {
    _id: "proj3",
    name: "Tech Solutions - LinkedIn Content Strategy",
    client: mockClients[2],
    projectHead: mockEmployees[3], // Michael Brown
    description: "Professional LinkedIn content strategy and execution",
    startDate: "2025-02-01",
    endDate: "2025-05-31",
    status: "Pending",
    assignedUsers: [mockEmployees[2], mockEmployees[4]],
  },
];

// Mock Slots (Content pieces)
export const mockSlots = [
  // ABC Restaurant - Instagram Marketing
  {
    _id: "slot1",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "Reel",
    platforms: ["Instagram", "Facebook"],
    contentBucket: "Festival Post",
    occasion: "Diwali 2025",
    brief: "15-second reel showing chef preparing special Diwali sweets, upbeat music, text overlay with 20% discount offer",
    caption: "✨ Celebrate Diwali with our special traditional sweets! 🪔\n\nGet 20% OFF on all festive orders this week! 🎉\n\nVisit us today and make your celebrations sweeter! 🍬",
    hashtags: "#Diwali2025 #FestiveVibes #ABCRestaurant #DiwaliSweets #FestiveOffer #TraditionalFood #CelebrationTime",
    assignedTo: mockEmployees[1], // John Doe (Video Editor)
    designDeadline: "2025-11-10",
    postingDate: "2025-11-12",
    designStatus: "In Design",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: ["https://example.com/diwali-inspiration"],
    comments: [
      {
        user: mockEmployees[3],
        text: "Please use warm colors and traditional music",
        timestamp: "2025-11-05T10:30:00Z",
      },
    ],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-01T09:00:00Z",
    updatedAt: "2025-11-05T10:30:00Z",
  },
  {
    _id: "slot2",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "SMP",
    platforms: ["Instagram"],
    contentBucket: "Brand Promotion",
    occasion: "Weekend Special",
    brief: "High-quality food photography of signature pasta dish with garnish, natural lighting, rustic background",
    caption: "Weekend cravings sorted! 🍝\n\nTry our signature Creamy Alfredo Pasta - made with love and the finest ingredients! ❤️\n\nBook your table now! 📞",
    hashtags: "#WeekendVibes #PastaLover #ABCRestaurant #FoodPhotography #Foodie #ItalianCuisine #FoodPorn",
    assignedTo: mockEmployees[0], // Sarah Johnson (Designer)
    designDeadline: "2025-11-28",
    postingDate: "2025-11-30",
    designStatus: "Ready for Review",
    postingStatus: "Scheduled",
    creatives: [
      {
        type: "image",
        url: "https://example.com/pasta-image.jpg",
        uploadedAt: "2025-11-27T14:20:00Z",
      },
    ],
    referenceLinks: [],
    comments: [
      {
        user: mockEmployees[0],
        text: "Design completed! Please review.",
        timestamp: "2025-11-27T14:25:00Z",
      },
    ],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-20T11:00:00Z",
    updatedAt: "2025-11-27T14:25:00Z",
  },
  {
    _id: "slot3",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "Story",
    platforms: ["Instagram"],
    contentBucket: "Engagement Post",
    occasion: "Daily Story",
    brief: "Behind-the-scenes story showing kitchen preparation, add poll asking 'What should we cook next?'",
    caption: "Good morning foodies! 🌅\n\nOur chefs are already at work! What would you like to see on our menu next? Vote now! 👨‍🍳",
    hashtags: "#BehindTheScenes #ABCRestaurant #KitchenLife #ChefLife",
    assignedTo: mockEmployees[1], // John Doe
    designDeadline: "2025-11-26",
    postingDate: "2025-11-27",
    designStatus: "Approved",
    postingStatus: "Posted",
    creatives: [
      {
        type: "video",
        url: "https://example.com/kitchen-story.mp4",
        uploadedAt: "2025-11-26T08:00:00Z",
      },
    ],
    referenceLinks: [],
    comments: [
      {
        user: mockEmployees[3],
        text: "Looks great! Approved for posting.",
        timestamp: "2025-11-26T09:00:00Z",
      },
    ],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-24T10:00:00Z",
    updatedAt: "2025-11-27T07:00:00Z",
  },
  {
    _id: "slot4",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "Carousel",
    platforms: ["Instagram", "Facebook"],
    contentBucket: "Service Highlight",
    occasion: "Menu Launch",
    brief: "5-slide carousel showcasing new winter menu items, each slide with one dish, final slide with 'Visit Us' CTA",
    caption: "🍂 Winter Menu is HERE! 🍂\n\nSwipe to explore our cozy new dishes perfect for the season! ➡️\n\nWhich one are you trying first? Comment below! 👇",
    hashtags: "#WinterMenu #NewLaunch #ABCRestaurant #WinterFood #ComfortFood #FoodLovers #MenuUpdate",
    assignedTo: mockEmployees[0], // Sarah Johnson
    designDeadline: "2025-12-01",
    postingDate: "2025-12-05",
    designStatus: "Planned",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: ["https://example.com/winter-menu-inspiration"],
    comments: [],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-25T15:00:00Z",
    updatedAt: "2025-11-25T15:00:00Z",
  },
  {
    _id: "slot5",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "Reel",
    platforms: ["Instagram", "Facebook"],
    contentBucket: "Customer Testimonial",
    occasion: "Customer Appreciation",
    brief: "Short reel featuring happy customers enjoying food, overlay with positive reviews, upbeat background music",
    caption: "Our customers = Our happiness! 😊❤️\n\nThank you for all the love and support! Your smiles make our day! 🌟\n\n#CustomerLove #ABCRestaurant",
    hashtags: "#CustomerReview #HappyCustomers #ABCRestaurant #Testimonial #FoodLove #CustomerAppreciation",
    assignedTo: mockEmployees[1], // John Doe
    designDeadline: "2025-11-22",
    postingDate: "2025-11-25",
    designStatus: "Revision Needed",
    postingStatus: "Scheduled",
    creatives: [
      {
        type: "video",
        url: "https://example.com/testimonial-v1.mp4",
        uploadedAt: "2025-11-21T16:00:00Z",
      },
    ],
    referenceLinks: [],
    comments: [
      {
        user: mockEmployees[3],
        text: "Good start! Please add more customer close-ups and increase music volume.",
        timestamp: "2025-11-22T10:00:00Z",
      },
    ],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-18T12:00:00Z",
    updatedAt: "2025-11-22T10:00:00Z",
  },

  // XYZ Fashion - Social Media Campaign
  {
    _id: "slot6",
    client: mockClients[1],
    project: mockProjects[1],
    postType: "SMP",
    platforms: ["Instagram", "Pinterest"],
    contentBucket: "Brand Promotion",
    occasion: "New Collection Launch",
    brief: "Elegant product photography of winter collection dress, model in natural pose, minimalist background",
    caption: "Elegance meets comfort in our new Winter Collection! ❄️✨\n\nShop now and get 15% OFF on your first purchase! 🛍️\n\nLink in bio! 👆",
    hashtags: "#WinterFashion #NewCollection #XYZFashion #FashionStyle #WinterWear #ShopNow #FashionTrends",
    assignedTo: mockEmployees[0], // Sarah Johnson
    designDeadline: "2025-12-03",
    postingDate: "2025-12-06",
    designStatus: "Planned",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: ["https://example.com/fashion-inspiration"],
    comments: [],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-26T09:00:00Z",
    updatedAt: "2025-11-26T09:00:00Z",
  },
  {
    _id: "slot7",
    client: mockClients[1],
    project: mockProjects[1],
    postType: "Reel",
    platforms: ["Instagram", "Facebook"],
    contentBucket: "Engagement Post",
    occasion: "Fashion Tips",
    brief: "Quick 20-second reel showing 3 ways to style one dress, trendy music, text overlays with styling tips",
    caption: "One dress, THREE stunning looks! 👗✨\n\nWhich style is your favorite? 1, 2, or 3? Comment below! 💬\n\n#FashionTips #StylingIdeas #XYZFashion",
    hashtags: "#FashionReel #StylingTips #XYZFashion #FashionHacks #OOTD #FashionInspo #TrendingNow",
    assignedTo: mockEmployees[1], // John Doe
    designDeadline: "2025-12-08",
    postingDate: "2025-12-10",
    designStatus: "Planned",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: [],
    comments: [],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-26T10:00:00Z",
    updatedAt: "2025-11-26T10:00:00Z",
  },

  // Tech Solutions - LinkedIn Content
  {
    _id: "slot8",
    client: mockClients[2],
    project: mockProjects[2],
    postType: "SMP",
    platforms: ["LinkedIn"],
    contentBucket: "Educational Content",
    occasion: "Tech Tips Tuesday",
    brief: "Professional infographic about cloud computing benefits, clean design, corporate colors, easy to read",
    caption: "☁️ Why Cloud Computing is Essential for Modern Businesses\n\n5 Key Benefits:\n1. Scalability\n2. Cost Efficiency\n3. Remote Access\n4. Data Security\n5. Automatic Updates\n\nIs your business cloud-ready? Let's discuss! 💼\n\n#TechTips #CloudComputing #TechSolutions",
    hashtags: "#CloudComputing #TechTips #BusinessTechnology #DigitalTransformation #TechSolutions #ITServices",
    assignedTo: mockEmployees[4], // Lisa Anderson
    designDeadline: "2025-12-02",
    postingDate: "2025-12-03",
    designStatus: "In Design",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: ["https://example.com/cloud-infographic-examples"],
    comments: [],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-26T11:00:00Z",
    updatedAt: "2025-11-26T11:00:00Z",
  },

  // Overdue example
  {
    _id: "slot9",
    client: mockClients[0],
    project: mockProjects[0],
    postType: "SMP",
    platforms: ["Instagram"],
    contentBucket: "Promotional Offer",
    occasion: "Flash Sale",
    brief: "Eye-catching design for flash sale announcement, bold colors, clear discount percentage",
    caption: "⚡ FLASH SALE ALERT! ⚡\n\n50% OFF for the next 24 hours ONLY! 🔥\n\nDon't miss out! Order now! 📲",
    hashtags: "#FlashSale #LimitedOffer #ABCRestaurant #Sale #Discount #OrderNow",
    assignedTo: mockEmployees[0], // Sarah Johnson
    designDeadline: "2025-11-20", // OVERDUE
    postingDate: "2025-11-22", // OVERDUE
    designStatus: "In Design",
    postingStatus: "Scheduled",
    creatives: [],
    referenceLinks: [],
    comments: [
      {
        user: mockEmployees[3],
        text: "This is urgent! Please prioritize.",
        timestamp: "2025-11-21T09:00:00Z",
      },
    ],
    createdBy: mockEmployees[3],
    createdAt: "2025-11-15T14:00:00Z",
    updatedAt: "2025-11-21T09:00:00Z",
  },
];

// Helper function to get slots by project
export const getSlotsByProject = (projectId) => {
  return mockSlots.filter((slot) => slot.project._id === projectId);
};

// Helper function to get slots by employee
export const getSlotsByEmployee = (employeeId) => {
  return mockSlots.filter((slot) => slot.assignedTo._id === employeeId);
};

// Helper function to get slots by status
export const getSlotsByStatus = (status) => {
  return mockSlots.filter((slot) => slot.designStatus === status);
};

// Helper function to get slots by date range
export const getSlotsByDateRange = (startDate, endDate) => {
  return mockSlots.filter((slot) => {
    const postingDate = new Date(slot.postingDate);
    return postingDate >= new Date(startDate) && postingDate <= new Date(endDate);
  });
};

// Helper function to get overdue slots
export const getOverdueSlots = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return mockSlots.filter((slot) => {
    const designDeadline = new Date(slot.designDeadline);
    const postingDate = new Date(slot.postingDate);
    
    // Overdue if design deadline passed and not approved
    const designOverdue = designDeadline < today && 
                         slot.designStatus !== "Approved" && 
                         slot.designStatus !== "Posted";
    
    // Overdue if posting date passed and not posted
    const postingOverdue = postingDate < today && 
                          slot.postingStatus !== "Posted";
    
    return designOverdue || postingOverdue;
  });
};

// Helper function to get slot statistics
export const getSlotStatistics = (projectId = null) => {
  const slots = projectId ? getSlotsByProject(projectId) : mockSlots;
  
  return {
    total: slots.length,
    planned: slots.filter((s) => s.designStatus === "Planned").length,
    inDesign: slots.filter((s) => s.designStatus === "In Design").length,
    readyForReview: slots.filter((s) => s.designStatus === "Ready for Review").length,
    approved: slots.filter((s) => s.designStatus === "Approved").length,
    revisionNeeded: slots.filter((s) => s.designStatus === "Revision Needed").length,
    posted: slots.filter((s) => s.postingStatus === "Posted").length,
    overdue: getOverdueSlots().filter((s) => !projectId || s.project._id === projectId).length,
    completionRate: slots.length > 0 
      ? Math.round((slots.filter((s) => s.postingStatus === "Posted").length / slots.length) * 100)
      : 0,
  };
};

// Status color mapping for UI
export const statusColors = {
  Planned: "#6c757d", // Gray
  "In Design": "#ffc107", // Yellow
  "Ready for Review": "#fd7e14", // Orange
  Approved: "#28a745", // Green
  "Revision Needed": "#dc3545", // Red
  Posted: "#6f42c1", // Purple
  Overdue: "#dc3545", // Red
};

// Post type options
export const postTypes = [
  "SMP", // Single Media Post
  "Reel",
  "Story",
  "Carousel",
  "Video Post",
  "Text Post",
  "Poll",
];

// Platform options
export const platforms = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "Twitter",
  "YouTube",
  "Pinterest",
];

// Content bucket options
export const contentBuckets = [
  "Brand Promotion",
  "Festival Post",
  "Service Highlight",
  "Customer Testimonial",
  "Educational Content",
  "Behind the Scenes",
  "Engagement Post",
  "Promotional Offer",
];

// Design status options
export const designStatuses = [
  "Planned",
  "In Design",
  "Ready for Review",
  "Approved",
  "Revision Needed",
];

// Posting status options
export const postingStatuses = [
  "Scheduled",
  "Posted",
  "Failed",
];
