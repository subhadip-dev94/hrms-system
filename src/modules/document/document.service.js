const Document = require('./document.model');
const Employee = require('../employee/employee.model');
const { sendDocumentUploadedEmail } = require('../../utils/email.util');
const { deleteFromCloudinary } = require('../../config/cloudinary');
const errors = require('../../utils/errorCodes.util');

const documentService = {
  // ─── Get all documents (HR/admin) ─────────────────────────────────────────
  async getAllDocuments(filters = {}) {
    const query = {};
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.documentType) query.documentType = filters.documentType;
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    return await Document.find(query)
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Get documents for a specific employee (employee view) ────────────────
  async getMyDocuments(employeeId) {
    const docs = await Document.find({ employeeId, isVisibleToEmployee: true })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ documentType: 1, createdAt: -1 })
      .lean();

    // Group by documentType
    const grouped = {};
    docs.forEach(d => {
      if (!grouped[d.documentType]) grouped[d.documentType] = [];
      grouped[d.documentType].push(d);
    });
    return grouped;
  },

  // ─── Get document by ID ───────────────────────────────────────────────────
  async getDocumentById(id) {
    const doc = await Document.findById(id)
      .populate('employeeId', 'firstName lastName employeeCode email')
      .populate('uploadedBy', 'firstName lastName')
      .lean();
    if (!doc) throw new Error(errors.DOCUMENT_NOT_FOUND);
    return doc;
  },

  // ─── Upload document ──────────────────────────────────────────────────────
  async uploadDocument(data, file, uploadedByEmployeeId) {
    if (!file) throw new Error(errors.DOCUMENT_UPLOAD_FAILED);

    const employee = await Employee.findById(data.employeeId)
      .select('firstName lastName email employeeCode')
      .lean();
    if (!employee) throw new Error('Employee not found');

    // Cloudinary: file.path = secure URL, file.filename = public_id
    const fileExt = (file.originalname || '').split('.').pop().toLowerCase();
    const fileSizeKB = Math.round((file.size || 0) / 1024);

    const uploadedByEmp = await Employee.findById(uploadedByEmployeeId)
      .select('firstName lastName')
      .lean();
    const uploaderName = uploadedByEmp ? `${uploadedByEmp.firstName} ${uploadedByEmp.lastName}` : 'HR';

    const doc = await Document.create({
      employeeId: data.employeeId,
      documentType: data.documentType,
      title: data.title.trim(),
      fileUrl:  file.path,
      fileId:   file.filename,
      fileType: fileExt,
      fileSize: fileSizeKB,
      uploadedBy: uploadedByEmployeeId,
      isVisibleToEmployee: data.isVisibleToEmployee !== 'false',
      description: data.description ? data.description.trim() : '',
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    });

    // Non-blocking email
    sendDocumentUploadedEmail(
      employee.email,
      `${employee.firstName} ${employee.lastName}`,
      data.documentType,
      uploaderName
    );

    return doc;
  },

  // ─── Download document (access-controlled) ────────────────────────────────
  // Returns the Cloudinary URL directly for redirect/link
  async downloadDocument(id, requestingUser) {
    const doc = await Document.findById(id).lean();
    if (!doc) throw new Error(errors.DOCUMENT_NOT_FOUND);

    if (requestingUser.role === 'employee') {
      if (String(doc.employeeId) !== String(requestingUser.employeeId)) {
        throw new Error(errors.UNAUTHORIZED);
      }
      if (!doc.isVisibleToEmployee) {
        throw new Error(errors.UNAUTHORIZED);
      }
    }

    return { fileUrl: doc.fileUrl, filename: doc.title || 'document' };
  },

  // ─── Delete document ──────────────────────────────────────────────────────
  async deleteDocument(id) {
    const doc = await Document.findById(id).lean();
    if (!doc) throw new Error(errors.DOCUMENT_NOT_FOUND);

    // Remove from Cloudinary
    if (doc.fileId) {
      await deleteFromCloudinary(doc.fileId, 'auto');
    }

    await Document.findByIdAndDelete(id);
  },

  // ─── Toggle visibility ────────────────────────────────────────────────────
  async toggleVisibility(id) {
    const doc = await Document.findById(id);
    if (!doc) throw new Error(errors.DOCUMENT_NOT_FOUND);
    doc.isVisibleToEmployee = !doc.isVisibleToEmployee;
    return await doc.save();
  },

  // ─── Get expiring documents (within next N days) ──────────────────────────
  async getExpiringDocuments(days = 30) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return await Document.find({
      expiryDate: { $gte: now, $lte: future },
    })
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ expiryDate: 1 })
      .lean();
  },

  // ─── Count expiring documents ─────────────────────────────────────────────
  async getExpiringCount(days = 30) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return await Document.countDocuments({ expiryDate: { $gte: now, $lte: future } });
  },
};

module.exports = documentService;
