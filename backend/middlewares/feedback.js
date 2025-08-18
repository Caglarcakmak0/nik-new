const CoachStudent = require('../models/CoachStudent');

// Koçların feedback endpoint'lerine erişimini engeller
const blockCoachFromFeedback = (req, res, next) => {
  try {
    const role = req.user?.role;
    const path = req.path || '';
    if (role === 'coach' && path.includes('feedback')) {
      return res.status(403).json({ message: 'Bu alana erişiminiz yok' });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Öğrenci sadece aktif koçunu değerlendirebilir
const validateOwnCoach = async (req, res, next) => {
  try {
    const studentId = req.user?.userId;
    const coachId = req.body?.coachId || req.query?.coachId;

    if (!coachId) {
      return res.status(400).json({ message: 'coachId gereklidir' });
    }

    const relation = await CoachStudent.findOne({
      studentId,
      coachId,
      status: 'active'
    });

    if (!relation) {
      return res.status(400).json({ message: 'Bu koç size atanmamış' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { blockCoachFromFeedback, validateOwnCoach };


