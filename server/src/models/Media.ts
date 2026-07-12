import { Schema, model, Document } from 'mongoose';

export interface IMediaDocument extends Document {
  filename: string;
  contentType: string;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMediaDocument>(
  {
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    contentType: {
      type: String,
      required: [true, 'Content-Type is required'],
    },
    data: {
      type: Buffer,
      required: [true, 'File binary buffer data is required'],
    },
  },
  {
    timestamps: true,
  }
);

export const Media = model<IMediaDocument>('Media', mediaSchema);
export default Media;
