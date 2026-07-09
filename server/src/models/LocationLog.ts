import { Schema, model, Document } from 'mongoose';

export interface ILocationLog extends Document {
  vehicleId: Schema.Types.ObjectId | string;
  lat: number;
  lng: number;
  speed?: number;
  course?: number;
  timestamp: Date;
}

const locationLogSchema = new Schema<ILocationLog>(
  {
    vehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
    },
    course: {
      type: Number,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LocationLog = model<ILocationLog>('LocationLog', locationLogSchema);
export default LocationLog;
