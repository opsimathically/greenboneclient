import assert from 'node:assert/strict';
import test from 'node:test';

/*
To run this test:
GREENBONE_LIVE_USERNAME='username' \
GREENBONE_LIVE_PASSWORD='password' \
GREENBONE_LIVE_HOST='127.0.0.1' \
GREENBONE_LIVE_PORT='5555' \
npm run test:live
*/
import { GreenboneClient } from '../../src/classes/greenboneclient/GreenboneClient.class';

const enable_live_tests = process.env.GREENBONE_ENABLE_LIVE_TESTS === 'true';

const LiveTest = enable_live_tests ? test : test.skip;

LiveTest('Live GMP read-only integration smoke test', async () => {
  const username =
    process.env.GREENBONE_LIVE_USERNAME ?? process.env.greenbone_username;
  const password =
    process.env.GREENBONE_LIVE_PASSWORD ?? process.env.greenbone_password;
  const host = process.env.GREENBONE_LIVE_HOST ?? '127.0.0.1';
  const tcp_port = Number(process.env.GREENBONE_LIVE_PORT ?? '5555');

  assert.ok(
    username,
    'Set GREENBONE_LIVE_USERNAME (or greenbone_username) to run live tests.'
  );
  assert.ok(
    password,
    'Set GREENBONE_LIVE_PASSWORD (or greenbone_password) to run live tests.'
  );
  assert.ok(
    Number.isInteger(tcp_port),
    'GREENBONE_LIVE_PORT must be an integer.'
  );

  const greenbone_client = new GreenboneClient();

  const connect_result = await greenbone_client.connect({
    auth: {
      username,
      password
    },
    connection: {
      type: 'tcp',
      host,
      tcp_port
    }
  });

  assert.equal(
    connect_result,
    true,
    greenbone_client.getLastError() ?? 'Failed to connect.'
  );

  try {
    const version = await greenbone_client.getVersion();
    assert.ok(version, 'Expected getVersion() to return data.');

    const diagnostics = await greenbone_client.getDiagnostics();
    assert.ok(diagnostics.scanner_count >= 0);
    assert.ok(diagnostics.config_count >= 0);
    assert.ok(diagnostics.target_count >= 0);

    const users = await greenbone_client.getAllUsers();
    assert.ok(Array.isArray(users));

    const tasks = await greenbone_client.searchTasks({
      rows: 5,
      details: false
    });
    assert.ok(Array.isArray(tasks));

    const targets = await greenbone_client.getAllTargets();
    assert.ok(Array.isArray(targets));

    const scanners = await greenbone_client.getAllScanners();
    assert.ok(Array.isArray(scanners));

    const configs = await greenbone_client.getAllConfigs();
    assert.ok(Array.isArray(configs));

    const schedules = await greenbone_client.getAllSchedules();
    assert.ok(Array.isArray(schedules));

    const report_formats = await greenbone_client.getAllReportFormats();
    assert.ok(Array.isArray(report_formats));

    const alerts = await greenbone_client.getAllAlerts();
    assert.ok(Array.isArray(alerts));
  } finally {
    await greenbone_client.disconnect();
  }
});
