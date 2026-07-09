import { Schema, model } from 'mongoose';
import { ExpenseCategory } from '@fleetmaster/shared';

export interface IExpense {
  vehicleId: Schema.Types.ObjectId | string;
  companyId: Schema.Types.ObjectId | string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  odoReading?: number;
  recordedBy: Schema.Types.ObjectId | string;
  ticketId?: Schema.Types.ObjectId | string;
  notes?: string;
}

const expenseSchema = new Schema<IExpense>(
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
    category: {
      type: String,
      enum: Object.values(ExpenseCategory),
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
    odoReading: {
      type: Number,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
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

export const Expense = model<IExpense>('Expense', expenseSchema);
export default Expense;
