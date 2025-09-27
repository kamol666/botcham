import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentSession extends Document {
    sessionToken: string;
    userId: string;
    planId: string;
    selectedService: string;
    amount: number;
    provider: string;
    status: 'pending' | 'used' | 'expired';
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSessionSchema = new Schema({
    sessionToken: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    planId: {
        type: String,
        required: true
    },
    selectedService: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['click', 'click-shop', 'uzcard', 'payme']
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'used', 'expired']
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // MongoDB TTL index
    }
}, {
    timestamps: true
});

// Token indexi
paymentSessionSchema.index({ sessionToken: 1 });
paymentSessionSchema.index({ expiresAt: 1 });

export const PaymentSession = mongoose.model<IPaymentSession>('PaymentSession', paymentSessionSchema);
