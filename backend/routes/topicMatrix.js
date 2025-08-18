const express = require('express');
const router = express.Router();
const authenticateToken = require('../auth');
const { checkRole, checkSameUserOrAdmin, checkCoachAccess } = require('../authRoles');
const TopicMatrix = require('../models/TopicMatrix');
const Users = require('../models/Users');

// All endpoints require authentication
router.use(authenticateToken);

/**
 * GET /api/topic-matrix/:userId/:subject
 * Get topic matrix for a specific user and subject
 * Access: Student (own data), Coach (assigned students), Admin (all)
 */
router.get('/:userId/:subject', async (req, res) => {
  try {
    const { userId, subject } = req.params;
    const requestingUser = req.user;

    // Check access permissions
    if (requestingUser.role === 'student' && requestingUser.userId !== userId) {
      return res.status(403).json({ message: 'Students can only access their own data' });
    }

    if (requestingUser.role === 'coach') {
      const hasAccess = await checkCoachAccess(requestingUser.userId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Coach can only access assigned students' });
      }
    }

    const matrix = await TopicMatrix.findOne({ userId, subject })
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!matrix) {
      return res.status(404).json({ message: 'Topic matrix not found' });
    }

    res.json({
      success: true,
      data: matrix
    });

  } catch (error) {
    console.error('GET /topic-matrix/:userId/:subject error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/topic-matrix
 * Create or update topic matrix
 * Access: Student (own data), Coach (assigned students), Admin (all)
 */
router.post('/', async (req, res) => {
  try {
    const { userId, subject, dayCount, topics, cellColors, columnColors, topicColors } = req.body;
    const requestingUser = req.user;

    // Validate required fields
    if (!userId || !subject || !dayCount || !topics) {
      return res.status(400).json({ message: 'Missing required fields: userId, subject, dayCount, topics' });
    }

    // Check access permissions
    if (requestingUser.role === 'student' && requestingUser.userId !== userId) {
      return res.status(403).json({ message: 'Students can only modify their own data' });
    }

    if (requestingUser.role === 'coach') {
      const hasAccess = await checkCoachAccess(requestingUser.userId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Coach can only modify assigned students data' });
      }
    }

    // Verify target user exists
    const targetUser = await Users.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Convert color objects to Maps for MongoDB
    const cellColorsMap = new Map(Object.entries(cellColors || {}));
    const columnColorsMap = new Map(Object.entries(columnColors || {}).map(([k, v]) => [parseInt(k), v]));
    const topicColorsMap = new Map(Object.entries(topicColors || {}).map(([k, v]) => [parseInt(k), v]));

    // Create or update matrix
    const matrix = await TopicMatrix.findOneAndUpdate(
      { userId, subject },
      {
        userId,
        subject,
        dayCount,
        topics,
        cellColors: cellColorsMap,
        columnColors: columnColorsMap,
        topicColors: topicColorsMap,
        createdBy: requestingUser.userId,
        updatedBy: requestingUser.userId
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    ).populate('userId', 'name email')
     .populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

    res.json({
      success: true,
      data: matrix,
      message: 'Topic matrix saved successfully'
    });

  } catch (error) {
    console.error('POST /topic-matrix error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Topic matrix already exists for this user and subject' });
    }
    
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/topic-matrix/user/:userId
 * Get all topic matrices for a user
 * Access: Student (own data), Coach (assigned students), Admin (all)
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Check access permissions
    if (requestingUser.role === 'student' && requestingUser.userId !== userId) {
      return res.status(403).json({ message: 'Students can only access their own data' });
    }

    if (requestingUser.role === 'coach') {
      const hasAccess = await checkCoachAccess(requestingUser.userId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Coach can only access assigned students' });
      }
    }

    const matrices = await TopicMatrix.find({ userId })
      .populate('userId', 'name email')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ subject: 1, updatedAt: -1 });

    res.json({
      success: true,
      data: matrices
    });

  } catch (error) {
    console.error('GET /topic-matrix/user/:userId error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/topic-matrix/:userId/:subject
 * Delete topic matrix
 * Access: Student (own data), Coach (assigned students), Admin (all)
 */
router.delete('/:userId/:subject', async (req, res) => {
  try {
    const { userId, subject } = req.params;
    const requestingUser = req.user;

    // Check access permissions
    if (requestingUser.role === 'student' && requestingUser.userId !== userId) {
      return res.status(403).json({ message: 'Students can only delete their own data' });
    }

    if (requestingUser.role === 'coach') {
      const hasAccess = await checkCoachAccess(requestingUser.userId, userId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Coach can only delete assigned students data' });
      }
    }

    const result = await TopicMatrix.findOneAndDelete({ userId, subject });

    if (!result) {
      return res.status(404).json({ message: 'Topic matrix not found' });
    }

    res.json({
      success: true,
      message: 'Topic matrix deleted successfully'
    });

  } catch (error) {
    console.error('DELETE /topic-matrix/:userId/:subject error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/topic-matrix/coach/students
 * Get all topic matrices for coach's assigned students
 * Access: Coach only
 */
router.get('/coach/students', checkRole('coach', 'admin'), async (req, res) => {
  try {
    const { subject } = req.query;
    const requestingUser = req.user;

    // Get coach's students
    const CoachStudent = require('../models/CoachStudent');
    const coachStudents = await CoachStudent.find({
      coachId: requestingUser.userId,
      status: 'active'
    }).populate('studentId', 'name email grade');

    const studentIds = coachStudents.map(cs => cs.studentId._id);

    // Build query
    const query = { userId: { $in: studentIds } };
    if (subject) {
      query.subject = subject;
    }

    const matrices = await TopicMatrix.find(query)
      .populate('userId', 'name email grade')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ 'userId.name': 1, subject: 1, updatedAt: -1 });

    res.json({
      success: true,
      data: matrices
    });

  } catch (error) {
    console.error('GET /topic-matrix/coach/students error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;