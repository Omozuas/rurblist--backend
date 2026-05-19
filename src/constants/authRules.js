const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const phoneRegex = /^(?:\+234|0)[789][01]\d{8}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const minPasswordLength = 8;
const allowedSignupRoles = ['Home_Seeker', 'Agent'];

module.exports = {
  emailRegex,
  phoneRegex,
  strongPasswordRegex,
  minPasswordLength,
  allowedSignupRoles,
};
