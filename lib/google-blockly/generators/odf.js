'use strict';

goog.provide('Blockly.ODF');
goog.require('Blockly.Generator');

Blockly.ODF = new Blockly.Generator('ODF');
Blockly.ODF.ORDER_LITERAL = 0;          // 0 "" ...
Blockly.ODF.ORDER_NONE = 99;            // (...)

function getVariableName(block, variable) {
  return block.workspace.getVariableById(block.getFieldValue(variable)).name;
}

function indent(code, depth = 4) {
  return code.replace(/^(.*)$/mg, ' '.repeat(depth) + '$1')
}

//TODO: load from template
const template =
  'import de.opendiabetes.vault.data.container.VaultEntry;\n' +
  'import de.opendiabetes.vault.processing.*;\n' +
  'import java.util.ArrayList;\n' +
  'import java.util.List;\n' +
  '\n' +
  'public class Process implements ProcessingContainer {\n' +
  '    @Override\n' +
  '    public List<List<VaultEntry>> processData(List<List<VaultEntry>> inputData) {\n' +
  '        List<List<VaultEntry>> results = new ArrayList<>();\n' +
  '\n' +
  '        for (List<VaultEntry> slice : inputData) {\n' +
  '%FILTER%\n' +
  '        }\n' +
  '\n' +
  '        return results;\n' +
  '    }\n' +
  '}\n';

Blockly.ODF['main'] = function (block) {
  let code = '';
  if (template !== undefined) {
    code = [];
    let filter = block.getInputTargetBlock('FILTER');
    while (filter != null) {
      const filterCode =
        'Filter filter = ' + Blockly.ODF.blockToCode(filter) + ';\n' +
        'FilterResult result = filter.filter(slice);\n' +
        'results.add(result.filteredData);';
      code.push(indent('{\n' + indent(filterCode) + '\n}', 12));
      filter = filter.getNextBlock();
    }
    code = template.replace('%FILTER%', code.join('\n'));
  }

  return code;
};

// Blockly.ODF['importer_medtronic'] = function (block) {
//   const path = block.getFieldValue('PATH');
//   const dataVar = getVariableName(block, 'VAR');
//   const importer = dataVar + 'Importer';
//   return 'Importer ' + importer + ' = new MedtronicCsvImporter();\n' +
//     'List<VaultEntry> ' + dataVar + ' = ' + importer + '.importDataFromFile("' + path + '");';
// };
//
// Blockly.ODF['exporter_csv'] = function (block) {
//   const path = block.getFieldValue('PATH');
//   const dataVar = getVariableName(block, 'VAR');
//   const sink = dataVar + 'Sink';
//   const exporter = dataVar + 'Exporter';
//   const result = dataVar + 'Result';
//   return 'FileOutputStream ' + sink + ' = new FileOutputStream(new File("' + path + '"));\n' +
//     'Exporter ' + exporter + ' = new CsvFileExporter();\n' +
//     exporter + '.exportData(' + sink + ', ' + result + '.filteredData);\n' +
//     sink + '.close();'
// };

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

function makeFilter(filter) {
  return '{\n' +
    'Filter filter = ' + filter + ';\n' +
    'FilterResult result = filter.filter(slice);\n' +
    'results.add(result.filteredData);\n' +
    '}\n';
}

Blockly.ODF['filter_vaultentrytype'] = function (block) {
  const type = Blockly.ODF.valueToCode(block, 'TYPE', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new VaultEntryTypeFilter(new VaultEntryTypeFilterOption(' + type + '))'
};

Blockly.ODF['filter_timespan'] = function (block) {
  const start = Blockly.ODF.valueToCode(block, 'START', Blockly.ODF.ORDER_LITERAL) || 'null';
  const end = Blockly.ODF.valueToCode(block, 'END', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new TimeSpanFilter(new TimeSpanFilterOption(' + start + ', ' + end + '))';
};

Blockly.ODF['filter_and'] = function (block) {
  let code = 'new AndFilter(new AndFilterOption(Arrays.asList(\n';
  let filters = block.getInputTargetBlock('FILTERS');
  const subCode = [];
  while (filters != null) {
    subCode.push(Blockly.ODF.blockToCode(filters));
    filters = filters.getNextBlock();
  }
  return code + indent(subCode.join(',\n')) + '\n)))';
};
