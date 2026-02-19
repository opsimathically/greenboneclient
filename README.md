# greenboneclient

The goal of this project is to provide a TypeScript interface to the Greenbone Management Daemon (GMP), helping developers manage Greenbone deployments with a higher-level client API.

Supported areas include:
- users
- tasks
- port lists
- credentials
- targets
- scan configs
- scanners
- schedules
- report formats
- alerts
- diagnostics/capabilities
- scan/task lifecycle controls

## Install

```bash
npm install @opsimathically/greenboneclient
```

## Build from source

```bash
npm install
npm run build
```

## Usage

### TCP connection

```typescript
import { GreenboneClient } from '@opsimathically/greenboneclient';

(async function () {
  const greenboneclient = new GreenboneClient();

  const connect_result = await greenboneclient.connect({
    auth: {
      username: process.env.greenbone_username,
      password: process.env.greenbone_password
    },
    connection: {
      type: 'tcp',
      host: '127.0.0.1',
      tcp_port: 9390
    }
  });

  if (!connect_result) {
    console.error(greenboneclient.getLastError());
    return;
  }

  const users = await greenboneclient.getAllUsers();
  const tasks = await greenboneclient.getAllTasks();
  const port_lists = await greenboneclient.getAllPortLists();

  const found_users = await greenboneclient.searchUsers({
    query_text: 'name~admin',
    details: true,
    rows: 50
  });

  console.log({ users, tasks, port_lists, found_users });

  await greenboneclient.disconnect();
})();
```

### Unix socket connection

```typescript
import { GreenboneClient } from '@opsimathically/greenboneclient';

(async function () {
  const greenboneclient = new GreenboneClient();

  const connect_result = await greenboneclient.connect({
    auth: {
      username: process.env.greenbone_username,
      password: process.env.greenbone_password
    },
    connection: {
      type: 'unix_socket',
      socket_path: '/run/gvmd/gvmd.sock'
    }
  });

  if (!connect_result) {
    return;
  }

  const create_task_result = await greenboneclient.createTask({
    name: 'Example Task',
    config_id: 'CONFIG_UUID',
    target_id: 'TARGET_UUID'
  });

  if (create_task_result.resource_id) {
    await greenboneclient.startTask({ task_id: create_task_result.resource_id });
  }

  await greenboneclient.disconnect();
})();
```

## Implemented API highlights

- connection/auth
  - `connect`
  - `disconnect`
  - `isConnected`
  - `isAuthenticated`
  - `getLastError`
- list/search
  - `getAllUsers`, `searchUsers`
  - `getAllTasks`, `searchTasks`
  - `getAllPortLists`, `portAllLists`, `searchPortLists`
  - `getAllCredentials`, `searchCredentials`
  - `getAllTargets`, `searchTargets`
  - `getAllConfigs`, `searchConfigs`
  - `getAllScanners`, `searchScanners`
  - `getAllSchedules`, `searchSchedules`
  - `getAllReportFormats`, `searchReportFormats`
  - `getAllAlerts`, `searchAlerts`
- task lifecycle
  - `createTask`, `updateTask`, `deleteTask`
  - `startTask`, `stopTask`, `pauseTask`, `resumeTask`
  - `getTaskStatus`, `getTaskReport`
- port list lifecycle
  - `createPortList`, `updatePortList`, `deletePortList`
- credentials
  - `createCredential`, `deleteCredential`
- diagnostics
  - `getVersion`
  - `getDiagnostics`
  - `getCapabilities`
- low-level utility
  - `executeRawCommand`

## Testing against live gvmd (read-only only)

The live integration test is opt-in and only uses non-destructive read commands (`get_*` calls).

```bash
GREENBONE_LIVE_USERNAME='your_username' \
GREENBONE_LIVE_PASSWORD='your_password' \
GREENBONE_LIVE_HOST='127.0.0.1' \
GREENBONE_LIVE_PORT='5555' \
npm run test:live
```

You can also use `greenbone_username` and `greenbone_password` environment variables.

## API docs

[See API Reference for documentation](https://github.com/opsimathically/greenboneclient/docs/)
