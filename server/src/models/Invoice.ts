import { Schema, model, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice {
  invoiceNumber: string;
  ticketId: Schema.Types.ObjectId | string;
  companyId: Schema.Types.ObjectId | string;
  vehicleId: Schema.Types.ObjectId | string;
  customerName: string;
  items: IInvoiceItem[];
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  issuedDate: Date;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Voided';
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 },
});

const invoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      unique: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      unique: true, // 1-to-1 relationship with Ticket
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    issuedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days due
    },
    status: {
      type: String,
      enum: ['Pending', 'Paid', 'Voided'],
      required: true,
      default: 'Pending',
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

// Pre-save hook to generate sequential InvoiceNumber
invoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `INV-${todayStr}-`;
    
    // Find the latest invoice created today
    const latestInvoice = await model<IInvoice>('Invoice')
      .findOne({ invoiceNumber: new RegExp(`^${prefix}`) })
      .sort({ invoiceNumber: -1 });

    let nextSeq = 1;
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const parts = latestInvoice.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    
    const seqStr = String(nextSeq).padStart(4, '0');
    this.invoiceNumber = `${prefix}${seqStr}`;
  }
  next();
});

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);
export default Invoice;
