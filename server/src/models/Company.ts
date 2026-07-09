import { Schema, model, Document } from 'mongoose';

export interface ICompanyDocument extends Document {
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompanyDocument>(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
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

export const Company = model<ICompanyDocument>('Company', companySchema);
