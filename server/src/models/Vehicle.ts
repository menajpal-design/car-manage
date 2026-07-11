import { Schema, model } from 'mongoose';
import { VehicleFuelType, VehicleStatus } from '@fleetmaster/shared';

export interface IVehicleDocument {
  type: string; // Registration, Insurance, Permit, etc.
  documentUrl: string; // S3 link or local upload path
  issueDate: Date;
  expiryDate: Date;
  isVerified: boolean;
}

export interface IVehicle {
  regNumber: string; // unique
  brand: string;
  model: string;
  year: number;
  engineNo: string;
  chassisNo: string;
  fuelType: VehicleFuelType;
  currentOdometer: number;
  lastServiceOdometer: number;
  lastFuelOdometer: number;
  documents: IVehicleDocument[];
  status: VehicleStatus;
  assignedDriver?: Schema.Types.ObjectId | string;
  assignedHelper?: Schema.Types.ObjectId | string;
  ownerCompanyId: Schema.Types.ObjectId | string;
  gpsDeviceId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    speed?: number;
    course?: number;
    lastUpdate?: Date;
  };
}

const vehicleDocumentSchema = new Schema<IVehicleDocument>(
  {
    type: { type: String, required: true },
    documentUrl: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

const vehicleSchema = new Schema<IVehicle>(
  {
    regNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'Vehicle brand is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
    },
    engineNo: {
      type: String,
      required: [true, 'Engine number is required'],
      trim: true,
    },
    chassisNo: {
      type: String,
      required: [true, 'Chassis number is required'],
      trim: true,
    },
    fuelType: {
      type: String,
      enum: ['Petrol', 'Diesel', 'CNG', 'Electric'],
      required: [true, 'Fuel type is required'],
    },
    currentOdometer: {
      type: Number,
      default: 0,
    },
    lastServiceOdometer: {
      type: Number,
      default: 0,
    },
    lastFuelOdometer: {
      type: Number,
      default: 0,
    },
    documents: [vehicleDocumentSchema],
    status: {
      type: String,
      enum: Object.values(VehicleStatus),
      default: VehicleStatus.IDLE,
    },
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedHelper: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    ownerCompanyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Owner company ID is required'],
    },
    gpsDeviceId: {
      type: String,
      trim: true,
      index: true,
    },
    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      speed: { type: Number },
      course: { type: Number },
      lastUpdate: { type: Date },
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

export const Vehicle = model<IVehicle>('Vehicle', vehicleSchema);
export default Vehicle;
