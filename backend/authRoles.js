const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        // Önce authentication kontrolü
        if (!req.user) {
            return res.status(401).json({ 
                message: "Bu işlem için giriş yapmanız gerekiyor" 
            });
        }

        // Role kontrolü
        const userRole = req.user.role || 'student'; // JWT'den gelen role
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ 
                message: "Bu işlem için yetkiniz yok",
                requiredRoles: allowedRoles,
                yourRole: userRole
            });
        }

        next();
    };
};

// Kullanıcı kendi verisini görebilir veya admin her şeyi görebilir
const checkSameUserOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: "Bu işlem için giriş yapmanız gerekiyor" 
        });
    }

    const requestedUserId = req.params.id;
    const currentUserId = req.user.userId;
    const userRole = req.user.role || 'student';

    // Admin her şeyi görebilir
    if (userRole === 'admin') {
        return next();
    }

    // Kullanıcı sadece kendi verisini görebilir
    if (requestedUserId === currentUserId) {
        return next();
    }

    return res.status(403).json({ 
        message: "Bu kullanıcının verilerini görme yetkiniz yok" 
    });
};

// Koç kendi öğrencilerini görebilir
const checkCoachAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: "Bu işlem için giriş yapmanız gerekiyor" 
        });
    }

    const userRole = req.user.role || 'student';
    
    if (userRole === 'admin') {
        return next(); // Admin her şeyi görebilir
    }

    if (userRole === 'coach') {
        // Koç sadece kendi öğrencilerini görebilir
        // Bu kontrol endpoint'te yapılacak
        req.coachFilter = { coachId: req.user.userId };
        return next();
    }

    return res.status(403).json({ 
        message: "Bu işlem için koç veya admin olmanız gerekiyor" 
    });
};

module.exports = {
    checkRole,
    checkSameUserOrAdmin,
    checkCoachAccess
};