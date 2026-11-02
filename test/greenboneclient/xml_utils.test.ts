import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BuildGetCommandAttributes,
  ExtractXmlDocumentFromBuffer,
  ParseXmlDocument,
  ReadStatusFromResponseNode
} from '../../src/classes/greenboneclient/utils/greenboneclient_xml_utils';

test('BuildGetCommandAttributes builds details and escaped filter attributes', () => {
  const attributes = BuildGetCommandAttributes({
    search_parameters: {
      details: true,
      filter: 'name~foo & severity>7',
      rows: 10,
      first: 0,
      sort_field: 'name',
      sort_desc: true
    }
  });

  assert.equal(
    attributes,
    ' details="1" filter="name~foo &amp; severity&gt;7 first=0 rows=10 sort=-name"'
  );
});

test('ExtractXmlDocumentFromBuffer splits first XML doc from remaining buffer', () => {
  const combined_buffer =
    '<?xml version="1.0"?><get_users_response status="200" status_text="OK"/><get_tasks_response status="200" status_text="OK"/>';

  const first_extraction = ExtractXmlDocumentFromBuffer({
    buffer: combined_buffer
  });

  assert.equal(
    first_extraction.xml_document,
    '<?xml version="1.0"?><get_users_response status="200" status_text="OK"/>'
  );
  assert.equal(
    first_extraction.remaining_buffer,
    '<get_tasks_response status="200" status_text="OK"/>'
  );

  const second_extraction = ExtractXmlDocumentFromBuffer({
    buffer: first_extraction.remaining_buffer
  });

  assert.equal(
    second_extraction.xml_document,
    '<get_tasks_response status="200" status_text="OK"/>'
  );
  assert.equal(second_extraction.remaining_buffer, '');
});

test('ParseXmlDocument and ReadStatusFromResponseNode parse GMP status correctly', () => {
  const parsed_xml = ParseXmlDocument({
    xml: '<create_task_response status="201" status_text="Created" id="task-123"/>'
  });

  const response_node = parsed_xml.create_task_response;
  const status = ReadStatusFromResponseNode({ root_node: response_node });

  assert.equal(status.status_code, 201);
  assert.equal(status.status_text, 'Created');
});
