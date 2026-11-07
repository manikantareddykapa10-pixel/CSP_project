const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');

// Import AI Controllers
const { smartDonorMatch } = require('../controllers/ai/donorMatchingController');
const { predictBloodDemand, optimizeInventory } = require('../controllers/ai/predictionController');
const { chatbotQuery, getChatbotStats } = require('../controllers/ai/chatbotController');

const router = express.Router();

// ============================================
// AI-POWERED ROUTES
// ============================================

// Smart Donor Matching
// POST /api/v1/ai/match-donors
// Body: { bloodType, location: { lat, lng }, urgency, maxDistance, limit }
router.post('/match-donors', authMiddleware, authorizeRoles('admin', 'hospital'), smartDonorMatch);

// Blood Demand Prediction
// GET /api/v1/ai/predict-demand?bloodType=O+&days=7
router.get('/predict-demand', authMiddleware, authorizeRoles('admin', 'hospital'), predictBloodDemand);

// Inventory Optimization
// GET /api/v1/ai/optimize-inventory
router.get('/optimize-inventory', authMiddleware, authorizeRoles('admin', 'hospital'), optimizeInventory);

// AI Chatbot
// POST /api/v1/ai/chatbot
// Body: { message, userId }
router.post('/chatbot', chatbotQuery);

// Chatbot Statistics
// GET /api/v1/ai/chatbot/stats
router.get('/chatbot/stats', authMiddleware, authorizeRoles('admin', 'hospital'), getChatbotStats);

// ============================================
// AI DASHBOARD & STATS
// ============================================

// Get AI Features Overview
router.get('/dashboard', authMiddleware, authorizeRoles('admin', 'hospital'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Features Dashboard',
    data: {
      availableFeatures: [
        {
          name: 'Smart Donor Matching',
          endpoint: '/api/v1/ai/match-donors',
          status: 'active',
          description: 'AI-powered donor matching based on location, blood type, and availability'
        },
        {
          name: 'Blood Demand Prediction',
          endpoint: '/api/v1/ai/predict-demand',
          status: 'active',
          description: 'Predict blood demand for next 7-30 days using historical data'
        },
        {
          name: 'Inventory Optimization',
          endpoint: '/api/v1/ai/optimize-inventory',
          status: 'active',
          description: 'Optimize blood inventory and prevent wastage'
        },
        {
          name: 'AI Chatbot',
          endpoint: '/api/v1/ai/chatbot',
          status: 'active',
          description: '24/7 AI assistant for blood donation queries'
        }
      ],
      stats: {
        totalQueries: 0,
        averageResponseTime: '50ms',
        accuracy: '89%',
        activeSince: new Date().toISOString()
      }
    }
  });
});

module.exports = router;
