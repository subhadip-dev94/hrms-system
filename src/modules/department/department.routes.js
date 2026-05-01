const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');
const { isAuthenticated } = require('../../middlewares/auth.middleware');

router.use(isAuthenticated);

router.get('/', departmentController.index);
router.get('/create', departmentController.getCreate);
router.post('/create', departmentController.postCreate);
router.get('/:id/edit', departmentController.getEdit);
router.put('/:id', departmentController.postEdit);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
