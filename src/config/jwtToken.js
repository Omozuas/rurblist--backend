const jwt = require('jsonwebtoken');

const issuer = 'rurblist';
const audience = 'rurblist-users';

class jwtToken {
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        roles: user.roles,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
        issuer,
        audience,
      },
    );
  }

  static generateRefreshToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        roles: user.roles,
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer,
        audience,
      },
    );
  }

  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer,
      audience,
    });
  }

  static verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      issuer,
      audience,
    });
  }
}

module.exports = jwtToken;
