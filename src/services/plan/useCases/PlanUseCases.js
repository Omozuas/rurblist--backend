const AppError = require('../../../utils/AppError');
const createPlan = async (deps, input) => {
  const { Plan, slugify } = deps;
  const { body, user } = input;
  const { name, amount, features } = body;

  if (!name) {
    throw new AppError('Plan name is required', 400);
  }

  if (!Array.isArray(features) || features.length === 0) {
    throw new AppError('Features must be a non-empty array', 400);
  }

  const slug = slugify(name, { lower: true });
  const existing = await Plan.findOne({ slug });

  if (existing) {
    throw new AppError('Plan already exists', 400);
  }

  const plan = await Plan.create({
    name,
    slug,
    amount: Number(amount) || 0,
    features,
    createdBy: user._id,
  });

  return {
    success: true,
    message: 'Plan created successfully',
    data: plan,
  };
};

const getPlans = async (deps) => {
  const { Plan } = deps;

  const plans = await Plan.find({ isActive: true })
    .select('-__v -createdAt -updatedAt')
    .sort({ amount: 1 });

  return {
    success: true,
    count: plans.length,
    data: plans,
  };
};

const getPlanById = async (deps, input) => {
  const { Plan, mongoose } = deps;
  const { id } = input;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid plan id', 400);
  }

  const plan = await Plan.findOne({ _id: id, isActive: true }).select('-__v -createdAt -updatedAt');

  if (!plan) {
    const err = new Error('Plan not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    data: plan,
  };
};

module.exports = {
  createPlan,
  getPlans,
  getPlanById,
};
