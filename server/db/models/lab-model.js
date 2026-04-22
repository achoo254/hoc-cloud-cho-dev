import mongoose from 'mongoose';

const { Schema } = mongoose;

const tldrItemSchema = new Schema({
  term: { type: String, required: true },
  definition: { type: String, required: true },
}, { _id: false });

const quizItemSchema = new Schema({
  question: { type: String, required: true },
  answers: [String],
  correctIndex: Number,
  explanation: String,
}, { _id: false });

const flashcardSchema = new Schema({
  front: String,
  back: String,
}, { _id: false });

const tryAtHomeSchema = new Schema({
  command: String,
  description: String,
}, { _id: false });

const labSchema = new Schema({
  slug: { type: String, unique: true, required: true, index: true },
  module: { type: String, index: true },
  title: { type: String, required: true },
  filePath: String,
  estimatedMinutes: Number,
  tldr: [tldrItemSchema],
  walkthrough: [Schema.Types.Mixed],
  quiz: [quizItemSchema],
  flashcards: [flashcardSchema],
  tryAtHome: [tryAtHomeSchema],
  contentHash: String,
}, { timestamps: true });

export const Lab = mongoose.model('Lab', labSchema);
