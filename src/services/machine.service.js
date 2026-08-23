const AppError = require('../utils/AppError');
const { withTransaction } = require('../config/db');
const { buildPaginationMeta } = require('../utils/pagination');
const machineRepository = require('../repositories/machine.repository');

async function createMachine(companyId, payload, actorId) {
  return machineRepository.create(companyId, payload, actorId);
}

async function getMachine(companyId, id) {
  const machine = await machineRepository.findById(companyId, id);
  if (!machine) throw new AppError('COMMON_001');
  return machine;
}

async function listMachines(companyId, pagination, filters) {
  const { rows, totalRecords } = await machineRepository.list(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

async function updateMachine(companyId, id, payload, actorId) {
  const machine = await machineRepository.update(companyId, id, payload, actorId);
  if (!machine) throw new AppError('COMMON_001');
  return machine;
}

async function deleteMachine(companyId, id, actorId) {
  const deleted = await machineRepository.softDelete(companyId, id, actorId);
  if (!deleted) throw new AppError('COMMON_001');
}

/** Opens a downtime event and flips the machine to "down" — the Superadmin alert trigger. Idempotent: a second call while already down just returns the existing open event. */
async function reportDown(companyId, id, reason, actorId) {
  return withTransaction(async (client) => {
    const existingEvent = await machineRepository.findOpenDowntimeEvent(client, companyId, id);
    if (existingEvent) return { machine: await machineRepository.findById(companyId, id), event: existingEvent };

    const event = await machineRepository.createDowntimeEvent(client, companyId, id, reason, actorId);
    const machine = await machineRepository.setStatus(client, companyId, id, 'down', actorId);
    if (!machine) throw new AppError('COMMON_001');
    return { machine, event };
  });
}

/** Closes the open downtime event and flips the machine back to "running". No-op-safe: throws COMMON_001 if nothing is actually open. */
async function resolveDowntime(companyId, id, actorId) {
  return withTransaction(async (client) => {
    const openEvent = await machineRepository.findOpenDowntimeEvent(client, companyId, id);
    if (!openEvent) throw new AppError('COMMON_001', [], 'This machine has no open downtime event to resolve.');

    await machineRepository.closeDowntimeEvent(client, companyId, openEvent.id, actorId);
    const machine = await machineRepository.setStatus(client, companyId, id, 'running', actorId);
    if (!machine) throw new AppError('COMMON_001');
    return machine;
  });
}

async function listDowntimeEvents(companyId, pagination, filters) {
  const { rows, totalRecords } = await machineRepository.listDowntimeEvents(companyId, pagination, filters);
  return { rows, meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalRecords }) };
}

module.exports = {
  createMachine,
  getMachine,
  listMachines,
  updateMachine,
  deleteMachine,
  reportDown,
  resolveDowntime,
  listDowntimeEvents,
};
