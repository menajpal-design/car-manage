import { Schema, model, Document } from 'mongoose';
import { TicketType, TicketStatus, UserRole } from '@fleetmaster/shared';

export interface ITicketActivity {
  userId: Schema.Types.ObjectId | string;
  action: string;
  timestamp: Date;
  details: string;
}

export interface IPartsUsed {
  name: string;
  quantity: number;
  price: number;
}

export interface ITicket {
  ticketNumber: string;
  companyId: Schema.Types.ObjectId | string;
  vehicleId: Schema.Types.ObjectId | string;
  reportedById: Schema.Types.ObjectId | string;
  reportedByRole: string;
  type: TicketType;
  status: TicketStatus;
  description: string;
  images: string[];
  voiceNoteUrl?: string;
  odoAtReport: number;
  assignedToId?: Schema.Types.ObjectId | string; // Technician
  solution?: {
    description: string;
    partsUsed: IPartsUsed[];
    laborCost: number;
    totalCost: number;
  };
  resolvedAt?: Date;
  closedAt?: Date;
  activityLog: ITicketActivity[];
}

const activityLogSchema = new Schema<ITicketActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  details: { type: String, required: true },
});

const partsUsedSchema = new Schema<IPartsUsed>({
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  price: { type: Number, required: true, default: 0 },
});

const ticketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      unique: true,
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
    reportedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedByRole: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(TicketType),
      required: true,
      default: TicketType.OTHER,
    },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      required: true,
      default: TicketStatus.OPEN,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    voiceNoteUrl: {
      type: String,
    },
    odoAtReport: {
      type: Number,
      required: true,
    },
    assignedToId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    solution: {
      description: { type: String },
      partsUsed: [partsUsedSchema],
      laborCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    activityLog: [activityLogSchema],
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

// Pre-save hook to generate sequential TicketNumber
ticketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `TK-${todayStr}-`;
    
    // Find the latest ticket created today
    const latestTicket = await model<ITicket>('Ticket')
      .findOne({ ticketNumber: new RegExp(`^${prefix}`) })
      .sort({ ticketNumber: -1 });

    let nextSeq = 1;
    if (latestTicket && latestTicket.ticketNumber) {
      const parts = latestTicket.ticketNumber.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    
    const seqStr = String(nextSeq).padStart(4, '0');
    this.ticketNumber = `${prefix}${seqStr}`;
  }
  next();
});

export const Ticket = model<ITicket>('Ticket', ticketSchema);
export default Ticket;
