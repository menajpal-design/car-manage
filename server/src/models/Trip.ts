import { Schema, model, Document } from 'mongoose';
import { TripStatus } from '@fleetmaster/shared';

export interface ITripDocument extends Document {
  tripNumber: string;
  vehicleId: Schema.Types.ObjectId | string;
  driverId: Schema.Types.ObjectId | string;
  helperId?: Schema.Types.ObjectId | string;
  origin: string;
  destination: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: TripStatus;
  startMileage?: number;
  endMileage?: number;
  cargoWeight?: number;
  notes?: string;
  companyId: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const tripSchema = new Schema<ITripDocument>(
  {
    tripNumber: {
      type: String,
      required: [true, 'Trip number is required'],
      unique: true,
      trim: true,
    },
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle identity is required'],
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver ID is required'],
    },
    helperId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    origin: {
      type: String,
      required: [true, 'Origin terminal is required'],
      trim: true,
    },
    destination: {
      type: String,
      required: [true, 'Destination terminal is required'],
      trim: true,
    },
    scheduledStartTime: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
      default: Date.now,
    },
    scheduledEndTime: {
      type: Date,
    },
    actualStartTime: {
      type: Date,
    },
    actualEndTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(TripStatus),
      default: TripStatus.SCHEDULED,
    },
    startMileage: {
      type: Number,
    },
    endMileage: {
      type: Number,
    },
    cargoWeight: {
      type: Number,
    },
    notes: {
      type: String,
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
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

export const Trip = model<ITripDocument>('Trip', tripSchema);
export default Trip;
