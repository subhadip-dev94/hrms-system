const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');
const { getMonthName } = require('../../utils/helper.util');

// ─── Generate payslip PDF and save to disk ─────────────────────────────────
// Returns the saved file path (relative to public/).
async function generatePayslipPDF(payslipData) {
  const { employee, payslip } = payslipData;
  const monthName = getMonthName(payslip.month);
  const year = payslip.year;

  // Ensure directory exists
  const dirPath = path.join(
    __dirname,
    '../../../public/payslips',
    String(year),
    String(payslip.month).padStart(2, '0')
  );
  await fs.ensureDir(dirPath);

  const fileName = `${employee.employeeCode}.pdf`;
  const filePath = path.join(dirPath, fileName);
  const relativePath = `/payslips/${year}/${String(payslip.month).padStart(2, '0')}/${fileName}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.pipe(stream);

    // ── Header ────────────────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#2C3E50')
      .text('HRMS — Payslip', { align: 'center' });

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#7F8C8D')
      .text(`Pay Period: ${monthName} ${year}`, { align: 'center' });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#BDC3C7').lineWidth(1).stroke();
    doc.moveDown(0.5);

    // ── Employee Details ──────────────────────────────────────────────────
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2C3E50').text('Employee Details');
    doc.moveDown(0.3);

    const leftX = 40;
    const midX = 300;
    const startY = doc.y;

    doc.font('Helvetica').fontSize(10).fillColor('#333333');
    doc.text(`Name: ${employee.firstName} ${employee.lastName}`, leftX, startY);
    doc.text(`Employee Code: ${employee.employeeCode}`, leftX, startY + 16);
    doc.text(`Department: ${employee.department || '—'}`, leftX, startY + 32);
    doc.text(`Designation: ${employee.designation || '—'}`, leftX, startY + 48);

    doc.text(`Month: ${monthName} ${year}`, midX, startY);
    doc.text(`Working Days: ${payslip.attendance.workingDays}`, midX, startY + 16);
    doc.text(`Days Present: ${payslip.attendance.presentDays}`, midX, startY + 32);
    doc.text(`Days Absent: ${payslip.attendance.absentDays}`, midX, startY + 48);

    doc.y = startY + 64;
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#BDC3C7').lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    // ── Earnings & Deductions tables side by side ─────────────────────────
    const tableTop = doc.y;
    const colW = 250;

    // Earnings header
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#27AE60')
      .text('Earnings', leftX, tableTop);

    // Deductions header
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#E74C3C')
      .text('Deductions', midX, tableTop);

    doc.moveDown(0.4);

    const e = payslip.earnings;
    const d = payslip.deductions;

    const earningsRows = [
      ['Basic Salary', e.basicSalary],
      ['HRA (40%)', e.hra],
      ['Special Allowance', e.specialAllowance],
      ['Transport Allowance', e.transportAllowance],
      ['Medical Allowance', e.medicalAllowance],
      ['Other Allowances', e.otherAllowances],
      ['Overtime Pay', e.overtimePay],
    ];

    const deductionRows = [
      ['Absent Deduction', d.absentDeduction],
      ['Provident Fund (12%)', d.pf],
      ['ESI (0.75%)', d.esi],
      ['Income Tax', d.tax],
      ['Other Deductions', d.otherDeductions],
    ];

    const rowH = 16;
    let rowY = tableTop + 20;

    doc.font('Helvetica').fontSize(9).fillColor('#333333');

    earningsRows.forEach((row) => {
      if (row[1] > 0 || row[0] === 'Basic Salary') {
        doc.text(row[0], leftX, rowY);
        doc.text(`₹ ${row[1].toFixed(2)}`, leftX + 160, rowY, { align: 'right', width: 80 });
        rowY += rowH;
      }
    });

    const rightStart = tableTop + 20;
    let rightY = rightStart;
    deductionRows.forEach((row) => {
      if (row[1] > 0) {
        doc.text(row[0], midX, rightY);
        doc.text(`₹ ${row[1].toFixed(2)}`, midX + 160, rightY, { align: 'right', width: 80 });
        rightY += rowH;
      }
    });

    const maxY = Math.max(rowY, rightY) + 8;

    // Totals row
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#27AE60')
      .text('Gross Earnings', leftX, maxY);
    doc.text(`₹ ${e.grossEarnings.toFixed(2)}`, leftX + 160, maxY, { align: 'right', width: 80 });

    doc
      .fillColor('#E74C3C')
      .text('Total Deductions', midX, maxY);
    doc.text(`₹ ${d.totalDeductions.toFixed(2)}`, midX + 160, maxY, { align: 'right', width: 80 });

    doc.y = maxY + 24;
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#BDC3C7').lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    // ── Net Pay ───────────────────────────────────────────────────────────
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#2C3E50')
      .text(`NET PAY: ₹ ${payslip.netPay.toFixed(2)}`, { align: 'right' });

    doc.moveDown(1.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#BDC3C7').lineWidth(0.5).stroke();
    doc.moveDown(0.5);

    // ── Footer ────────────────────────────────────────────────────────────
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#95A5A6')
      .text(
        'This is a system-generated payslip and does not require a signature.',
        { align: 'center' }
      );

    doc.end();

    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}

module.exports = { generatePayslipPDF };
