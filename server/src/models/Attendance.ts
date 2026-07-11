import { Schema, model, Document } from 'mongoose';
import { AttendanceStatus } from '@fleetmaster/shared';

export interface IAttendanceDocument extends Document {
  userId: Schema.Types.ObjectId | string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  clockIn?: Date;
  clockOut?: Date;
  notes?: string;
  companyId: Schema.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    date: {
      type: String,
      required: [true, 'Date (YYYY-MM-DD) is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'Leave'],
      default: 'Present',
    },
    clockIn: {
      type: Date,
    },
    clockOut: {
      type: Date,
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

// Compounding unique index to prevent duplicate attendance records for same user on the same date
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance = model<IAttendanceDocument>('Attendance', attendanceSchema);
export default Attendance;
