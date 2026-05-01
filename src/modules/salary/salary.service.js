const Salary = require('./salary.model');
const { calculatePF, calculateESI, calculateTax, roundToTwo } = require('../../utils/helper.util');
const errors = require('../../utils/errorCodes.util');

// ─── Build computed salary fields from basic salary ────────────────────────
function computeSalaryFields(data) {
  const basic = roundToTwo(parseFloat(data.basicSalary) || 0);
  const hra = roundToTwo(basic * 0.40);
  const specialAllowance = roundToTwo(parseFloat(data.specialAllowance) || 0);
  const transportAllowance = roundToTwo(parseFloat(data.transportAllowance) || 0);
  const medicalAllowance = roundToTwo(parseFloat(data.medicalAllowance) || 0);
  const otherAllowances = roundToTwo(parseFloat(data.otherAllowances) || 0);

  const grossSalary = roundToTwo(
    basic + hra + specialAllowance + transportAllowance + medicalAllowance + otherAllowances
  );

  const pf = calculatePF(basic);
  const esi = calculateESI(grossSalary);
  const tax = calculateTax(grossSalary * 12);
  const otherDeductions = roundToTwo(parseFloat(data.otherDeductions) || 0);

  const totalDeductions = roundToTwo(pf + esi + tax + otherDeductions);
  const netSalary = roundToTwo(grossSalary - totalDeductions);

  return {
    earnings: { basicSalary: basic, hra, specialAllowance, transportAllowance, medicalAllowance, otherAllowances },
    deductions: { pf, esi, tax, otherDeductions },
    grossSalary,
    netSalary,
  };
}

const salaryService = {
  // ─── Get salary structure for an employee ─────────────────────────────────
  async getSalaryByEmployee(employeeId) {
    return await Salary.findOne({ employeeId }).populate('employeeId', 'firstName lastName employeeCode');
  },

  // ─── Get all salary structures ─────────────────────────────────────────────
  async getAllSalaries() {
    return await Salary.find()
      .populate('employeeId', 'firstName lastName employeeCode departmentId')
      .sort({ createdAt: -1 })
      .lean();
  },

  // ─── Assign salary structure to employee ──────────────────────────────────
  async assignSalary(data, revisedBy) {
    const existing = await Salary.findOne({ employeeId: data.employeeId });
    const computed = computeSalaryFields(data);

    if (existing) {
      // Push current record to history before updating
      const historyEntry = {
        ...existing.earnings,
        grossSalary: existing.grossSalary,
        netSalary: existing.netSalary,
        effectiveFrom: existing.effectiveFrom,
        effectiveTo: new Date(),
        revisedBy,
        remarks: data.remarks || 'Salary revised',
      };

      existing.revisionHistory.push(historyEntry);
      existing.earnings = computed.earnings;
      existing.deductions = computed.deductions;
      existing.grossSalary = computed.grossSalary;
      existing.netSalary = computed.netSalary;
      existing.effectiveFrom = new Date(data.effectiveFrom);
      existing.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : undefined;
      existing.isActive = true;

      return await existing.save();
    }

    return await Salary.create({
      employeeId: data.employeeId,
      ...computed,
      effectiveFrom: new Date(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : undefined,
      isActive: true,
    });
  },

  // ─── Update salary (alias — pushes to history) ─────────────────────────────
  async updateSalary(employeeId, data, revisedBy) {
    data.employeeId = employeeId;
    return await salaryService.assignSalary(data, revisedBy);
  },

  // ─── Get salary by id ──────────────────────────────────────────────────────
  async getSalaryById(id) {
    return await Salary.findById(id).populate('employeeId', 'firstName lastName employeeCode departmentId');
  },
};

module.exports = salaryService;
