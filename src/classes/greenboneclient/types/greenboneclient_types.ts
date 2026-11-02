export type connection_authentication_t = {
  username: string | undefined;
  password: string | undefined;
};

export type tcp_connection_settings_t = {
  type: 'tcp';
  host: string;
  tcp_port: number;
  timeout_ms?: number;
};

export type unix_socket_connection_settings_t = {
  type: 'unix_socket';
  socket_path: string;
  timeout_ms?: number;
};

export type connection_settings_t =
  | tcp_connection_settings_t
  | unix_socket_connection_settings_t;

export type connect_parameters_t = {
  auth: connection_authentication_t;
  connection: connection_settings_t;
  timeout_ms?: number;
};

export interface gmp_transport_i {
  connect(params: {
    connection: connection_settings_t;
    timeout_ms?: number;
  }): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendRaw(params: {
    xml: string;
    timeout_ms?: number;
    expected_root_tag?: string;
  }): Promise<string>;
}

export type gmp_status_t = {
  raw_status_code: string | null;
  status_code: number | null;
  status_text: string | null;
};

export type gmp_command_result_t = {
  ok: boolean;
  status: gmp_status_t;
  response_xml: string;
  response_json: Record<string, any>;
  response_root_tag: string;
  response_root_node: any;
};

export type gmp_operation_result_t = {
  success: boolean;
  status_code: number | null;
  status_text: string | null;
  resource_id: string | null;
  raw_xml: string;
};

export type list_search_parameters_t = {
  filter?: string;
  first?: number;
  rows?: number;
  details?: boolean;
  sort_field?: string;
  sort_desc?: boolean;
  extra_filter?: string;
};

export type user_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type task_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type port_list_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type credential_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type target_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type config_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type scanner_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type schedule_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type report_format_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type alert_search_parameters_t = list_search_parameters_t & {
  query_text?: string;
};

export type user_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  role: string | null;
};

export type task_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  status: string | null;
  progress: number | null;
  report_count: number | null;
};

export type port_list_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  port_count: number | null;
};

export type credential_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  login: string | null;
};

export type target_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  hosts: string[];
  port_list_id: string | null;
};

export type config_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  usage_type: string | null;
  family_count: number | null;
  nvt_count: number | null;
};

export type scanner_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  host: string | null;
  port: number | null;
  scanner_type: string | null;
};

export type schedule_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  timezone: string | null;
  next_time: string | null;
};

export type report_format_summary_t = {
  id: string;
  name: string;
  extension: string | null;
  content_type: string | null;
  active: boolean | null;
};

export type alert_summary_t = {
  id: string;
  name: string;
  comment: string | null;
  event: string | null;
  condition: string | null;
  method: string | null;
};

export type task_status_t = {
  task_id: string;
  name: string;
  status: string | null;
  progress: number | null;
  report_id: string | null;
};

export type create_task_parameters_t = {
  name: string;
  config_id: string;
  target_id: string;
  scanner_id?: string;
  comment?: string;
  alterable?: boolean;
  schedule_id?: string;
  alert_ids?: string[];
};

export type update_task_parameters_t = {
  task_id: string;
  name?: string;
  comment?: string;
  alterable?: boolean;
  config_id?: string;
  target_id?: string;
  scanner_id?: string;
  schedule_id?: string;
};

export type delete_task_parameters_t = {
  task_id: string;
  ultimate?: boolean;
};

export type task_action_parameters_t = {
  task_id: string;
};

export type get_task_status_parameters_t = {
  task_id: string;
};

export type get_task_report_parameters_t = {
  task_id: string;
  report_id?: string;
  format_id?: string;
  details?: boolean;
};

export type create_port_list_parameters_t = {
  name: string;
  port_range: string;
  comment?: string;
};

export type update_port_list_parameters_t = {
  port_list_id: string;
  name?: string;
  comment?: string;
};

export type delete_port_list_parameters_t = {
  port_list_id: string;
  ultimate?: boolean;
};

export type create_credential_parameters_t = {
  name: string;
  login: string;
  password: string;
  comment?: string;
  allow_insecure?: boolean;
};

export type delete_credential_parameters_t = {
  credential_id: string;
  ultimate?: boolean;
};

export type gmp_version_information_t = {
  raw_response: gmp_command_result_t;
  version: string | null;
};

export type diagnostics_information_t = {
  version: gmp_version_information_t | null;
  scanner_count: number;
  config_count: number;
  target_count: number;
  schedule_count: number;
  report_format_count: number;
  alert_count: number;
};

export type extracted_xml_document_t = {
  xml_document: string | null;
  remaining_buffer: string;
};
