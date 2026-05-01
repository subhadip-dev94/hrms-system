const documentService = require('./document.service');
const employeeService = require('../employee/employee.service');
const { validateDocumentUpload } = require('../../utils/validation.util');

const DOCUMENT_TYPES = [
  'id-proof', 'address-proof', 'education-certificate',
  'experience-letter', 'offer-letter', 'appointment-letter',
  'salary-slip', 'resignation-letter', 'nda', 'contract',
  'appraisal-letter', 'other',
];

const documentController = {
  // GET /documents — HR/admin: all documents
  async index(req, res) {
    try {
      const filters = {
        employeeId: req.query.employeeId || '',
        documentType: req.query.documentType || '',
        dateFrom: req.query.dateFrom || '',
        dateTo: req.query.dateTo || '',
      };
      const documents = await documentService.getAllDocuments(filters);
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      const expiring = await documentService.getExpiringDocuments(30);
      res.render('pages/document/index', {
        title: 'Documents',
        documents,
        employees,
        expiring,
        filters,
        documentTypes: DOCUMENT_TYPES,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /documents/my — employee: my documents
  async my(req, res) {
    try {
      const grouped = await documentService.getMyDocuments(req.session.user.employeeId);
      res.render('pages/document/my', {
        title: 'My Documents',
        grouped,
        documentTypes: DOCUMENT_TYPES,
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/dashboard');
    }
  },

  // GET /documents/upload — upload form
  async uploadForm(req, res) {
    try {
      const employees = await employeeService.getAllEmployees({ status: 'active' });
      res.render('pages/document/upload', {
        title: 'Upload Document',
        employees,
        documentTypes: DOCUMENT_TYPES,
        preselectedEmployee: req.query.employeeId || '',
      });
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/documents');
    }
  },

  // POST /documents/upload
  async upload(req, res) {
    try {
      const hasFile = !!req.file;
      const validationErrors = validateDocumentUpload({ ...req.body, hasFile });
      if (validationErrors.length > 0) {
        const employees = await employeeService.getAllEmployees({ status: 'active' });
        return res.render('pages/document/upload', {
          title: 'Upload Document',
          employees,
          documentTypes: DOCUMENT_TYPES,
          preselectedEmployee: req.body.employeeId || '',
          errors: validationErrors,
          old: req.body,
        });
      }
      await documentService.uploadDocument(req.body, req.file, req.session.user.employeeId);
      req.flash('success', 'Document uploaded successfully');
      res.redirect('/documents');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/documents/upload');
    }
  },

  // GET /documents/:id/download
  async download(req, res) {
    try {
      const { fileUrl } = await documentService.downloadDocument(
        req.params.id,
        req.session.user
      );
      // Redirect to Cloudinary URL for download
      res.redirect(fileUrl);
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('back');
    }
  },

  // DELETE /documents/:id
  async remove(req, res) {
    try {
      await documentService.deleteDocument(req.params.id);
      req.flash('success', 'Document deleted');
      res.redirect('/documents');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/documents');
    }
  },

  // PUT /documents/:id/visibility
  async toggleVisibility(req, res) {
    try {
      await documentService.toggleVisibility(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, error: err.message });
    }
  },
};

module.exports = documentController;
