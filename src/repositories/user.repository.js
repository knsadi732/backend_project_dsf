const { query } = require('../config/db');
const { buildListQuery } = require('../utils/queryBuilder');

async function findActiveByEmail(email) {
  const { rows } = await query(
    `SELECT id, company_id, branch_id, warehouse_id, role_id, full_name, email,
            password_hash, status, version
     FROM users
     WHERE email = $1 AND is_deleted = FALSE
     LIMIT 1`,
    [email],
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name,
            email, department, job_title, status, created_at, updated_at
     FROM users
     WHERE id = $1 AND is_deleted = FALSE
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function findByIdScoped(companyId, id) {
  const { rows } = await query(
    `SELECT id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name,
            email, department, job_title, status, created_at, updated_at
     FROM users
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     LIMIT 1`,
    [id, companyId],
  );
  return rows[0] || null;
}

async function list(companyId, pagination) {
  const { dataSql, dataParams, countSql, countParams } = buildListQuery({
    table: 'users',
    columns:
      'id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email, department, job_title, status, created_at, updated_at',
    companyId,
    pagination,
    searchableColumns: ['full_name', 'email', 'employee_id'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

async function create(
  companyId,
  { branchId, warehouseId, roleId, employeeId, fullName, email, passwordHash, department, jobTitle },
  createdBy,
) {
  const { rows } = await query(
    `INSERT INTO users (company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
                         password_hash, department, job_title, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
     RETURNING id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
               department, job_title, status, created_at, updated_at`,
    [companyId, branchId, warehouseId, roleId, employeeId, fullName, email, passwordHash, department, jobTitle, createdBy],
  );
  return rows[0];
}

async function update(companyId, id, { fullName, department, jobTitle, roleId, status }, updatedBy) {
  const { rows } = await query(
    `UPDATE users
     SET full_name = COALESCE($3, full_name), department = COALESCE($4, department),
         job_title = COALESCE($5, job_title), role_id = COALESCE($6, role_id),
         status = COALESCE($7, status), updated_by = $8, updated_at = now(), version = version + 1
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
               department, job_title, status, created_at, updated_at`,
    [id, companyId, fullName, department, jobTitle, roleId, status, updatedBy],
  );
  return rows[0] || null;
}

async function softDelete(companyId, id, deletedBy) {
  const { rows } = await query(
    `UPDATE users SET is_deleted = TRUE, deleted_at = now(), deleted_by = $3
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id`,
    [id, companyId, deletedBy],
  );
  return rows[0] || null;
}

module.exports = { findActiveByEmail, findById, findByIdScoped, list, create, update, softDelete };
