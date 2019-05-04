'use strict';

goog.provide('Blockly.ODF');
goog.require('Blockly.Generator');

Blockly.ODF = new Blockly.Generator('ODF');
Blockly.ODF.ORDER_LITERAL = 0;          // 0 "" ...
Blockly.ODF.ORDER_NONE = 99;            // (...)


Blockly.ODF['value_vaultentrytype'] = function (block) {
  const code = 'VaultEntryType.' + block.getFieldValue('TYPE');
  return [code, Blockly.ODF.ORDER_LITERAL];
};

Blockly.ODF['value_datetime'] = function (block) {
  const year = block.getFieldValue('YEAR');
  const month = block.getFieldValue('MONTH');
  const day = block.getFieldValue('DAY');
  const hour = block.getFieldValue('HOUR');
  const minute = block.getFieldValue('MINUTE');
  const second = block.getFieldValue('SECOND');
  const code = 'new Date(' + Date.UTC(year, month, day, hour, minute, second) + ')';
  return [code, Blockly.ODF.ORDER_LITERAL];
};

Blockly.ODF['filter_vaultentrytype'] = function (block) {
  const type = Blockly.ODF.valueToCode(block, 'TYPE', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new VaultEntryTypeFilter(new VaultEntryTypeFilterOption(' + type + '))';
};

Blockly.ODF['filter_timespan'] = function (block) {
  const start = Blockly.ODF.valueToCode(block, 'START', Blockly.ODF.ORDER_LITERAL) || 'null';
  const end = Blockly.ODF.valueToCode(block, 'END', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new TimeSpanFilter(new TimeSpanFilterOption(' + start + ', ' + end + '))';
};
