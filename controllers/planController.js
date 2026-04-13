const Plan = require('../models/Plan');
const slugify = require('slugify');
const asynchandler = require('express-async-handler');

class PlanController {
  static createPlan = asynchandler(async (req, res) => {
    const { name, amount, features } = req.body;

    if (!name) {
      res.status(400);
      throw new Error('Plan name is required');
    }

    if (!Array.isArray(features) || features.length === 0) {
      res.status(400);
      throw new Error('Features must be a non-empty array');
    }

    const slug = slugify(name, { lower: true });

    // prevent duplicate
    const existing = await Plan.findOne({ slug });

    if (existing) {
      res.status(400);
      throw new Error('Plan already exists');
    }

    const plan = await Plan.create({
      name,
      slug,
      amount: Number(amount) || 0,
      features,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  });

  static getPlans = asynchandler(async (req, res) => {
    const plans = await Plan.find({ isActive: true })
      .select('-__v -createdAt -updatedAt')
      .sort({ amount: 1 });

    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  });
}

module.exports = PlanController;
