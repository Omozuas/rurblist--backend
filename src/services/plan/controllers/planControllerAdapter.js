const asynchandler = require('express-async-handler');
const mongoose = require('mongoose');
const slugify = require('slugify');

const Plan = require('../../../models/PlanPricing');
const PlanContract = require('../contracts/planContract');

module.exports = {
  createPlan: asynchandler(async (req, res) => {
    const result = await PlanContract.createPlan(
      {
        Plan,
        slugify,
      },
      {
        body: req.body,
        user: req.user,
      },
    );

    return res.status(201).json(result);
  }),

  getPlans: asynchandler(async (req, res) => {
    const result = await PlanContract.getPlans({ Plan }, {});
    return res.status(200).json(result);
  }),

  getPlanById: asynchandler(async (req, res) => {
    const result = await PlanContract.getPlanById(
      {
        Plan,
        mongoose,
      },
      { id: req.params.id },
    );

    return res.status(200).json(result);
  }),
};
