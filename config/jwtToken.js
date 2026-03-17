const jwt = require("jsonwebtoken");

class jwtToken {
    // Access token - 1 hour (production standard)
    static generateToken(userId, role, email) {
        return jwt.sign(
            { userId, role, email },
            process.env.JWT_SECRET,
            { 
                expiresIn: "1h",
                issuer: "rurblist",
                audience: "rurblist-users"
            }
        );
    }

    // Refresh token - 7 days
    static generateRefreshToken(userId, role) {
        return jwt.sign(
            { userId, role },
            process.env.JWT_REFRESH_SECRET,
            { 
                expiresIn: "7d",
                issuer: "rurblist",
                audience: "rurblist-users"
            }
        );
    }

    // Verify token
    static verifyToken(token) {
        return jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "rurblist",
            audience: "rurblist-users"
        });
    }

       // Verify token
    static verifyRefreshToken(token) {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
            issuer: "rurblist",
            audience: "rurblist-users"
        });
    }
}

module.exports = jwtToken;
