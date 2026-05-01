const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// ─── Configure Cloudinary ─────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Storage: Profile Photos ─────────────────────────────────────────────────
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Only JPG/JPEG/PNG images are allowed for profile photos');
    }
    return {
      folder: `${process.env.CLOUDINARY_FOLDER}/employees/photos`,
      allowed_formats: ['jpg', 'jpeg', 'png'],
      transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      resource_type: 'image',
    };
  },
});

// ─── Storage: Documents ──────────────────────────────────────────────────────
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Only PDF, JPG, PNG, DOC, DOCX files are allowed for documents');
    }
    return {
      folder: `${process.env.CLOUDINARY_FOLDER}/documents`,
      allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
      resource_type: 'auto',
    };
  },
});

// ─── Storage: Resumes ────────────────────────────────────────────────────────
const resumeStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const allowed = ['application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Only PDF, DOC, DOCX files are allowed for resumes');
    }
    return {
      folder: `${process.env.CLOUDINARY_FOLDER}/resumes`,
      allowed_formats: ['pdf', 'doc', 'docx'],
      resource_type: 'auto',
    };
  },
});

// ─── Storage: Receipts ───────────────────────────────────────────────────────
const receiptStorage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new Error('Only JPG, PNG, PDF files are allowed for receipts');
    }
    return {
      folder: `${process.env.CLOUDINARY_FOLDER}/receipts`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto',
    };
  },
});

// ─── Multer size limits ───────────────────────────────────────────────────────
const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('profilePhoto');

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('document');

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('resume');

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('receipt');

// ─── Delete from Cloudinary ───────────────────────────────────────────────────
async function deleteFromCloudinary(publicId, resourceType) {
  try {
    if (!publicId) return;
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || 'image',
    });
  } catch (err) {
    console.error('[Cloudinary] Delete error:', err.message);
  }
}

module.exports = {
  cloudinary,
  uploadProfilePhoto,
  uploadDocument,
  uploadResume,
  uploadReceipt,
  deleteFromCloudinary,
};
