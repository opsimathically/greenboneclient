import { XMLParser, XMLValidator } from 'fast-xml-parser';

import type {
  extracted_xml_document_t,
  gmp_status_t,
  list_search_parameters_t
} from '../types/greenboneclient_types';

const xml_parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
  parseTagValue: true
});

export function EscapeXmlValue(params: { value: string }): string {
  return params.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function ParseXmlDocument(params: {
  xml: string;
}): Record<string, any> {
  const validation_result = XMLValidator.validate(params.xml);

  if (validation_result !== true) {
    throw new Error(
      `Invalid XML document: ${JSON.stringify(validation_result.err)}`
    );
  }

  return xml_parser.parse(params.xml) as Record<string, any>;
}

export function GetRootTagNameFromParsedXml(params: {
  parsed_xml: Record<string, any>;
}): string {
  const root_keys = Object.keys(params.parsed_xml);

  if (root_keys.length === 0) {
    throw new Error('No root tag found in parsed XML response.');
  }

  return root_keys[0];
}

export function GetRootTagNameFromXml(params: { xml: string }): string | null {
  const root_tag_match = params.xml.match(/<([A-Za-z_][A-Za-z0-9_:\-.]*)\b/);

  if (!root_tag_match) {
    return null;
  }

  if (root_tag_match[1].toLowerCase() === 'xml') {
    const without_decl = params.xml.replace(/^\s*<\?xml[\s\S]*?\?>\s*/i, '');
    const second_match = without_decl.match(/<([A-Za-z_][A-Za-z0-9_:\-.]*)\b/);

    return second_match?.[1] ?? null;
  }

  return root_tag_match[1];
}

export function ConvertValueToArray(params: { value: any }): any[] {
  if (params.value === undefined || params.value === null) {
    return [];
  }

  if (Array.isArray(params.value)) {
    return params.value;
  }

  return [params.value];
}

export function ReadStringValue(params: { value: any }): string | null {
  if (params.value === undefined || params.value === null) {
    return null;
  }

  if (typeof params.value === 'string') {
    return params.value;
  }

  if (
    typeof params.value === 'number' ||
    typeof params.value === 'boolean' ||
    typeof params.value === 'bigint'
  ) {
    return String(params.value);
  }

  if (typeof params.value === 'object' && typeof params.value['#text'] === 'string') {
    return params.value['#text'];
  }

  return null;
}

export function ReadNumberValue(params: { value: any }): number | null {
  const string_value = ReadStringValue({ value: params.value });

  if (!string_value) {
    return null;
  }

  const number_value = Number(string_value);

  if (Number.isNaN(number_value)) {
    return null;
  }

  return number_value;
}

export function BuildFilterString(params: {
  search_parameters?: list_search_parameters_t;
}): string | null {
  if (!params.search_parameters) {
    return null;
  }

  const filter_fragments: string[] = [];

  if (params.search_parameters.filter?.trim()) {
    filter_fragments.push(params.search_parameters.filter.trim());
  }

  if (params.search_parameters.extra_filter?.trim()) {
    filter_fragments.push(params.search_parameters.extra_filter.trim());
  }

  if (params.search_parameters.first !== undefined) {
    filter_fragments.push(`first=${params.search_parameters.first}`);
  }

  if (params.search_parameters.rows !== undefined) {
    filter_fragments.push(`rows=${params.search_parameters.rows}`);
  }

  if (params.search_parameters.sort_field?.trim()) {
    const sort_prefix = params.search_parameters.sort_desc ? '-' : '';
    filter_fragments.push(`sort=${sort_prefix}${params.search_parameters.sort_field.trim()}`);
  }

  if (filter_fragments.length === 0) {
    return null;
  }

  return filter_fragments.join(' ');
}

export function BuildGetCommandAttributes(params: {
  search_parameters?: list_search_parameters_t;
}): string {
  const attributes: string[] = [];

  if (params.search_parameters?.details !== undefined) {
    attributes.push(`details="${params.search_parameters.details ? 1 : 0}"`);
  }

  const filter_string = BuildFilterString({
    search_parameters: params.search_parameters
  });

  if (filter_string) {
    attributes.push(`filter="${EscapeXmlValue({ value: filter_string })}"`);
  }

  if (attributes.length === 0) {
    return '';
  }

  return ` ${attributes.join(' ')}`;
}

export function ReadStatusFromResponseNode(params: { root_node: any }): gmp_status_t {
  const raw_status_code = ReadStringValue({
    value: params.root_node?.['@_status'] ?? params.root_node?.status
  });
  const status_text = ReadStringValue({
    value: params.root_node?.['@_status_text'] ?? params.root_node?.status_text
  });

  let status_code: number | null = null;

  if (raw_status_code) {
    const parsed_status_code = Number(raw_status_code);

    if (!Number.isNaN(parsed_status_code)) {
      status_code = parsed_status_code;
    }
  }

  return {
    raw_status_code,
    status_code,
    status_text
  };
}

export function IsStatusSuccess(params: { status_code: number | null }): boolean {
  if (params.status_code === null) {
    return false;
  }

  return params.status_code >= 200 && params.status_code < 300;
}

export function ReadResourceIdFromResponseNode(params: {
  root_node: any;
}): string | null {
  const candidate_keys = [
    '@_id',
    '@_task_id',
    '@_report_id',
    '@_credential_id',
    '@_target_id',
    '@_port_list_id',
    '@_result_id'
  ];

  for (const candidate_key of candidate_keys) {
    const value = ReadStringValue({ value: params.root_node?.[candidate_key] });

    if (value) {
      return value;
    }
  }

  return null;
}

function StripLeadingXmlDecorators(params: {
  text: string;
}): { decorator_start_index: number; root_start_index: number } {
  let cursor = 0;
  const text = params.text;

  while (cursor < text.length && /\s/.test(text[cursor])) {
    cursor += 1;
  }

  const decorator_start_index = cursor;

  while (cursor < text.length) {
    if (text.startsWith('<?xml', cursor) || text.startsWith('<?', cursor)) {
      const declaration_end = text.indexOf('?>', cursor);

      if (declaration_end === -1) {
        return {
          decorator_start_index,
          root_start_index: -1
        };
      }

      cursor = declaration_end + 2;

      while (cursor < text.length && /\s/.test(text[cursor])) {
        cursor += 1;
      }

      continue;
    }

    if (text.startsWith('<!--', cursor)) {
      const comment_end = text.indexOf('-->', cursor);

      if (comment_end === -1) {
        return {
          decorator_start_index,
          root_start_index: -1
        };
      }

      cursor = comment_end + 3;

      while (cursor < text.length && /\s/.test(text[cursor])) {
        cursor += 1;
      }

      continue;
    }

    break;
  }

  return {
    decorator_start_index,
    root_start_index: cursor
  };
}

function FindTagEndIndex(params: {
  text: string;
  open_bracket_index: number;
}): number {
  let in_quote = false;
  let quote_character = '';

  for (let index = params.open_bracket_index + 1; index < params.text.length; index += 1) {
    const current_character = params.text[index];

    if (!in_quote && (current_character === '"' || current_character === "'")) {
      in_quote = true;
      quote_character = current_character;
      continue;
    }

    if (in_quote && current_character === quote_character) {
      in_quote = false;
      quote_character = '';
      continue;
    }

    if (!in_quote && current_character === '>') {
      return index;
    }
  }

  return -1;
}

export function ExtractXmlDocumentFromBuffer(params: {
  buffer: string;
}): extracted_xml_document_t {
  if (!params.buffer.trim()) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const stripped_indexes = StripLeadingXmlDecorators({ text: params.buffer });

  if (stripped_indexes.root_start_index === -1) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const root_start_index = stripped_indexes.root_start_index;

  if (params.buffer[root_start_index] !== '<') {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const open_tag_end_index = FindTagEndIndex({
    text: params.buffer,
    open_bracket_index: root_start_index
  });

  if (open_tag_end_index === -1) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const open_tag_text = params.buffer.slice(root_start_index, open_tag_end_index + 1);

  if (open_tag_text.startsWith('</')) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const root_tag_match = open_tag_text.match(/^<([A-Za-z_][A-Za-z0-9_:\-.]*)\b/);

  if (!root_tag_match) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const root_tag_name = root_tag_match[1];
  const is_self_closing = /\/\s*>$/.test(open_tag_text);

  if (is_self_closing) {
    const xml_document = params.buffer.slice(0, open_tag_end_index + 1).trim();
    const remaining_buffer = params.buffer.slice(open_tag_end_index + 1);

    return {
      xml_document,
      remaining_buffer
    };
  }

  const closing_tag = `</${root_tag_name}>`;
  const closing_tag_index = params.buffer.indexOf(closing_tag, open_tag_end_index + 1);

  if (closing_tag_index === -1) {
    return {
      xml_document: null,
      remaining_buffer: params.buffer
    };
  }

  const document_end_index = closing_tag_index + closing_tag.length;
  const xml_document = params.buffer.slice(0, document_end_index).trim();
  const remaining_buffer = params.buffer.slice(document_end_index);

  return {
    xml_document,
    remaining_buffer
  };
}
