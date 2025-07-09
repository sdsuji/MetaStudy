const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Classroom',
    required: true,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: String,
  filename: String,
  fileType: String,
  cloudinaryId: String, // Public ID used for signed URLs
  uploadedAt: Date,
});

module.exports = mongoose.model('Material', materialSchema);
