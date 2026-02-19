import { GmpSocketTransport } from './transports/GmpSocketTransport.class';
import type {
  alert_search_parameters_t,
  alert_summary_t,
  config_search_parameters_t,
  config_summary_t,
  connect_parameters_t,
  create_credential_parameters_t,
  create_port_list_parameters_t,
  create_task_parameters_t,
  credential_search_parameters_t,
  credential_summary_t,
  delete_credential_parameters_t,
  delete_port_list_parameters_t,
  delete_task_parameters_t,
  diagnostics_information_t,
  gmp_command_result_t,
  gmp_operation_result_t,
  gmp_transport_i,
  gmp_version_information_t,
  report_format_search_parameters_t,
  report_format_summary_t,
  scanner_search_parameters_t,
  scanner_summary_t,
  schedule_search_parameters_t,
  schedule_summary_t,
  list_search_parameters_t,
  port_list_search_parameters_t,
  port_list_summary_t,
  target_search_parameters_t,
  target_summary_t,
  task_action_parameters_t,
  task_search_parameters_t,
  task_status_t,
  task_summary_t,
  update_port_list_parameters_t,
  update_task_parameters_t,
  user_search_parameters_t,
  user_summary_t,
  get_task_status_parameters_t,
  get_task_report_parameters_t
} from './types/greenboneclient_types';
import {
  BuildGetCommandAttributes,
  ConvertValueToArray,
  EscapeXmlValue,
  GetRootTagNameFromParsedXml,
  ParseXmlDocument,
  IsStatusSuccess,
  ReadNumberValue,
  ReadResourceIdFromResponseNode,
  ReadStatusFromResponseNode,
  ReadStringValue
} from './utils/greenboneclient_xml_utils';

const default_timeout_ms = 20000;

export class GreenboneClient {
  private transport: gmp_transport_i;
  private command_timeout_ms: number;
  private connected = false;
  private authenticated = false;
  private last_error_message: string | null = null;

  constructor(params?: { transport?: gmp_transport_i; default_timeout_ms?: number }) {
    this.transport = params?.transport ?? new GmpSocketTransport();
    this.command_timeout_ms = params?.default_timeout_ms ?? default_timeout_ms;
  }

  async connect(params: connect_parameters_t): Promise<boolean> {
    this.last_error_message = null;

    if (!params.auth.username || !params.auth.password) {
      this.last_error_message =
        'Missing required authentication values: username and password are required.';
      return false;
    }

    try {
      await this.transport.connect({
        connection: params.connection,
        timeout_ms: params.timeout_ms ?? params.connection.timeout_ms
      });

      this.connected = true;
      this.authenticated = false;

      const did_authenticate = await this.authenticate({
        username: params.auth.username,
        password: params.auth.password,
        timeout_ms: params.timeout_ms
      });

      if (!did_authenticate) {
        await this.disconnect();
        return false;
      }

      this.authenticated = true;
      return true;
    } catch (error: any) {
      this.last_error_message = error?.message ?? String(error);
      await this.disconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.authenticated = false;
    this.connected = false;

    await this.transport.disconnect();
  }

  isConnected(): boolean {
    return this.connected && this.transport.isConnected();
  }

  isAuthenticated(): boolean {
    return this.isConnected() && this.authenticated;
  }

  getLastError(): string | null {
    return this.last_error_message;
  }

  async getAllUsers(): Promise<user_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_users',
      expected_root_tag: 'get_users_response',
      entity_name: 'user',
      map_response: (command_result) => this.mapUsers({ command_result })
    });
  }

  async searchUsers(params: user_search_parameters_t): Promise<user_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_users${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_users_response'
    });

    return this.mapUsers({ command_result });
  }

  async getAllTasks(): Promise<task_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_tasks',
      expected_root_tag: 'get_tasks_response',
      entity_name: 'task',
      map_response: (command_result) => this.mapTasks({ command_result })
    });
  }

  async searchTasks(params: task_search_parameters_t): Promise<task_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_tasks${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_tasks_response'
    });

    return this.mapTasks({ command_result });
  }

  async getAllPortLists(): Promise<port_list_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_port_lists',
      expected_root_tag: 'get_port_lists_response',
      entity_name: 'port_list',
      map_response: (command_result) => this.mapPortLists({ command_result })
    });
  }

  async portAllLists(): Promise<port_list_summary_t[]> {
    return this.getAllPortLists();
  }

  async searchPortLists(
    params: port_list_search_parameters_t
  ): Promise<port_list_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_port_lists${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_port_lists_response'
    });

    return this.mapPortLists({ command_result });
  }

  async getAllCredentials(): Promise<credential_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_credentials',
      expected_root_tag: 'get_credentials_response',
      entity_name: 'credential',
      map_response: (command_result) => this.mapCredentials({ command_result })
    });
  }

  async searchCredentials(
    params: credential_search_parameters_t
  ): Promise<credential_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_credentials${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_credentials_response'
    });

    return this.mapCredentials({ command_result });
  }

  async getAllTargets(): Promise<target_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_targets',
      expected_root_tag: 'get_targets_response',
      entity_name: 'target',
      map_response: (command_result) => this.mapTargets({ command_result })
    });
  }

  async searchTargets(params: target_search_parameters_t): Promise<target_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_targets${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_targets_response'
    });

    return this.mapTargets({ command_result });
  }

  async getAllConfigs(): Promise<config_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_configs',
      expected_root_tag: 'get_configs_response',
      entity_name: 'config',
      map_response: (command_result) => this.mapConfigs({ command_result })
    });
  }

  async searchConfigs(params: config_search_parameters_t): Promise<config_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_configs${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_configs_response'
    });

    return this.mapConfigs({ command_result });
  }

  async getAllScanners(): Promise<scanner_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_scanners',
      expected_root_tag: 'get_scanners_response',
      entity_name: 'scanner',
      map_response: (command_result) => this.mapScanners({ command_result })
    });
  }

  async searchScanners(
    params: scanner_search_parameters_t
  ): Promise<scanner_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_scanners${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_scanners_response'
    });

    return this.mapScanners({ command_result });
  }

  async getAllSchedules(): Promise<schedule_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_schedules',
      expected_root_tag: 'get_schedules_response',
      entity_name: 'schedule',
      map_response: (command_result) => this.mapSchedules({ command_result })
    });
  }

  async searchSchedules(
    params: schedule_search_parameters_t
  ): Promise<schedule_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_schedules${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_schedules_response'
    });

    return this.mapSchedules({ command_result });
  }

  async getAllReportFormats(): Promise<report_format_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_report_formats',
      expected_root_tag: 'get_report_formats_response',
      entity_name: 'report_format',
      map_response: (command_result) => this.mapReportFormats({ command_result })
    });
  }

  async searchReportFormats(
    params: report_format_search_parameters_t
  ): Promise<report_format_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_report_formats${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_report_formats_response'
    });

    return this.mapReportFormats({ command_result });
  }

  async getAllAlerts(): Promise<alert_summary_t[]> {
    return this.fetchAllEntities({
      command_name: 'get_alerts',
      expected_root_tag: 'get_alerts_response',
      entity_name: 'alert',
      map_response: (command_result) => this.mapAlerts({ command_result })
    });
  }

  async searchAlerts(params: alert_search_parameters_t): Promise<alert_summary_t[]> {
    const merged_parameters = this.mergeSearchParameters({
      search_parameters: params,
      query_text: params.query_text
    });

    const command_xml = `<get_alerts${BuildGetCommandAttributes({
      search_parameters: merged_parameters
    })}/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_alerts_response'
    });

    return this.mapAlerts({ command_result });
  }

  async createTask(params: create_task_parameters_t): Promise<gmp_operation_result_t> {
    const command_fragments: string[] = [
      '<create_task>',
      `<name>${EscapeXmlValue({ value: params.name })}</name>`,
      `<config id="${EscapeXmlValue({ value: params.config_id })}"/>`,
      `<target id="${EscapeXmlValue({ value: params.target_id })}"/>`
    ];

    if (params.comment) {
      command_fragments.push(
        `<comment>${EscapeXmlValue({ value: params.comment })}</comment>`
      );
    }

    if (params.scanner_id) {
      command_fragments.push(
        `<scanner id="${EscapeXmlValue({ value: params.scanner_id })}"/>`
      );
    }

    if (params.alterable !== undefined) {
      command_fragments.push(`<alterable>${params.alterable ? 1 : 0}</alterable>`);
    }

    if (params.schedule_id) {
      command_fragments.push(
        `<schedule id="${EscapeXmlValue({ value: params.schedule_id })}"/>`
      );
    }

    if (params.alert_ids?.length) {
      for (const alert_id of params.alert_ids) {
        command_fragments.push(
          `<alert id="${EscapeXmlValue({ value: alert_id })}"/>`
        );
      }
    }

    command_fragments.push('</create_task>');

    const command_result = await this.executeAuthenticatedCommand({
      command_xml: command_fragments.join(''),
      expected_root_tag: 'create_task_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async updateTask(params: update_task_parameters_t): Promise<gmp_operation_result_t> {
    const command_fragments: string[] = [
      `<modify_task task_id="${EscapeXmlValue({ value: params.task_id })}">`
    ];

    if (params.name) {
      command_fragments.push(`<name>${EscapeXmlValue({ value: params.name })}</name>`);
    }

    if (params.comment) {
      command_fragments.push(
        `<comment>${EscapeXmlValue({ value: params.comment })}</comment>`
      );
    }

    if (params.alterable !== undefined) {
      command_fragments.push(`<alterable>${params.alterable ? 1 : 0}</alterable>`);
    }

    if (params.config_id) {
      command_fragments.push(
        `<config id="${EscapeXmlValue({ value: params.config_id })}"/>`
      );
    }

    if (params.target_id) {
      command_fragments.push(
        `<target id="${EscapeXmlValue({ value: params.target_id })}"/>`
      );
    }

    if (params.scanner_id) {
      command_fragments.push(
        `<scanner id="${EscapeXmlValue({ value: params.scanner_id })}"/>`
      );
    }

    if (params.schedule_id) {
      command_fragments.push(
        `<schedule id="${EscapeXmlValue({ value: params.schedule_id })}"/>`
      );
    }

    command_fragments.push('</modify_task>');

    const command_result = await this.executeAuthenticatedCommand({
      command_xml: command_fragments.join(''),
      expected_root_tag: 'modify_task_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async deleteTask(params: delete_task_parameters_t): Promise<gmp_operation_result_t> {
    const command_xml = `<delete_task task_id="${EscapeXmlValue({
      value: params.task_id
    })}" ultimate="${params.ultimate ? 1 : 0}"/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'delete_task_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async startTask(params: task_action_parameters_t): Promise<gmp_operation_result_t> {
    return this.executeTaskAction({
      command_name: 'start_task',
      expected_root_tag: 'start_task_response',
      task_id: params.task_id
    });
  }

  async stopTask(params: task_action_parameters_t): Promise<gmp_operation_result_t> {
    return this.executeTaskAction({
      command_name: 'stop_task',
      expected_root_tag: 'stop_task_response',
      task_id: params.task_id
    });
  }

  async pauseTask(params: task_action_parameters_t): Promise<gmp_operation_result_t> {
    return this.executeTaskAction({
      command_name: 'pause_task',
      expected_root_tag: 'pause_task_response',
      task_id: params.task_id
    });
  }

  async resumeTask(params: task_action_parameters_t): Promise<gmp_operation_result_t> {
    return this.executeTaskAction({
      command_name: 'resume_task',
      expected_root_tag: 'resume_task_response',
      task_id: params.task_id
    });
  }

  async getTaskStatus(params: get_task_status_parameters_t): Promise<task_status_t | null> {
    const command_xml = `<get_tasks task_id="${EscapeXmlValue({
      value: params.task_id
    })}" details="1"/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_tasks_response'
    });

    const task_nodes = this.getEntityNodes({
      root_node: command_result.response_root_node,
      entity_name: 'task'
    });

    if (task_nodes.length === 0) {
      return null;
    }

    const task_node = task_nodes[0];

    return {
      task_id: ReadStringValue({ value: task_node?.['@_id'] }) ?? params.task_id,
      name: ReadStringValue({ value: task_node?.name }) ?? '',
      status: ReadStringValue({
        value: task_node?.status ?? task_node?.scan_run_status
      }),
      progress: ReadNumberValue({ value: task_node?.progress }),
      report_id: this.readFirstStringFromCandidates({
        node: task_node,
        candidate_paths: [
          ['last_report', 'report', '@_id'],
          ['last_report', '@_id'],
          ['current_report', 'report', '@_id'],
          ['current_report', '@_id']
        ]
      })
    };
  }

  async getTaskReport(
    params: get_task_report_parameters_t
  ): Promise<gmp_command_result_t | null> {
    let report_id = params.report_id ?? null;

    if (!report_id) {
      const task_status = await this.getTaskStatus({ task_id: params.task_id });
      report_id = task_status?.report_id ?? null;
    }

    if (!report_id) {
      return null;
    }

    const details_attribute = params.details === undefined ? '1' : params.details ? '1' : '0';

    const format_fragment = params.format_id
      ? ` format_id="${EscapeXmlValue({ value: params.format_id })}"`
      : '';

    const command_xml = `<get_reports report_id="${EscapeXmlValue({
      value: report_id
    })}" details="${details_attribute}"${format_fragment}/>`;

    return this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'get_reports_response'
    });
  }

  async createPortList(
    params: create_port_list_parameters_t
  ): Promise<gmp_operation_result_t> {
    const command_fragments: string[] = [
      '<create_port_list>',
      `<name>${EscapeXmlValue({ value: params.name })}</name>`,
      `<port_range>${EscapeXmlValue({ value: params.port_range })}</port_range>`
    ];

    if (params.comment) {
      command_fragments.push(
        `<comment>${EscapeXmlValue({ value: params.comment })}</comment>`
      );
    }

    command_fragments.push('</create_port_list>');

    const command_result = await this.executeAuthenticatedCommand({
      command_xml: command_fragments.join(''),
      expected_root_tag: 'create_port_list_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async updatePortList(
    params: update_port_list_parameters_t
  ): Promise<gmp_operation_result_t> {
    const command_fragments: string[] = [
      `<modify_port_list port_list_id="${EscapeXmlValue({
        value: params.port_list_id
      })}">`
    ];

    if (params.name) {
      command_fragments.push(`<name>${EscapeXmlValue({ value: params.name })}</name>`);
    }

    if (params.comment) {
      command_fragments.push(
        `<comment>${EscapeXmlValue({ value: params.comment })}</comment>`
      );
    }

    command_fragments.push('</modify_port_list>');

    const command_result = await this.executeAuthenticatedCommand({
      command_xml: command_fragments.join(''),
      expected_root_tag: 'modify_port_list_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async deletePortList(
    params: delete_port_list_parameters_t
  ): Promise<gmp_operation_result_t> {
    const command_xml = `<delete_port_list port_list_id="${EscapeXmlValue({
      value: params.port_list_id
    })}" ultimate="${params.ultimate ? 1 : 0}"/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'delete_port_list_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async createCredential(
    params: create_credential_parameters_t
  ): Promise<gmp_operation_result_t> {
    const command_fragments: string[] = [
      '<create_credential>',
      `<name>${EscapeXmlValue({ value: params.name })}</name>`,
      `<login>${EscapeXmlValue({ value: params.login })}</login>`,
      `<password>${EscapeXmlValue({ value: params.password })}</password>`
    ];

    if (params.comment) {
      command_fragments.push(
        `<comment>${EscapeXmlValue({ value: params.comment })}</comment>`
      );
    }

    if (params.allow_insecure !== undefined) {
      command_fragments.push(
        `<allow_insecure>${params.allow_insecure ? 1 : 0}</allow_insecure>`
      );
    }

    command_fragments.push('</create_credential>');

    const command_result = await this.executeAuthenticatedCommand({
      command_xml: command_fragments.join(''),
      expected_root_tag: 'create_credential_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async deleteCredential(
    params: delete_credential_parameters_t
  ): Promise<gmp_operation_result_t> {
    const command_xml = `<delete_credential credential_id="${EscapeXmlValue({
      value: params.credential_id
    })}" ultimate="${params.ultimate ? 1 : 0}"/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: 'delete_credential_response'
    });

    return this.mapOperationResult({ command_result });
  }

  async getVersion(): Promise<gmp_version_information_t | null> {
    const command_result = await this.executeAuthenticatedCommand({
      command_xml: '<get_version/>',
      expected_root_tag: 'get_version_response'
    });

    return {
      raw_response: command_result,
      version: this.readFirstStringFromCandidates({
        node: command_result.response_root_node,
        candidate_paths: [
          ['version'],
          ['get_version_response', 'version'],
          ['gvmd_version']
        ]
      })
    };
  }

  async getDiagnostics(): Promise<diagnostics_information_t> {
    const version = await this.getVersion();
    const scanners = await this.getAllScanners();
    const configs = await this.getAllConfigs();
    const targets = await this.getAllTargets();
    const schedules = await this.getAllSchedules();
    const report_formats = await this.getAllReportFormats();
    const alerts = await this.getAllAlerts();

    return {
      version,
      scanner_count: scanners.length,
      config_count: configs.length,
      target_count: targets.length,
      schedule_count: schedules.length,
      report_format_count: report_formats.length,
      alert_count: alerts.length
    };
  }

  async getCapabilities(): Promise<{
    protocol_version: gmp_version_information_t | null;
    diagnostics: diagnostics_information_t;
  }> {
    const diagnostics = await this.getDiagnostics();

    return {
      protocol_version: diagnostics.version,
      diagnostics
    };
  }

  async executeRawCommand(params: {
    command_xml: string;
    expected_root_tag?: string;
    timeout_ms?: number;
  }): Promise<gmp_command_result_t> {
    const expected_root_tag =
      params.expected_root_tag ?? this.deriveExpectedRootTag({ command_xml: params.command_xml });

    return this.executeAuthenticatedCommand({
      command_xml: params.command_xml,
      expected_root_tag,
      timeout_ms: params.timeout_ms
    });
  }

  private async authenticate(params: {
    username: string;
    password: string;
    timeout_ms?: number;
  }): Promise<boolean> {
    const modern_authenticate_xml =
      '<authenticate>' +
      '<credentials>' +
      `<username>${EscapeXmlValue({ value: params.username })}</username>` +
      `<password>${EscapeXmlValue({ value: params.password })}</password>` +
      '</credentials>' +
      '</authenticate>';

    const modern_response = await this.executeCommand({
      command_xml: modern_authenticate_xml,
      expected_root_tag: 'authenticate_response',
      timeout_ms: params.timeout_ms,
      require_authenticated: false
    });

    if (modern_response.ok) {
      return true;
    }

    const legacy_authenticate_xml =
      '<authenticate>' +
      `<username>${EscapeXmlValue({ value: params.username })}</username>` +
      `<password>${EscapeXmlValue({ value: params.password })}</password>` +
      '</authenticate>';

    const legacy_response = await this.executeCommand({
      command_xml: legacy_authenticate_xml,
      expected_root_tag: 'authenticate_response',
      timeout_ms: params.timeout_ms,
      require_authenticated: false
    });

    return legacy_response.ok;
  }

  private async executeTaskAction(params: {
    command_name: string;
    expected_root_tag: string;
    task_id: string;
  }): Promise<gmp_operation_result_t> {
    const command_xml = `<${params.command_name} task_id="${EscapeXmlValue({
      value: params.task_id
    })}"/>`;

    const command_result = await this.executeAuthenticatedCommand({
      command_xml,
      expected_root_tag: params.expected_root_tag
    });

    return this.mapOperationResult({ command_result });
  }

  private async executeAuthenticatedCommand(params: {
    command_xml: string;
    expected_root_tag: string;
    timeout_ms?: number;
  }): Promise<gmp_command_result_t> {
    return this.executeCommand({
      ...params,
      require_authenticated: true
    });
  }

  private async executeCommand(params: {
    command_xml: string;
    expected_root_tag: string;
    timeout_ms?: number;
    require_authenticated: boolean;
  }): Promise<gmp_command_result_t> {
    if (params.require_authenticated) {
      this.ensureAuthenticated();
    } else {
      this.ensureConnected();
    }

    const response_xml = await this.transport.sendRaw({
      xml: params.command_xml,
      timeout_ms: params.timeout_ms ?? this.command_timeout_ms,
      expected_root_tag: params.expected_root_tag
    });

    const response_json = ParseXmlDocument({ xml: response_xml });
    const response_root_tag = GetRootTagNameFromParsedXml({ parsed_xml: response_json });
    const response_root_node = response_json[response_root_tag];
    const status = ReadStatusFromResponseNode({ root_node: response_root_node });

    const ok =
      IsStatusSuccess({ status_code: status.status_code }) ||
      (status.status_code === null && response_root_tag.endsWith('_response'));

    if (!ok) {
      this.last_error_message =
        status.status_text ??
        `Command failed with root response tag "${response_root_tag}" and no status text.`;
    }

    return {
      ok,
      status,
      response_xml,
      response_json,
      response_root_tag,
      response_root_node
    };
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Not connected. Call connect() first.');
    }
  }

  private ensureAuthenticated(): void {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Call connect() with valid credentials first.');
    }
  }

  private async fetchAllEntities<T>(params: {
    command_name: string;
    expected_root_tag: string;
    entity_name: string;
    map_response: (command_result: gmp_command_result_t) => T[];
  }): Promise<T[]> {
    const all_rows_command_result = await this.executeAuthenticatedCommand({
      command_xml: `<${params.command_name} filter="rows=-1"/>`,
      expected_root_tag: params.expected_root_tag
    });

    if (all_rows_command_result.ok) {
      return params.map_response(all_rows_command_result);
    }

    const page_size = 200;
    let first = 1;
    const all_results: T[] = [];

    while (true) {
      const paged_command_result = await this.executeAuthenticatedCommand({
        command_xml: `<${params.command_name} filter="first=${first} rows=${page_size}"/>`,
        expected_root_tag: params.expected_root_tag
      });

      if (!paged_command_result.ok) {
        throw new Error(
          paged_command_result.status.status_text ??
            `Unable to retrieve all ${params.entity_name} rows via pagination.`
        );
      }

      const page_results = params.map_response(paged_command_result);
      all_results.push(...page_results);

      const page_entity_count = this.getEntityNodes({
        root_node: paged_command_result.response_root_node,
        entity_name: params.entity_name
      }).length;

      if (page_entity_count < page_size) {
        this.last_error_message = null;
        break;
      }

      first += page_size;
    }

    return all_results;
  }

  private mapUsers(params: { command_result: gmp_command_result_t }): user_summary_t[] {
    const user_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'user'
    });

    return user_nodes.map((user_node: any) => ({
      id: ReadStringValue({ value: user_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: user_node?.name }) ?? '',
      comment: ReadStringValue({ value: user_node?.comment }),
      role:
        this.readFirstStringFromCandidates({
          node: user_node,
          candidate_paths: [['role', 'name'], ['role']]
        }) ?? null
    }));
  }

  private mapTasks(params: { command_result: gmp_command_result_t }): task_summary_t[] {
    const task_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'task'
    });

    return task_nodes.map((task_node: any) => ({
      id: ReadStringValue({ value: task_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: task_node?.name }) ?? '',
      comment: ReadStringValue({ value: task_node?.comment }),
      status: ReadStringValue({
        value: task_node?.status ?? task_node?.scan_run_status
      }),
      progress: ReadNumberValue({ value: task_node?.progress }),
      report_count: ReadNumberValue({
        value:
          task_node?.report_count ?? task_node?.reports?.count ?? task_node?.result_count
      })
    }));
  }

  private mapPortLists(params: {
    command_result: gmp_command_result_t;
  }): port_list_summary_t[] {
    const port_list_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'port_list'
    });

    return port_list_nodes.map((port_list_node: any) => ({
      id: ReadStringValue({ value: port_list_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: port_list_node?.name }) ?? '',
      comment: ReadStringValue({ value: port_list_node?.comment }),
      port_count: ReadNumberValue({
        value:
          port_list_node?.port_count ??
          port_list_node?.ports?.count ??
          port_list_node?.count
      })
    }));
  }

  private mapCredentials(params: {
    command_result: gmp_command_result_t;
  }): credential_summary_t[] {
    const credential_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'credential'
    });

    return credential_nodes.map((credential_node: any) => ({
      id: ReadStringValue({ value: credential_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: credential_node?.name }) ?? '',
      comment: ReadStringValue({ value: credential_node?.comment }),
      login:
        this.readFirstStringFromCandidates({
          node: credential_node,
          candidate_paths: [['login'], ['credential_login'], ['auth', 'login']]
        }) ?? null
    }));
  }

  private mapTargets(params: { command_result: gmp_command_result_t }): target_summary_t[] {
    const target_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'target'
    });

    return target_nodes.map((target_node: any) => ({
      id: ReadStringValue({ value: target_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: target_node?.name }) ?? '',
      comment: ReadStringValue({ value: target_node?.comment }),
      hosts: this.normalizeHostList({
        raw_hosts:
          this.readFirstStringFromCandidates({
            node: target_node,
            candidate_paths: [['hosts'], ['host']]
          }) ?? ''
      }),
      port_list_id:
        this.readFirstStringFromCandidates({
          node: target_node,
          candidate_paths: [
            ['port_list', '@_id'],
            ['port_list', 'port_list', '@_id']
          ]
        }) ?? null
    }));
  }

  private mapConfigs(params: { command_result: gmp_command_result_t }): config_summary_t[] {
    const config_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'config'
    });

    return config_nodes.map((config_node: any) => ({
      id: ReadStringValue({ value: config_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: config_node?.name }) ?? '',
      comment: ReadStringValue({ value: config_node?.comment }),
      usage_type:
        this.readFirstStringFromCandidates({
          node: config_node,
          candidate_paths: [['usage_type'], ['type']]
        }) ?? null,
      family_count: ReadNumberValue({
        value: this.readFirstStringFromCandidates({
          node: config_node,
          candidate_paths: [['families', 'count'], ['family_count']]
        })
      }),
      nvt_count: ReadNumberValue({
        value: this.readFirstStringFromCandidates({
          node: config_node,
          candidate_paths: [['nvts', 'count'], ['nvt_count']]
        })
      })
    }));
  }

  private mapScanners(params: {
    command_result: gmp_command_result_t;
  }): scanner_summary_t[] {
    const scanner_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'scanner'
    });

    return scanner_nodes.map((scanner_node: any) => ({
      id: ReadStringValue({ value: scanner_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: scanner_node?.name }) ?? '',
      comment: ReadStringValue({ value: scanner_node?.comment }),
      host:
        this.readFirstStringFromCandidates({
          node: scanner_node,
          candidate_paths: [['host'], ['scanner_host']]
        }) ?? null,
      port: ReadNumberValue({
        value:
          this.readFirstStringFromCandidates({
            node: scanner_node,
            candidate_paths: [['port'], ['scanner_port']]
          }) ?? null
      }),
      scanner_type:
        this.readFirstStringFromCandidates({
          node: scanner_node,
          candidate_paths: [['type'], ['scanner_type']]
        }) ?? null
    }));
  }

  private mapSchedules(params: {
    command_result: gmp_command_result_t;
  }): schedule_summary_t[] {
    const schedule_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'schedule'
    });

    return schedule_nodes.map((schedule_node: any) => ({
      id: ReadStringValue({ value: schedule_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: schedule_node?.name }) ?? '',
      comment: ReadStringValue({ value: schedule_node?.comment }),
      timezone:
        this.readFirstStringFromCandidates({
          node: schedule_node,
          candidate_paths: [['timezone']]
        }) ?? null,
      next_time:
        this.readFirstStringFromCandidates({
          node: schedule_node,
          candidate_paths: [['next_time'], ['next_run']]
        }) ?? null
    }));
  }

  private mapReportFormats(params: {
    command_result: gmp_command_result_t;
  }): report_format_summary_t[] {
    const report_format_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'report_format'
    });

    return report_format_nodes.map((report_format_node: any) => ({
      id: ReadStringValue({ value: report_format_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: report_format_node?.name }) ?? '',
      extension:
        this.readFirstStringFromCandidates({
          node: report_format_node,
          candidate_paths: [['extension']]
        }) ?? null,
      content_type:
        this.readFirstStringFromCandidates({
          node: report_format_node,
          candidate_paths: [['content_type']]
        }) ?? null,
      active: this.readBooleanValue({
        value:
          this.readFirstStringFromCandidates({
            node: report_format_node,
            candidate_paths: [['active']]
          }) ?? null
      })
    }));
  }

  private mapAlerts(params: { command_result: gmp_command_result_t }): alert_summary_t[] {
    const alert_nodes = this.getEntityNodes({
      root_node: params.command_result.response_root_node,
      entity_name: 'alert'
    });

    return alert_nodes.map((alert_node: any) => ({
      id: ReadStringValue({ value: alert_node?.['@_id'] }) ?? '',
      name: ReadStringValue({ value: alert_node?.name }) ?? '',
      comment: ReadStringValue({ value: alert_node?.comment }),
      event:
        this.readFirstStringFromCandidates({
          node: alert_node,
          candidate_paths: [['event', 'name'], ['event']]
        }) ?? null,
      condition:
        this.readFirstStringFromCandidates({
          node: alert_node,
          candidate_paths: [['condition', 'name'], ['condition']]
        }) ?? null,
      method:
        this.readFirstStringFromCandidates({
          node: alert_node,
          candidate_paths: [['method', 'name'], ['method']]
        }) ?? null
    }));
  }

  private mapOperationResult(params: {
    command_result: gmp_command_result_t;
  }): gmp_operation_result_t {
    return {
      success: params.command_result.ok,
      status_code: params.command_result.status.status_code,
      status_text: params.command_result.status.status_text,
      resource_id: ReadResourceIdFromResponseNode({
        root_node: params.command_result.response_root_node
      }),
      raw_xml: params.command_result.response_xml
    };
  }

  private getEntityNodes(params: {
    root_node: any;
    entity_name: string;
  }): any[] {
    const direct_node_value = params.root_node?.[params.entity_name];

    if (direct_node_value !== undefined) {
      return ConvertValueToArray({ value: direct_node_value });
    }

    for (const nested_value of Object.values(params.root_node ?? {})) {
      if (!nested_value || typeof nested_value !== 'object') {
        continue;
      }

      const nested_entity_value = (nested_value as Record<string, any>)[params.entity_name];

      if (nested_entity_value !== undefined) {
        return ConvertValueToArray({ value: nested_entity_value });
      }
    }

    return [];
  }

  private readFirstStringFromCandidates(params: {
    node: any;
    candidate_paths: string[][];
  }): string | null {
    for (const candidate_path of params.candidate_paths) {
      let current_value = params.node;

      for (const path_key of candidate_path) {
        if (current_value === undefined || current_value === null) {
          current_value = null;
          break;
        }

        current_value = current_value[path_key];
      }

      const candidate_value = ReadStringValue({ value: current_value });

      if (candidate_value !== null) {
        return candidate_value;
      }
    }

    return null;
  }

  private mergeSearchParameters(params: {
    search_parameters: list_search_parameters_t;
    query_text?: string;
  }): list_search_parameters_t {
    const normalized_parameters: list_search_parameters_t = {
      filter: params.search_parameters.filter,
      details: params.search_parameters.details,
      first: params.search_parameters.first,
      rows: params.search_parameters.rows,
      sort_field: params.search_parameters.sort_field,
      sort_desc: params.search_parameters.sort_desc,
      extra_filter: params.search_parameters.extra_filter
    };

    const query_text = params.query_text?.trim();

    if (!query_text) {
      return normalized_parameters;
    }

    if (normalized_parameters.filter?.trim()) {
      normalized_parameters.filter = `${normalized_parameters.filter.trim()} ${query_text}`;
      return normalized_parameters;
    }

    normalized_parameters.filter = query_text;
    return normalized_parameters;
  }

  private normalizeHostList(params: { raw_hosts: string }): string[] {
    const raw_hosts = params.raw_hosts.trim();

    if (!raw_hosts) {
      return [];
    }

    if (raw_hosts.includes(',')) {
      return raw_hosts
        .split(',')
        .map((host_value) => host_value.trim())
        .filter(Boolean);
    }

    return [raw_hosts];
  }

  private readBooleanValue(params: { value: any }): boolean | null {
    const string_value = ReadStringValue({ value: params.value });

    if (string_value === null) {
      return null;
    }

    const normalized_value = string_value.toLowerCase().trim();

    if (normalized_value === '1' || normalized_value === 'true' || normalized_value === 'yes') {
      return true;
    }

    if (normalized_value === '0' || normalized_value === 'false' || normalized_value === 'no') {
      return false;
    }

    return null;
  }

  private deriveExpectedRootTag(params: { command_xml: string }): string {
    const command_match = params.command_xml.match(/<\s*([A-Za-z_][A-Za-z0-9_]*)\b/);

    if (!command_match) {
      throw new Error('Unable to derive expected root tag from command XML.');
    }

    return `${command_match[1]}_response`;
  }
}
