import { Schema, model, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRole } from '@fleetmaster/shared';

// Interface for User Document
export interface IUserDocument extends Document {
  email?: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  phone: string; // Unique, required
  avatarUrl?: string;
  companyId: Schema.Types.ObjectId | string;
  assignedVehicleId?: Schema.Types.ObjectId | string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  baseSalary?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Interface for User Model
type UserModelType = Model<IUserDocument>;

const userSchema = new Schema<IUserDocument, UserModelType>(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.DRIVER,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company identity is required'],
    },
    assignedVehicleId: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
    },
    baseSalary: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

// Hash password before saving with 12 rounds
userSchema.pre('save', async function (next) {
  const user = this;
  if (!user.isModified('passwordHash')) return next();

  try {
    const salt = await bcrypt.genSalt(12); // User requested 12+ rounds
    const hashed = await bcrypt.hash(user.passwordHash, salt);
    user.passwordHash = hashed;
    next();
  } catch (error: any) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const user = this;
  if (!user.passwordHash) {
    throw new Error('Password hash field not selected on user model');
  }
  return bcrypt.compare(candidatePassword, user.passwordHash);
};

export const User = model<IUserDocument, UserModelType>('User', userSchema);
