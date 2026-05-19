const express = require('express');
const v1 = express.Router();

// Auth (new v1 auth with validators for some endpoints)
const authRoutesV1 = require('./auth.routes.v1');
v1.use('/auth', authRoutesV1);

// Users
const userRoutesV1 = require('./user.routes.v1');
v1.use('/user', userRoutesV1);

// KYC
const kycRoutesV1 = require('./kyc.routes.v1');
v1.use('/kyc', kycRoutesV1);

// Properties
const propertyRoutesV1 = require('./property.routes.v1');
v1.use('/property', propertyRoutesV1);

// Agents
const agentRoutesV1 = require('./agent.routes.v1');
v1.use('/agent', agentRoutesV1);

// Tours
const tourRoutesV1 = require('./tour.routes.v1');
v1.use('/tours', tourRoutesV1);

// Payments
const paymentRoutesV1 = require('./payment.routes.v1');
v1.use('/payments', paymentRoutesV1);

// Plans
const planRoutesV1 = require('./plan.routes.v1');
v1.use('/plans', planRoutesV1);

// Verifications
const verificationRoutesV1 = require('./verification.routes.v1');
v1.use('/verifications', verificationRoutesV1);

module.exports = v1;
