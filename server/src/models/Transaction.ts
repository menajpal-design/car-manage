import { Schema, model, Document } from 'mongoose';
import { PaymentMethod, TransactionStatus } from '@fleetmaster/shared';

export interface ITransaction {
  invoiceId: Schema.Types.ObjectId | string;
  ticketId: Schema.Types.ObjectId | string;
  companyId: Schema.Types.ObjectId | string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  status: TransactionStatus;
  verifiedBy?: Schema.Types.ObjectId | string;
  verifiedAt?: Date;
  notes?: string;
}

const transactionSchema = new Schema<ITransaction>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      unique: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    transactionId: {
      type: String,
      // Manual entry for Bkash/Nagad
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);
export default Transaction;
