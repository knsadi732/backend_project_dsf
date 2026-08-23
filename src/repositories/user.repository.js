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

/** Login accepts either an email or a phone number in the same field. */
async function findActiveByIdentifier(identifier) {
  const { rows } = await query(
    `SELECT id, company_id, branch_id, warehouse_id, role_id, full_name, email,
            password_hash, status, version
     FROM users
     WHERE (email = $1 OR phone = $1) AND is_deleted = FALSE
     LIMIT 1`,
    [identifier],
  );
  return rows[0] || null;
}

/** All role ids a user can act as: their primary role plus any additional grants. */
async function findRoleIdsForUser(userId) {
  const { rows } = await query(
    `SELECT role_id FROM (
       SELECT role_id FROM users WHERE id = $1 AND is_deleted = FALSE
       UNION
       SELECT role_id FROM user_roles WHERE user_id = $1
     ) roles`,
    [userId],
  );
  return rows.map((r) => r.role_id);
}

async function setAdditionalRoles(userId, roleIds, createdBy) {
  await query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
  for (const roleId of roleIds) {
    await query(
      `INSERT INTO user_roles (user_id, role_id, created_by) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId, createdBy],
    );
  }
}

async function findAdditionalRoles(userId) {
  const { rows } = await query(
    `SELECT r.id, r.key, r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id AND r.is_deleted = FALSE
     WHERE ur.user_id = $1`,
    [userId],
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name,
            email, phone, department, job_title, status, created_at, updated_at
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
            email, phone, department, job_title, status, created_at, updated_at
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
      'id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email, phone, department, job_title, status, created_at, updated_at',
    companyId,
    pagination,
    searchableColumns: ['full_name', 'email', 'employee_id', 'phone'],
  });
  const [data, count] = await Promise.all([query(dataSql, dataParams), query(countSql, countParams)]);
  return { rows: data.rows, totalRecords: parseInt(count.rows[0].count, 10) };
}

/** Short department code for employee_id generation, e.g. 'Finance & Compliance' -> 'FIN'. */
function deriveDeptCode(department) {
  const letters = (department || '').toUpperCase().replace(/[^A-Z]/g, '');
  return letters.slice(0, 3) || 'GEN';
}

async function create(
  companyId,
  { branchId, warehouseId, roleId, fullName, email, phone, passwordHash, department, jobTitle },
  createdBy,
) {
  const deptCode = deriveDeptCode(department);
  const { rows } = await query(
    `INSERT INTO users (company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
                         phone, password_hash, department, job_title, created_by, updated_by)
     VALUES ($1, $2, $3, $4,
             'DSF-' || $5 || '-' || LPAD(nextval('users_employee_seq')::text, 4, '0'),
             $6, $7, $8, $9, $10, $11, $12, $12)
     RETURNING id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
               phone, department, job_title, status, created_at, updated_at`,
    [companyId, branchId, warehouseId, roleId, deptCode, fullName, email, phone, passwordHash, department, jobTitle, createdBy],
  );
  return rows[0];
}

async function update(
  companyId,
  id,
  { fullName, department, jobTitle, roleId, status, branchId, warehouseId, email, phone, passwordHash },
  updatedBy,
) {
  const { rows } = await query(
    `UPDATE users
     SET full_name = COALESCE($3, full_name), department = COALESCE($4, department),
         job_title = COALESCE($5, job_title), role_id = COALESCE($6, role_id),
         status = COALESCE($7, status), branch_id = COALESCE($8, branch_id),
         warehouse_id = COALESCE($9, warehouse_id), email = COALESCE($10, email),
         phone = COALESCE($11, phone), password_hash = COALESCE($12, password_hash),
         updated_by = $13, updated_at = now(), version = version + 1
     WHERE id = $1 AND company_id = $2 AND is_deleted = FALSE
     RETURNING id, company_id, branch_id, warehouse_id, role_id, employee_id, full_name, email,
               phone, department, job_title, status, created_at, updated_at`,
    [id, companyId, fullName, department, jobTitle, roleId, status, branchId, warehouseId, email, phone, passwordHash, updatedBy],
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

module.exports = {
  findActiveByEmail,
  findActiveByIdentifier,
  findRoleIdsForUser,
  setAdditionalRoles,
  findAdditionalRoles,
  findById,
  findByIdScoped,
  list,
  create,
  update,
  softDelete,
};
