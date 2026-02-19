import assert from 'node:assert/strict';
import test from 'node:test';

import { GreenboneClient } from '../../src/classes/greenboneclient/GreenboneClient.class';
import type {
  connection_settings_t,
  gmp_transport_i
} from '../../src/classes/greenboneclient/types/greenboneclient_types';

class MockTransport implements gmp_transport_i {
  private connected = false;
  private queued_responses: string[];
  public sent_commands: { xml: string; expected_root_tag?: string }[] = [];

  constructor(params: { queued_responses: string[] }) {
    this.queued_responses = [...params.queued_responses];
  }

  async connect(params: {
    connection: connection_settings_t;
    timeout_ms?: number;
  }): Promise<void> {
    assert.ok(params.connection.type === 'tcp' || params.connection.type === 'unix_socket');
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendRaw(params: {
    xml: string;
    timeout_ms?: number;
    expected_root_tag?: string;
  }): Promise<string> {
    this.sent_commands.push({
      xml: params.xml,
      expected_root_tag: params.expected_root_tag
    });

    const next_response = this.queued_responses.shift();

    if (!next_response) {
      throw new Error('No queued response available in mock transport.');
    }

    return next_response;
  }
}

test('GreenboneClient connect + list methods parse users/tasks/port-lists', async () => {
  const mock_transport = new MockTransport({
    queued_responses: [
      '<authenticate_response status="200" status_text="OK"/>',
      '<get_users_response status="200" status_text="OK"><user id="u1"><name>alice</name><comment>admin user</comment><role><name>Admin</name></role></user></get_users_response>',
      '<get_tasks_response status="200" status_text="OK"><task id="t1"><name>weekly scan</name><status>Running</status><progress>50</progress><report_count>2</report_count></task></get_tasks_response>',
      '<get_port_lists_response status="200" status_text="OK"><port_list id="p1"><name>default</name><port_count>2</port_count></port_list></get_port_lists_response>'
    ]
  });

  const greenbone_client = new GreenboneClient({ transport: mock_transport });

  const did_connect = await greenbone_client.connect({
    auth: {
      username: 'user',
      password: 'pass'
    },
    connection: {
      type: 'tcp',
      host: '127.0.0.1',
      tcp_port: 9390
    }
  });

  assert.equal(did_connect, true);
  assert.equal(greenbone_client.isConnected(), true);
  assert.equal(greenbone_client.isAuthenticated(), true);

  const users = await greenbone_client.getAllUsers();
  assert.equal(users.length, 1);
  assert.equal(users[0].id, 'u1');
  assert.equal(users[0].name, 'alice');

  const tasks = await greenbone_client.getAllTasks();
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].id, 't1');
  assert.equal(tasks[0].progress, 50);

  const port_lists = await greenbone_client.portAllLists();
  assert.equal(port_lists.length, 1);
  assert.equal(port_lists[0].id, 'p1');

  assert.equal(mock_transport.sent_commands[0].expected_root_tag, 'authenticate_response');
  assert.equal(mock_transport.sent_commands[1].expected_root_tag, 'get_users_response');
});

test('GreenboneClient createTask builds task command and returns operation info', async () => {
  const mock_transport = new MockTransport({
    queued_responses: [
      '<authenticate_response status="200" status_text="OK"/>',
      '<create_task_response status="201" status_text="Created" id="task-999"/>'
    ]
  });

  const greenbone_client = new GreenboneClient({ transport: mock_transport });

  const did_connect = await greenbone_client.connect({
    auth: {
      username: 'user',
      password: 'pass'
    },
    connection: {
      type: 'unix_socket',
      socket_path: '/run/gvmd/gvmd.sock'
    }
  });

  assert.equal(did_connect, true);

  const create_task_result = await greenbone_client.createTask({
    name: 'new task',
    config_id: 'config-1',
    target_id: 'target-1',
    comment: 'created by test',
    alert_ids: ['alert-1', 'alert-2']
  });

  assert.equal(create_task_result.success, true);
  assert.equal(create_task_result.status_code, 201);
  assert.equal(create_task_result.resource_id, 'task-999');

  const sent_create_task_command = mock_transport.sent_commands[1].xml;

  assert.match(sent_create_task_command, /<create_task>/);
  assert.match(sent_create_task_command, /<name>new task<\/name>/);
  assert.match(sent_create_task_command, /<config id="config-1"\/>/);
  assert.match(sent_create_task_command, /<target id="target-1"\/>/);
  assert.match(sent_create_task_command, /<alert id="alert-1"\/>/);
  assert.match(sent_create_task_command, /<alert id="alert-2"\/>/);
});

test('GreenboneClient read-only inventory methods parse targets/configs/scanners/schedules/report-formats/alerts', async () => {
  const mock_transport = new MockTransport({
    queued_responses: [
      '<authenticate_response status="200" status_text="OK"/>',
      '<get_targets_response status="200" status_text="OK"><target id="target-1"><name>prod target</name><hosts>10.10.10.1,10.10.10.2</hosts><port_list id="pl-1"/></target></get_targets_response>',
      '<get_configs_response status="200" status_text="OK"><config id="cfg-1"><name>full and fast</name><usage_type>scan</usage_type><families><count>4</count></families><nvts><count>120</count></nvts></config></get_configs_response>',
      '<get_scanners_response status="200" status_text="OK"><scanner id="scanner-1"><name>main scanner</name><host>127.0.0.1</host><port>9391</port><type>OSP</type></scanner></get_scanners_response>',
      '<get_schedules_response status="200" status_text="OK"><schedule id="schedule-1"><name>nightly</name><timezone>UTC</timezone><next_time>2026-03-01T00:00:00Z</next_time></schedule></get_schedules_response>',
      '<get_report_formats_response status="200" status_text="OK"><report_format id="rf-1"><name>PDF</name><extension>pdf</extension><content_type>application/pdf</content_type><active>1</active></report_format></get_report_formats_response>',
      '<get_alerts_response status="200" status_text="OK"><alert id="alert-1"><name>mail alert</name><event><name>Task run status changed</name></event><condition><name>Always</name></condition><method><name>Email</name></method></alert></get_alerts_response>'
    ]
  });

  const greenbone_client = new GreenboneClient({ transport: mock_transport });
  const did_connect = await greenbone_client.connect({
    auth: { username: 'user', password: 'pass' },
    connection: { type: 'tcp', host: '127.0.0.1', tcp_port: 5555 }
  });

  assert.equal(did_connect, true);

  const targets = await greenbone_client.getAllTargets();
  assert.equal(targets.length, 1);
  assert.deepEqual(targets[0].hosts, ['10.10.10.1', '10.10.10.2']);
  assert.equal(targets[0].port_list_id, 'pl-1');

  const configs = await greenbone_client.getAllConfigs();
  assert.equal(configs.length, 1);
  assert.equal(configs[0].family_count, 4);
  assert.equal(configs[0].nvt_count, 120);

  const scanners = await greenbone_client.getAllScanners();
  assert.equal(scanners.length, 1);
  assert.equal(scanners[0].port, 9391);

  const schedules = await greenbone_client.getAllSchedules();
  assert.equal(schedules.length, 1);
  assert.equal(schedules[0].timezone, 'UTC');

  const report_formats = await greenbone_client.getAllReportFormats();
  assert.equal(report_formats.length, 1);
  assert.equal(report_formats[0].active, true);

  const alerts = await greenbone_client.getAllAlerts();
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].method, 'Email');
});

test('GreenboneClient getDiagnostics reports safe inventory counts', async () => {
  const mock_transport = new MockTransport({
    queued_responses: [
      '<authenticate_response status="200" status_text="OK"/>',
      '<get_version_response status="200" status_text="OK"><version>24.0</version></get_version_response>',
      '<get_scanners_response status="200" status_text="OK"><scanner id="scanner-1"/><scanner id="scanner-2"/></get_scanners_response>',
      '<get_configs_response status="200" status_text="OK"><config id="cfg-1"/></get_configs_response>',
      '<get_targets_response status="200" status_text="OK"><target id="target-1"/><target id="target-2"/><target id="target-3"/></get_targets_response>',
      '<get_schedules_response status="200" status_text="OK"><schedule id="schedule-1"/></get_schedules_response>',
      '<get_report_formats_response status="200" status_text="OK"><report_format id="rf-1"/><report_format id="rf-2"/></get_report_formats_response>',
      '<get_alerts_response status="200" status_text="OK"></get_alerts_response>'
    ]
  });

  const greenbone_client = new GreenboneClient({ transport: mock_transport });
  const did_connect = await greenbone_client.connect({
    auth: { username: 'user', password: 'pass' },
    connection: { type: 'tcp', host: '127.0.0.1', tcp_port: 5555 }
  });

  assert.equal(did_connect, true);

  const diagnostics = await greenbone_client.getDiagnostics();

  assert.equal(diagnostics.version?.version, '24');
  assert.equal(diagnostics.scanner_count, 2);
  assert.equal(diagnostics.config_count, 1);
  assert.equal(diagnostics.target_count, 3);
  assert.equal(diagnostics.schedule_count, 1);
  assert.equal(diagnostics.report_format_count, 2);
  assert.equal(diagnostics.alert_count, 0);
});

test('GreenboneClient getAllUsers falls back to paged retrieval when rows=-1 fails', async () => {
  const mock_transport = new MockTransport({
    queued_responses: [
      '<authenticate_response status="200" status_text="OK"/>',
      '<get_users_response status="400" status_text="Unsupported filter"/>',
      '<get_users_response status="200" status_text="OK"><user id="u1"><name>a</name></user><user id="u2"><name>b</name></user></get_users_response>'
    ]
  });

  const greenbone_client = new GreenboneClient({ transport: mock_transport });
  const did_connect = await greenbone_client.connect({
    auth: { username: 'user', password: 'pass' },
    connection: { type: 'tcp', host: '127.0.0.1', tcp_port: 5555 }
  });

  assert.equal(did_connect, true);

  const users = await greenbone_client.getAllUsers();
  assert.equal(users.length, 2);
  assert.equal(users[0].id, 'u1');
  assert.equal(users[1].id, 'u2');

  assert.equal(mock_transport.sent_commands[1].xml, '<get_users filter="rows=-1"/>');
  assert.equal(
    mock_transport.sent_commands[2].xml,
    '<get_users filter="first=1 rows=200"/>'
  );
});
