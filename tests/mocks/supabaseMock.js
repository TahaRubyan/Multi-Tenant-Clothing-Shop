/**
 * In-memory fake for @supabase/supabase-js used by every test via
 * tests/setup.js's vi.mock. Tests must NEVER make a real network call to any
 * Supabase project (prod or dev) - a prior incident where the live test
 * suite hit production directly and littered it with dozens of throwaway
 * tenants/accounts is exactly what this prevents from ever happening again.
 *
 * Supports the specific subset of the supabase-js API this codebase
 * actually uses (see src/utils/supabaseClient.js): chained query building
 * (select/insert/upsert/delete/eq/neq/in/order/maybeSingle), and the auth
 * methods used by src/context/POSContext.jsx's login()/logout()/etc.
 */

const UNIQUE_COLUMNS = {
  users: ['username'],
  profiles: ['username'],
};

function matchesFilters(row, filters) {
  return filters.every(([type, col, val]) => {
    if (type === 'eq') return row[col] === val;
    if (type === 'neq') return row[col] !== val;
    if (type === 'in') return Array.isArray(val) && val.includes(row[col]);
    return true;
  });
}

function uniqueViolation(column) {
  return {
    data: null,
    error: {
      code: '23505',
      message: `duplicate key value violates unique constraint "${column}"`,
    },
  };
}

function createQueryBuilder(tables, tableName) {
  if (!tables[tableName]) tables[tableName] = [];
  const table = tables[tableName];

  let mode = null; // 'select' | 'insert' | 'upsert' | 'delete'
  let payload = null;
  let upsertOptions = null;
  const filters = [];
  let orderCol = null;
  let orderAsc = true;
  let single = false;

  const builder = {
    select() {
      mode = mode || 'select';
      return builder;
    },
    insert(rows) {
      mode = 'insert';
      payload = rows;
      return builder;
    },
    upsert(rows, options) {
      mode = 'upsert';
      payload = rows;
      upsertOptions = options;
      return builder;
    },
    delete() {
      mode = 'delete';
      return builder;
    },
    eq(col, val) {
      filters.push(['eq', col, val]);
      return builder;
    },
    neq(col, val) {
      filters.push(['neq', col, val]);
      return builder;
    },
    in(col, vals) {
      filters.push(['in', col, vals]);
      return builder;
    },
    order(col, opts) {
      orderCol = col;
      orderAsc = !(opts && opts.ascending === false);
      return builder;
    },
    maybeSingle() {
      single = true;
      return builder;
    },
    then(onResolve, onReject) {
      return execute().then(onResolve, onReject);
    },
  };

  async function execute() {
    if (mode === 'insert' || mode === 'upsert') {
      const rows = Array.isArray(payload) ? payload : [payload];
      const conflictCol = upsertOptions?.onConflict || 'id';
      const resultRows = [];

      for (const row of rows) {
        for (const uniqueCol of UNIQUE_COLUMNS[tableName] || []) {
          if (uniqueCol === conflictCol) continue;
          const clash = table.find(r => r[uniqueCol] === row[uniqueCol] && r[conflictCol] !== row[conflictCol]);
          if (clash) return uniqueViolation(uniqueCol);
        }

        const idx = table.findIndex(r => r[conflictCol] === row[conflictCol]);
        if (idx >= 0 && mode === 'upsert') {
          table[idx] = { ...table[idx], ...row };
          resultRows.push(table[idx]);
        } else {
          table.push(row);
          resultRows.push(row);
        }
      }
      return { data: resultRows, error: null };
    }

    if (mode === 'delete') {
      const toDelete = table.filter(r => matchesFilters(r, filters));
      tables[tableName] = table.filter(r => !matchesFilters(r, filters));
      return { data: toDelete, error: null };
    }

    // select
    let result = table.filter(r => matchesFilters(r, filters));
    if (orderCol) {
      result = [...result].sort((a, b) => {
        if (a[orderCol] < b[orderCol]) return orderAsc ? -1 : 1;
        if (a[orderCol] > b[orderCol]) return orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (single) return { data: result[0] || null, error: null };
    return { data: result, error: null };
  }

  return builder;
}

function createAuthMock(authUsersByEmail) {
  let currentSession = null;
  let nextId = 1;

  return {
    async signUp({ email, password }) {
      if (authUsersByEmail.has(email)) {
        return { data: { user: null, session: null }, error: { message: 'User already registered', code: 'user_already_exists' } };
      }
      const id = `test-uid-${nextId++}-${Math.random().toString(36).slice(2, 8)}`;
      authUsersByEmail.set(email, { id, email, password });
      const user = { id, email };
      currentSession = { access_token: `tok-${id}`, refresh_token: `ref-${id}`, user };
      return { data: { user, session: currentSession }, error: null };
    },
    async signInWithPassword({ email, password }) {
      const rec = authUsersByEmail.get(email);
      if (!rec || rec.password !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } };
      }
      const user = { id: rec.id, email };
      currentSession = { access_token: `tok-${rec.id}`, refresh_token: `ref-${rec.id}`, user };
      return { data: { user, session: currentSession }, error: null };
    },
    async signOut() {
      currentSession = null;
      return { error: null };
    },
    async getSession() {
      return { data: { session: currentSession }, error: null };
    },
    async setSession({ access_token }) {
      const id = String(access_token || '').replace(/^tok-/, '');
      const rec = [...authUsersByEmail.values()].find(u => u.id === id);
      currentSession = rec ? { access_token, refresh_token: `ref-${id}`, user: { id: rec.id, email: rec.email } } : null;
      return { data: { session: currentSession }, error: null };
    },
    async updateUser({ password }) {
      if (!currentSession) return { data: null, error: { message: 'Not authenticated' } };
      const rec = [...authUsersByEmail.values()].find(u => u.id === currentSession.user.id);
      if (rec && password) rec.password = password;
      return { data: { user: currentSession.user }, error: null };
    },
  };
}

export function createFakeSupabaseClient() {
  const tables = {};
  const authUsersByEmail = new Map();

  return {
    auth: createAuthMock(authUsersByEmail),
    from(tableName) {
      return createQueryBuilder(tables, tableName);
    },
    channel() {
      const chan = { on: () => chan, subscribe: () => chan };
      return chan;
    },
    removeChannel() {},
  };
}
