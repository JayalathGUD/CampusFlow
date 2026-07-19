import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  image: { type: String, default: '' },
  tags: { type: [String], default: [] }
});

const CertificateSchema = new mongoose.Schema({
  title: { type: String, required: true },
  issuer: { type: String, required: true },
  date: { type: Date },
  credentialUrl: { type: String, default: '' }
});

const AchievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date }
});

const PortfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    projects: {
      type: [ProjectSchema],
      default: []
    },
    skills: {
      type: [String],
      default: []
    },
    certificates: {
      type: [CertificateSchema],
      default: []
    },
    achievements: {
      type: [AchievementSchema],
      default: []
    },
    githubLink: {
      type: String,
      default: ''
    },
    linkedinLink: {
      type: String,
      default: ''
    },
    theme: {
      type: String,
      default: 'modern'
    }
  },
  { timestamps: true }
);

export default mongoose.model('Portfolio', PortfolioSchema);
