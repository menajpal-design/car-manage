import { Schema, model, Document } from 'mongoose';

export interface IFuelLog {
  vehicleId: Schema.Types.ObjectId | string;
  driverId: Schema.Types.ObjectId | string;
  companyId: Schema.Types.ObjectId | string;
  fuelDate: Date;
  odoReading: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelStation?: string;
  previousOdo: number;
  mileageCalculated: number;
  isOdoPhotoVerified: boolean;
  odoPhotoUrl?: string;
}

const fuelLogSchema = new Schema<IFuelLog>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'Vehicle ID is required'],
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Driver ID is required'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
    },
    fuelDate: {
      type: Date,
      required: [true, 'Refueling date is required'],
      default: Date.now,
    },
    odoReading: {
      type: Number,
      required: [true, 'Odometer reading is required'],
    },
    liters: {
      type: Number,
      required: [true, 'Refill volume in liters is required'],
    },
    pricePerLiter: {
      type: Number,
      required: [true, 'Price per liter is required'],
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
    },
    fuelStation: {
      type: String,
      trim: true,
    },
    previousOdo: {
      type: Number,
      default: 0,
    },
    mileageCalculated: {
      type: Number,
      default: 0,
    },
    isOdoPhotoVerified: {
      type: Boolean,
      default: false,
    },
    odoPhotoUrl: {
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

export const FuelLog = model<IFuelLog>('FuelLog', fuelLogSchema);
export default FuelLog;
