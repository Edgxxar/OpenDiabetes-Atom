'use strict';

goog.provide('Blockly.ODF');
goog.require('Blockly.Generator');

Blockly.ODF = new Blockly.Generator('ODF');
Blockly.ODF.ORDER_LITERAL = 0;          // 0 "" ...
Blockly.ODF.ORDER_NONE = 99;            // (...)

function getVariableName(block, variable) {
  return block.workspace.getVariableById(block.getFieldValue(variable)).name;
}

Blockly.ODF['main'] = function (block) {
  let code = '';
  block.getChildren().forEach(child => {
    code += Blockly.ODF.blockToCode(child) + '\n';
    let next = child.getNextBlock();
    while (next != null) {
      code += Blockly.ODF.blockToCode(next) + '\n';
      next = next.getNextBlock();
    }
    code += '\n';
  });
  return code;
};

Blockly.ODF['importer_medtronic'] = function (block) {
  const path = block.getFieldValue('PATH');
  const dataVar = getVariableName(block, 'VAR');
  const importer = dataVar + 'Importer';
  return 'Importer ' + importer + ' = new MedtronicCsvImporter();\n' +
    'List<VaultEntry> ' + dataVar + ' = ' + importer + '.importDataFromFile("' + path + '");';
};

Blockly.ODF['exporter_csv'] = function (block) {
  const path = block.getFieldValue('PATH');
  const dataVar = getVariableName(block, 'VAR');
  const sink = dataVar + 'Sink';
  const exporter = dataVar + 'Exporter';
  const result = dataVar + 'Result';
  return 'FileOutputStream ' + sink + ' = new FileOutputStream(new File("' + path + '"));\n' +
    'Exporter ' + exporter + ' = new CsvFileExporter();\n' +
    exporter + '.exportData(' + sink + ', ' + result + '.filteredData);\n' +
    sink + '.close();'
};

Blockly.ODF['value_vaultentrytype'] = function (block) {
  const code = 'VaultEntryType.' + block.getFieldValue('TYPE');
  return [code, Blockly.ODF.ORDER_NONE];
};

Blockly.ODF['value_datetime'] = function (block) {
  const year = block.getFieldValue('YEAR');
  const month = block.getFieldValue('MONTH');
  const day = block.getFieldValue('DAY');
  const hour = block.getFieldValue('HOUR');
  const minute = block.getFieldValue('MINUTE');
  const second = block.getFieldValue('SECOND');
  const code = 'new Date(' + Date.UTC(year, month, day, hour, minute, second) + ')';
  return [code, Blockly.ODF.ORDER_NONE];
};

Blockly.ODF['filter_vaultentrytype'] = function (block) {
  const type = Blockly.ODF.valueToCode(block, 'TYPE', Blockly.ODF.ORDER_LITERAL) || 'null';
  const dataVar = getVariableName(block, 'VAR');
  const filter = dataVar + 'Filter';
  const result = dataVar + 'Result';
  return 'Filter ' + filter + ' = new VaultEntryTypeFilter(new VaultEntryTypeFilterOption(' + type + '));\n' +
    'FilterResult ' + result + ' = ' + filter + '.filter(' + dataVar + ');';
};

Blockly.ODF['filter_timespan'] = function (block) {
  const start = Blockly.ODF.valueToCode(block, 'START', Blockly.ODF.ORDER_LITERAL) || 'null';
  const end = Blockly.ODF.valueToCode(block, 'END', Blockly.ODF.ORDER_LITERAL) || 'null';
  const dataVar = getVariableName(block, 'VAR');
  const filter = dataVar + 'Filter';
  const result = dataVar + 'Result';
  return 'Filter ' + filter + ' = new TimeSpanFilter(new TimeSpanFilterOption(' + start + ', ' + end + '));\n' +
    'FilterResult ' + result + ' = ' + filter + '.filter(' + dataVar + ');';
};