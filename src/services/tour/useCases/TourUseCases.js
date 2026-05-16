const buildCursorFilter = (cursor, field = 'createdAt') => {
  if (!cursor) return {};

  try {
    const parsed = JSON.parse(cursor);

    return {
      $or: [
        { [field]: { $lt: new Date(parsed.value) } },
        {
          [field]: new Date(parsed.value),
          _id: { $lt: parsed.id },
        },
      ],
    };
  } catch {
    const err = new Error('Invalid cursor format');
    err.statusCode = 400;
    throw err;
  }
};

const buildCursorResponse = (items, limit, field = 'createdAt') => {
  const hasNextPage = items.length > limit;
  const data = hasNextPage ? items.slice(0, limit) : items;
  const lastItem = data[data.length - 1];

  return {
    data,
    hasNextPage,
    nextCursor:
      hasNextPage && lastItem
        ? {
            value: lastItem[field],
            id: lastItem._id,
          }
        : null,
  };
};

const createTour = async (deps, input) => {
  const { Tour, SendEmails } = deps;
  const { user, body } = input;
  const { agentId, propertyId, price, tourType, scheduledAt, note } = body;

  if (!agentId || !propertyId || !price || !tourType || !scheduledAt) {
    const err = new Error('All fields including date & time are required');
    err.statusCode = 400;
    throw err;
  }

  if (price < 1000) {
    const err = new Error('Price cannot be less than 1000');
    err.statusCode = 400;
    throw err;
  }

  const tourDate = new Date(scheduledAt);

  if (isNaN(tourDate.getTime())) {
    const err = new Error('Invalid date');
    err.statusCode = 400;
    throw err;
  }

  if (tourDate < new Date()) {
    const err = new Error('Tour date must be in the future');
    err.statusCode = 400;
    throw err;
  }

  const existingTour = await Tour.findOne({
    agent: agentId,
    date: tourDate,
    type: 'tour',
    status: { $in: ['pending', 'confirmed'] },
  });

  if (existingTour) {
    const err = new Error('This time slot is already booked for this agent');
    err.statusCode = 400;
    throw err;
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const tour = await Tour.create({
    user: user._id,
    agent: agentId,
    property: propertyId,
    type: 'tour',
    tourType,
    date: tourDate,
    price,
    expiresAt,
    note,
  });

  await SendEmails.sendTourBookingPaymentEmail(user.email, user.fullName, tour);

  return {
    message: 'Tour booked successfully. Pay within 24 hours.',
    data: tour,
  };
};

const rescheduleTour = async (deps, input) => {
  const { Tour, SendEmails } = deps;
  const { user, tourId, body } = input;
  const { newDate } = body;

  const tour = await Tour.findById(tourId)
    .populate('user', 'email fullName phoneNumber _id')
    .populate({
      path: 'agent',
      select: '_id user',
      populate: {
        path: 'user',
        select: 'email fullName phoneNumber _id',
      },
    })
    .populate('property', 'location.address title _id');

  if (!tour) {
    const err = new Error('Tour not found');
    err.statusCode = 404;
    throw err;
  }

  if (
    tour.user._id.toString() !== user._id.toString() &&
    tour.agent.user._id.toString() !== user._id.toString()
  ) {
    const err = new Error('Not authorized to reschedule this tour');
    err.statusCode = 403;
    throw err;
  }

  if (tour.status === 'cancelled') {
    const err = new Error('Cannot reschedule a cancelled tour');
    err.statusCode = 400;
    throw err;
  }

  const newTourDate = new Date(newDate);

  if (isNaN(newTourDate.getTime())) {
    const err = new Error('Invalid date');
    err.statusCode = 400;
    throw err;
  }

  if (newTourDate < new Date()) {
    const err = new Error('New date must be in the future');
    err.statusCode = 400;
    throw err;
  }

  const start = new Date(newTourDate.getTime() - 60 * 60 * 1000);
  const end = new Date(newTourDate.getTime() + 60 * 60 * 1000);

  const conflict = await Tour.findOne({
    _id: { $ne: tourId },
    agent: tour.agent._id,
    type: 'tour',
    status: { $in: ['pending', 'confirmed'] },
    date: { $gte: start, $lte: end },
  });

  if (conflict) {
    const err = new Error('New time slot is already booked');
    err.statusCode = 400;
    throw err;
  }

  tour.date = newTourDate;
  tour.status = 'rescheduled';

  await tour.save();

  await Promise.all([
    SendEmails.sendTourRescheduleEmail(tour.user.email, tour.user.fullName, tour),
    SendEmails.sendTourRescheduleEmail(tour.agent.user.email, tour.agent.user.fullName, tour),
  ]);

  return {
    message: 'Tour rescheduled successfully',
    data: tour,
  };
};

const cancelTour = async (deps, input) => {
  const { Tour, SendEmails } = deps;
  const { tourId } = input;

  const tour = await Tour.findById(tourId)
    .populate('user', 'email fullName phoneNumber _id')
    .populate({
      path: 'agent',
      select: '_id user',
      populate: {
        path: 'user',
        select: 'email fullName phoneNumber _id',
      },
    })
    .populate('property', 'location.address title _id');

  if (!tour) {
    const err = new Error('Tour not found');
    err.statusCode = 404;
    throw err;
  }

  if (tour.status === 'cancelled') {
    const err = new Error('Tour already cancelled');
    err.statusCode = 400;
    throw err;
  }

  tour.status = 'cancelled';

  if (!tour.paid) {
    tour.expiresAt = new Date();
  }

  await tour.save();
  await Promise.all([
    SendEmails.sendTourCancelEmail(tour.user.email, tour.user.fullName, tour),
    SendEmails.sendTourCancelEmail(tour.agent.user.email, tour.agent.user.fullName, tour),
  ]);

  return {
    message: 'Tour cancelled successfully',
  };
};

const confirmTour = async (deps, input) => {
  const { Tour, SendEmails } = deps;
  const { tourId, body } = input;
  const { note } = body;

  const tour = await Tour.findById(tourId)
    .populate('user', 'email fullName phoneNumber _id')
    .populate({
      path: 'agent',
      select: '_id user',
      populate: {
        path: 'user',
        select: 'email fullName phoneNumber _id',
      },
    })
    .populate('property', 'location.address title _id');

  if (!tour) {
    const err = new Error('Tour not found');
    err.statusCode = 404;
    throw err;
  }

  if (tour.status === 'cancelled') {
    const err = new Error('Tour already cancelled');
    err.statusCode = 400;
    throw err;
  }

  if (tour.status === 'confirmed') {
    const err = new Error('Tour already confirmed');
    err.statusCode = 400;
    throw err;
  }

  if (!tour.paid) {
    const err = new Error('Cannot confirm unpaid tour');
    err.statusCode = 400;
    throw err;
  }

  tour.status = 'confirmed';
  tour.note = note;

  await tour.save();

  await Promise.all([
    SendEmails.sendTourConfirmedEmail(tour.user.email, tour.user.fullName, tour),
    SendEmails.sendTourConfirmedEmail(tour.agent.user.email, tour.agent.user.fullName, tour),
  ]);

  return {
    success: true,
    message: 'Tour confirmed successfully',
    data: tour,
  };
};

const getUserTours = async (deps, input) => {
  const { Tour } = deps;
  const { user, query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  const tours = await Tour.find({
    user: user._id,
    ...buildCursorFilter(query.cursor),
  })
    .populate('property', 'title location')
    .populate('user', 'fullName email roles profileImage')
    .populate({
      path: 'agent',
      select: 'firstName _id lastName',
      populate: { path: 'user', select: 'fullName email roles profileImage' },
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(tours, limit);

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getAgentTours = async (deps, input) => {
  const { Agent, Tour } = deps;
  const { user, query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  const agent = await Agent.findOne({ user: user._id }).select('_id').lean();

  if (!agent) {
    const err = new Error('Agent profile not found');
    err.statusCode = 404;
    throw err;
  }

  const tours = await Tour.find({
    agent: agent._id,
    ...buildCursorFilter(query.cursor),
  })
    .populate('property', 'title location')
    .populate('user', 'fullName email roles profileImage')
    .populate({
      path: 'agent',
      select: '_id',
      populate: {
        path: 'user',
        select: 'fullName email roles profileImage',
      },
    })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(tours, limit);

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getTourById = async (deps, input) => {
  const { Tour } = deps;
  const { id } = input;

  const tour = await Tour.findById(id)
    .populate('property', 'title location')
    .populate({
      path: 'user',
      select: 'fullName email',
    })
    .populate({
      path: 'agent',
      select: 'lastName firstName',
    });

  if (!tour) {
    const err = new Error('Tour not found');
    err.statusCode = 404;
    throw err;
  }

  return {
    data: tour,
  };
};

const sendMessage = async (deps, input) => {
  const { Conversation, Message } = deps;
  const { user, body } = input;
  const { agentId, text } = body;

  if (!agentId || !text) {
    const err = new Error('agentId and text are required');
    err.statusCode = 400;
    throw err;
  }

  let conversation = await Conversation.findOne({
    user: user._id,
    agent: agentId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      user: user._id,
      agent: agentId,
    });
  }

  const message = await Message.create({
    conversation: conversation._id,
    sender: user._id,
    senderModel: 'User',
    text,
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  return {
    message: 'Message sent successfully',
    data: message,
  };
};

const getMessages = async (deps, input) => {
  const { Message } = deps;
  const { conversationId, query } = input;
  const limit = Math.min(parseInt(query.limit) || 30, 100);

  const messages = await Message.find({
    conversation: conversationId,
    ...buildCursorFilter(query.cursor),
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('sender', 'fullName email')
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(messages, limit);

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getUserConversations = async (deps, input) => {
  const { Conversation } = deps;
  const { user, query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  const conversations = await Conversation.find({
    user: user._id,
    ...buildCursorFilter(query.cursor, 'updatedAt'),
  })
    .populate('agent')
    .populate('lastMessage')
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(
    conversations,
    limit,
    'updatedAt',
  );

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

const getAgentConversations = async (deps, input) => {
  const { Agent, Conversation } = deps;
  const { user, query } = input;
  const limit = Math.min(parseInt(query.limit) || 20, 100);

  const agent = await Agent.findOne({ user: user._id }).select('_id').lean();

  if (!agent) {
    const err = new Error('Agent profile not found');
    err.statusCode = 404;
    throw err;
  }

  const conversations = await Conversation.find({
    agent: agent._id,
    ...buildCursorFilter(query.cursor, 'updatedAt'),
  })
    .populate('user', 'fullName email')
    .populate('lastMessage')
    .sort({ updatedAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const { data, hasNextPage, nextCursor } = buildCursorResponse(
    conversations,
    limit,
    'updatedAt',
  );

  return {
    success: true,
    count: data.length,
    data,
    hasNextPage,
    nextCursor,
  };
};

module.exports = {
  createTour,
  rescheduleTour,
  cancelTour,
  confirmTour,
  getUserTours,
  getAgentTours,
  getTourById,
  sendMessage,
  getMessages,
  getUserConversations,
  getAgentConversations,
};
