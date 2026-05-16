const AppError = require('../../../utils/AppError');

const convertToSmallestUnit = (amount, currency) => {
  const zeroDecimalCurrencies = [];
  if (zeroDecimalCurrencies.includes(currency)) return amount;
  return amount * 100;
};

const buildPaystackChannels = (paymentMethod) => {
  return paymentMethod ? [paymentMethod] : undefined;
};

const sendReceiptIfNeeded = async (deps, payment) => {
  const { SendEmails, generateReceiptBuffer } = deps;

  if (payment.receiptSent) return;

  const pdfBuffer = await generateReceiptBuffer(payment);

  await SendEmails.sendPaymentReceiptEmail(
    payment.user.email,
    payment.user.fullName,
    payment,
    pdfBuffer,
  );

  payment.receiptSent = true;
  await payment.save();
};

const payForTour = async (deps, input) => {
  const { Payment, Tour, axios, crypto, paystackBaseUrl } = deps;
  const { tourId, body, user } = input;
  const { currency = 'NGN', paymentMethod } = body;

  const tour = await Tour.findById(tourId).populate('property').populate('agent');

  if (!tour) {
    throw new AppError('Tour not found', 404);
  }

  if (tour.paid) {
    throw new AppError('Tour already paid', 400);
  }

  if (tour.user.toString() !== user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }

  const reference = crypto.randomBytes(20).toString('hex');
  let payment = null;

  try {
    payment = await Payment.create({
      user: user._id,
      agent: tour.agent,
      property: tour.property,
      tour: tour._id,
      paymentFor: 'tour',
      amount: tour.price,
      currency,
      reference,
      status: 'pending',
    });

    const payload = {
      email: user.email,
      amount: convertToSmallestUnit(tour.price, currency),
      currency,
      reference,
      metadata: {
        paymentId: payment._id,
        type: 'tour',
        userName: user.fullName,
        userPhone: user.phoneNumber,
      },
      callback_url: `${process.env.FRONTEND_URL}/payment-tour/success`,
    };

    const channels = buildPaystackChannels(paymentMethod);
    if (channels) payload.channels = channels;

    const response = await axios.post(`${paystackBaseUrl}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
      timeout: 30000,
    });

    return {
      success: true,
      message: 'Payment initialized',
      data: response.data.data,
    };
  } catch (error) {
    if (payment?._id) {
      await Payment.deleteOne({ _id: payment._id, status: 'pending' });
    }

    throw new AppError(
      `Payment initialization failed:${error.response?.data?.message || error.message}`,
      error.response?.status || 500,
      error.response?.data || null,
    );
  }
};

const payForProperty = async (deps, input) => {
  const { Payment, Property, Plan, Verification, axios, crypto, paystackBaseUrl } = deps;
  const { propertyId, body, user } = input;
  const { currency = 'NGN', planId, enscrowFee, paymentMethod } = body;

  const property = await Property.findById(propertyId).populate('owner');

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const parsedEscrowFee = Number(enscrowFee || 0);

  if (Number.isNaN(parsedEscrowFee) || parsedEscrowFee < 0) {
    throw new AppError('Invalid enscrowFee', 400);
  }

  const propertyPrice = Number(property.price || 0);
  const agentFee = Number(property.agentFee || 0);

  if (Number.isNaN(propertyPrice) || Number.isNaN(agentFee)) {
    throw new AppError('Invalid property pricing data', 400);
  }

  let totalAmount = propertyPrice + agentFee + parsedEscrowFee;
  let selectedPlan = null;

  if (planId) {
    const plan = await Plan.findById(planId);

    if (!plan || !plan.isActive) {
      throw new AppError('Invalid plan', 400);
    }

    totalAmount += Number(plan.amount || 0);
    selectedPlan = plan;
  }

  if (!totalAmount || Number.isNaN(totalAmount) || totalAmount <= 0) {
    throw new AppError('Invalid total amount', 400);
  }

  const reference = crypto.randomBytes(20).toString('hex');

  const payment = await Payment.create({
    user: user._id,
    agent: property.owner,
    property: property._id,
    paymentFor: 'property',
    amount: totalAmount,
    currency,
    reference,
    enscrowFee: parsedEscrowFee,
    status: 'pending',
    plan: selectedPlan ? selectedPlan._id : null,
  });

  const verification = await Verification.create({
    user: user._id,
    agent: property.owner,
    property: property._id,
    payment: payment._id,
    status: 'pending',
    currentStage: {
      title: 'Payment Pending',
      description: 'Waiting for payment confirmation',
      estimatedCompletion: null,
    },
    documents: [
      {
        name: 'Certificate of Occupancy',
        status: 'pending',
      },
      {
        name: 'Survey Plan',
        status: 'pending',
      },
      {
        name: 'Deed of Assignment',
        status: 'pending',
      },
    ],
    timeline: [
      {
        title: 'Payment Initiated',
        description: 'Property verification payment has been initiated',
        status: 'info',
        date: new Date(),
      },
    ],
  });

  payment.verification = verification._id;
  await payment.save();

  const payload = {
    email: user.email,
    amount: convertToSmallestUnit(totalAmount, currency),
    currency,
    reference,
    metadata: {
      paymentId: payment._id.toString(),
      type: 'property',
      userName: user.fullName,
      userPhone: user.phoneNumber,
      propertyId: property._id.toString(),
      planId: selectedPlan ? selectedPlan._id.toString() : null,
      enscrowFee: parsedEscrowFee,
      agentFee: property.agentFee || 0,
      propertyPrice: property.price,
    },
    callback_url: `${process.env.FRONTEND_URL}/payment-tour/success`,
  };

  const channels = buildPaystackChannels(paymentMethod);
  if (channels) payload.channels = channels;

  try {
    const response = await axios.post(`${paystackBaseUrl}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return {
      success: true,
      message: 'Payment initialized',
      data: response.data.data,
    };
  } catch (error) {
    console.error('Paystack Property Init Error:', {
      status: error.response?.status,
      data: error.response?.data,
      reference,
      paymentId: payment._id,
      paymentFor: payment.paymentFor,
    });

    await Verification.deleteOne({ _id: verification._id, status: 'pending' });
    await Payment.deleteOne({ _id: payment._id, status: 'pending' });

    throw new AppError(
      `Payment initialization failed:${error.response?.data?.message || error.message}`,
      error.response?.status || 500,
      error.response?.data || null,
    );
  }
};

const verifyPayment = async (deps, input) => {
  const {
    Payment,
    Property,
    Tour,
    HomeSeeker,
    Verification,
    SendEmails,
    generateReceiptBuffer,
    axios,
    paystackBaseUrl,
  } = deps;
  const { reference } = input;

  if (!reference) {
    throw new AppError('Payment reference is required', 400);
  }

  const response = await axios.get(`${paystackBaseUrl}/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
    timeout: 30000,
  });

  const data = response.data.data;

  const payment = await Payment.findOne({ reference })
    .populate('user', 'fullName email phoneNumber _id')
    .populate('property')
    .populate('plan')
    .populate('tour');

  if (!payment) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    throw err;
  }

  if (data.status !== 'success') {
    if (payment.status !== 'success') {
      payment.status = 'failed';
      await payment.save();
    }
    throw new AppError('Payment verification failed', 400);
  }

  if (payment.status === 'success') {
    if (!payment.receiptSent) {
      try {
        await sendReceiptIfNeeded({ SendEmails, generateReceiptBuffer }, payment);
      } catch (err) {
        console.error('Receipt email failed:', {
          message: err.message,
          paymentId: payment._id,
          reference: payment.reference,
        });
      }
    }

    return {
      success: true,
      message: 'Payment already verified',
      data: payment,
    };
  }

  payment.status = 'success';
  payment.transactionId = data.id;
  payment.paymentMethod = data.channel;
  payment.paidAt = payment.paidAt || new Date();
  payment.metadata = data.metadata;

  await payment.save();

  if (payment.plan) {
    const homeSeeker = await HomeSeeker.findOne({
      user: payment.user._id,
    });

    if (homeSeeker && !homeSeeker.isPlanActive) {
      homeSeeker.plan = payment.plan;
      homeSeeker.isPlanActive = true;
      homeSeeker.planActivatedAt = new Date();
      await homeSeeker.save();
      await SendEmails.sendPlanActivationEmail(
        payment.user.email,
        payment.user.fullName,
        payment.plan,
      );
    }
  }

  if (payment.paymentFor === 'property') {
    const property = await Property.findById(payment.property);

    if (property && !property.isSold) {
      property.isSold = true;
      await property.save();
    }

    const verification = await Verification.findOne({ payment: payment._id });

    if (verification && verification.status === 'pending') {
      verification.status = 'documents_under_review';

      verification.currentStage = {
        title: 'Documents under Review',
        description: 'Our team is verifying property documents',
        estimatedCompletion: '2-3 business days',
      };

      verification.timeline.push(
        {
          title: 'Payment Received and Confirmed',
          description: 'Your property verification payment was confirmed',
          status: 'success',
          date: new Date(),
        },
        {
          title: 'Verification Process Initiated',
          description: 'Property verification has started',
          status: 'success',
          date: new Date(),
        },
      );

      await verification.save();
    }
  }

  if (payment.paymentFor === 'tour') {
    const tour = await Tour.findById(payment.tour);

    if (tour && !tour.paid) {
      tour.paid = true;
      tour.status = 'paid';
      tour.expiresAt = null;
      await tour.save();
    }
  }

  if (!payment.receiptSent) {
    try {
      await sendReceiptIfNeeded({ SendEmails, generateReceiptBuffer }, payment);
    } catch (err) {
      console.error('Receipt email failed:', {
        message: err.message,
        paymentId: payment._id,
        reference: payment.reference,
      });
    }
  }

  return {
    success: true,
    message: 'Payment verified',
    data: payment,
  };
};

const webhook = async (deps, input) => {
  const { Payment, crypto, secret } = deps;
  const { body, signature } = input;

  const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

  if (hash !== signature) {
    return {
      statusCode: 400,
      body: 'Invalid signature',
    };
  }

  let event;

  try {
    event = JSON.parse(body.toString());
  } catch {
    return {
      statusCode: 400,
      body: 'Invalid webhook payload',
    };
  }

  const data = event.data;

  if (!data?.reference) {
    return {
      statusCode: 400,
      body: 'Missing payment reference',
    };
  }

  const payment = await Payment.findOne({ reference: data.reference });

  if (!payment) {
    return {
      statusCode: 200,
    };
  }

  return {
    statusCode: 200,
    event,
    paymentId: payment._id,
    reference: data.reference,
  };
};

const processWebhook = async (deps, input) => {
  const { Payment, Property, Tour, HomeSeeker, Verification, SendEmails, generateReceiptBuffer } =
    deps;
  const { event, paymentId } = input;

  try {
    const data = event.data;

    const payment = await Payment.findById(paymentId)
      .populate('user', 'fullName email phoneNumber')
      .populate('property')
      .populate({
        path: 'agent',
        populate: {
          path: 'user',
          select: 'fullName email phoneNumber _id',
        },
      })
      .populate('plan')
      .populate('tour');

    if (!payment) return;

    if (payment.webhookProcessed) return;

    if (event.event === 'charge.success') {
      payment.status = 'success';
      payment.transactionId = data.id;
      payment.paidAt = payment.paidAt || new Date();
      payment.paymentMethod = data.channel;
      payment.metadata = data.metadata;

      await payment.save();

      if (payment.paymentFor === 'property') {
        const property = await Property.findById(payment.property);

        if (property && !property.isSold) {
          property.isSold = true;
          await property.save();
        }

        const verification = await Verification.findOne({ payment: payment._id });

        if (verification && verification.status === 'pending') {
          verification.status = 'documents_under_review';

          verification.currentStage = {
            title: 'Documents under Review',
            description: 'Our team is verifying property documents',
            estimatedCompletion: '2-3 business days',
          };

          verification.timeline.push({
            title: 'Payment Confirmed',
            description: 'Verification started',
            status: 'success',
            date: new Date(),
          });

          await verification.save();
        }
      }

      if (payment.paymentFor === 'tour') {
        const tour = await Tour.findById(payment.tour);

        if (tour && !tour.paid) {
          tour.paid = true;
          tour.status = 'paid';
          await tour.save();
        }
      }

      if (payment.plan) {
        const homeSeeker = await HomeSeeker.findOne({
          user: payment.user._id,
        });

        if (homeSeeker && !homeSeeker.isPlanActive) {
          homeSeeker.plan = payment.plan;
          homeSeeker.isPlanActive = true;
          homeSeeker.planActivatedAt = new Date();
          await homeSeeker.save();

          await SendEmails.sendPlanActivationEmail(
            payment.user.email,
            payment.user.fullName,
            payment.plan,
          );
        }
      }

      if (!payment.receiptSent) {
        try {
          await sendReceiptIfNeeded({ SendEmails, generateReceiptBuffer }, payment);
        } catch (err) {
          console.error('Receipt email failed:', {
            message: err.message,
            paymentId: payment._id,
            reference: payment.reference,
          });
        }
      }

      payment.webhookProcessed = true;
      await payment.save();
    }

    if (event.event === 'charge.failed') {
      payment.status = 'failed';
      await payment.save();
    }
  } catch (err) {
    console.error('Webhook processing failed:', {
      message: err.message,
      paymentId,
      event: event.event,
    });
    throw err;
  }
};

const downloadReceipt = async (deps, input) => {
  const { Payment, generateReceipt } = deps;
  const { paymentId, user, res } = input;

  const payment = await Payment.findById(paymentId)
    .populate('user', 'fullName email')
    .populate({
      path: 'agent',
      populate: { path: 'user', select: 'fullName email' },
    })
    .populate('property')
    .populate('tour');

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.user._id.toString() !== user._id.toString()) {
    throw new AppError('Not authorized', 400);
  }

  generateReceipt(payment, res);
};

const getPaymentByReference = async (deps, input) => {
  const { Payment } = deps;
  const { reference, trxref } = input;
  const paymentRef = reference || trxref;

  if (!paymentRef) {
    throw new AppError('Payment reference is required', 400);
  }

  const payment = await Payment.findOne({ reference: paymentRef });

  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  return {
    success: true,
    data: payment,
  };
};

module.exports = {
  payForTour,
  payForProperty,
  verifyPayment,
  sendReceiptIfNeeded,
  webhook,
  processWebhook,
  downloadReceipt,
  getPaymentByReference,
};
