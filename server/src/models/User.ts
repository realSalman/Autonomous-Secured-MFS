import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from '../types/index';

export interface UserDocument extends IUser, Document {}

const userSchema = new Schema<UserDocument>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    balance: {
      type: Number,
      default: 10000,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<UserDocument>('User', userSchema);
