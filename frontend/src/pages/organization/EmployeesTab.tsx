/**
 * EmployeesTab — employee directory with role promotion and status management.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Badge, Button, ConfirmDialog, Input, Modal,
  Pagination, Select, Table,
} from '@/components/ui'
import type { Column } from '@/components/ui/Table'
import { departmentService } from '@/services/department.service'
import { employeeService } from '@/services/employee.service'
import type { Department, Employee, UserRole } from '@/types'
import { ROLE_LABELS, USER_ROLES } from '@/types'

// ── Role badge variant ────────────────────────────────────────────────────────

const roleBadge: Record<UserRole, 'red' | 'blue' | 'purple' | 'green'> = {
  ADMIN: 'red', ASSET_MANAGER: 'blue', DEPARTMENT_HEAD: 'purple', EMPLOYEE: 'green',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmployeesTab() {
  const [items, setItems]           = useState<Employee[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [filterRole, setFilterRole] = useState<UserRole | ''>('')
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [loading, setLoading]       = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  // Role change modal
  const [roleModal, setRoleModal]     = useState(false)
  const [roleTarget, setRoleTarget]   = useState<Employee | null>(null)
  const [newRole, setNewRole]         = useState<UserRole>('EMPLOYEE')
  const [savingRole, setSavingRole]   = useState(false)
  const [roleError, setRoleError]     = useState<string | null>(null)

  // Status confirm dialog
  const [statusConfirm, setStatusConfirm]     = useState(false)
  const [statusTarget, setStatusTarget]       = useState<Employee | null>(null)
  const [confirmingStatus, setConfirmingStatus] = useState(false)

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        search: search || undefined,
        role:   filterRole || undefined,
        department_id: filterDept || undefined,
        page,
        page_size: 15,
      }
      const res = await employeeService.list(params)
      setItems(res.items)
      setTotal(res.total)
      setTotalPages(res.total_pages)
    } catch { /* handled */ } finally { setLoading(false) }
  }, [search, filterRole, filterDept, page])

  useEffect(() => { void fetchList() }, [fetchList])
  useEffect(() => { setPage(1) }, [search, filterRole, filterDept])
  useEffect(() => {
    departmentService.listActive().then(setDepartments).catch(() => {})
  }, [])

  // ── role change ───────────────────────────────────────────────────────────

  function openRoleModal(emp: Employee) {
    setRoleTarget(emp)
    setNewRole(emp.role)
    setRoleError(null)
    setRoleModal(true)
  }

  async function handleRoleSave() {
    if (!roleTarget) return
    setSavingRole(true); setRoleError(null)
    try {
      await employeeService.changeRole(roleTarget.id, newRole)
      setRoleModal(false); setRoleTarget(null)
      void fetchList()
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to update role.')
    } finally { setSavingRole(false) }
  }

  // ── status toggle ─────────────────────────────────────────────────────────

  async function handleStatusConfirm() {
    if (!statusTarget) return
    setConfirmingStatus(true)
    try {
      await employeeService.setStatus(statusTarget.id, !statusTarget.is_active)
      setStatusConfirm(false); setStatusTarget(null)
      void fetchList()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed.')
    } finally { setConfirmingStatus(false) }
  }

  // ── columns ───────────────────────────────────────────────────────────────

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]))

  const columns: Column<Employee>[] = [
    {
      key: 'name', header: 'Name',
      render: (e) => (
        <div>
          <p className="font-medium text-gray-900">{e.full_name}</p>
          <p className="text-xs text-gray-400">{e.email}</p>
        </div>
      ),
    },
    {
      key: 'role', header: 'Role',
      render: (e) => <Badge variant={roleBadge[e.role]}>{ROLE_LABELS[e.role]}</Badge>,
    },
    {
      key: 'dept', header: 'Department',
      render: (e) => <span className="text-gray-600">{e.department_id ? deptMap[e.department_id] ?? `#${e.department_id}` : '—'}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (e) => <Badge variant={e.is_active ? 'green' : 'gray'}>{e.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions', header: '', className: 'text-right',
      render: (e) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => openRoleModal(e)}>Change Role</Button>
          <Button
            size="sm"
            variant={e.is_active ? 'danger' : 'secondary'}
            onClick={() => { setStatusTarget(e); setStatusConfirm(true) }}
          >
            {e.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ]

  // ── filter options ────────────────────────────────────────────────────────

  const roleOptions = USER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))
  const deptOptions = departments.map((d) => ({ value: d.id, label: d.name }))

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-56">
          <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | '')}
            options={roleOptions}
            placeholder="All roles"
          />
        </div>
        <div className="w-44">
          <Select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            options={deptOptions}
            placeholder="All departments"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table columns={columns} data={items} loading={loading} keyExtractor={(e) => e.id} emptyMessage="No employees found." />
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={15} onPageChange={setPage} />
      </div>

      {/* Role change modal */}
      <Modal open={roleModal} onClose={() => { setRoleModal(false); setRoleTarget(null) }} title="Change Role" maxWidth="sm">
        <p className="mb-4 text-sm text-gray-600">
          Changing role for <strong>{roleTarget?.full_name}</strong>
        </p>
        {roleError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{roleError}</p>}
        <Select
          label="New Role"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as UserRole)}
          options={roleOptions}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setRoleModal(false); setRoleTarget(null) }} disabled={savingRole}>Cancel</Button>
          <Button onClick={handleRoleSave} isLoading={savingRole}>Save</Button>
        </div>
      </Modal>

      {/* Status confirm */}
      <ConfirmDialog
        open={statusConfirm}
        title={statusTarget?.is_active ? 'Deactivate Employee' : 'Activate Employee'}
        message={`${statusTarget?.is_active ? 'Deactivate' : 'Activate'} ${statusTarget?.full_name}?`}
        confirmLabel={statusTarget?.is_active ? 'Deactivate' : 'Activate'}
        variant={statusTarget?.is_active ? 'danger' : 'primary'}
        loading={confirmingStatus}
        onConfirm={handleStatusConfirm}
        onCancel={() => { setStatusConfirm(false); setStatusTarget(null) }}
      />
    </div>
  )
}
