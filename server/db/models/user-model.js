import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  email: String,
  displayName: String,
  photoUrl: String,
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

export const User = mongoose.model('User', userSchema);
