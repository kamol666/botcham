import mongoose from 'mongoose';

export const PaymentProvider = {
  PAYME: 'payme',
  UZUM: 'uzum',
  CLICK: 'click',
  UZCARD: 'uzcard',
};

export const PaymentTypes = {
  SUBSCRIPTION: 'subscription',
  ONETIME: 'onetime',
};

export const TransactionStatus = {
  PENDING: 'PENDING',
  CREATED: 'CREATED',
  PAID: 'PAID',
  CANCELED: 'CANCELED',
  FAILED: 'FAILED',
};

export const transactionSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
    },
    paymentType: {
      type: String,
      enum: Object.values(PaymentTypes),
      required: false,
    },
    transId: {
      type: String,
      unique: true,
      sparse: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
    },
    prepareId: Number,
    performTime: Date,
    cancelTime: Date,
    reason: Number,
    state: Number,
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
    },
    clickTransId: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    uzcard: {
      transactionId: Number,
      terminalId: String,
      merchantId: String,
      extraId: String,
      cardNumber: String,
      cardId: Number,
      statusComment: String,
      createdDate: Date,
    },
    selectedService: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
