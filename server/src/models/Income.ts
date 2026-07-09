import { Schema, model } from 'mongoose';
import { IncomeSource } from '@fleetmaster/shared';

export interface IIncome {
  vehicleId: Schema.Types.ObjectId | string;
  companyId: Schema.Types.ObjectId | string;
  source: IncomeSource;
  amount: number;
  date: Date;
  description: string;
  recordedBy: Schema.Types.ObjectId | string;
}

const incomeSchema = new Schema<IIncome>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    source: {
      type: String,
      enum: Object.values(IncomeSource),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      required: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

export const Income = model<IIncome>('Income', incomeSchema);
export default Income;
