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
  'import de.opendiabetes.vault.data.container.VaultEntryType;\n' +
  'import de.opendiabetes.vault.processing.*;\n' +
  'import de.opendiabetes.vault.processing.filter.*;\n' +
  'import de.opendiabetes.vault.processing.filter.options.*;\n' +
  'import de.opendiabetes.vault.processing.manipulator.*;\n' +
  'import de.opendiabetes.vault.processing.manipulator.options.*;\n' +
  'import java.util.ArrayList;\n' +
  'import java.util.List;\n' +
  'import java.util.Arrays;\n' +
  'import java.util.Date;\n' +
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
  const code = 'new Date(' + Date.UTC(year, month, day, hour, minute, second) + 'L)';
  return [code, Blockly.ODF.ORDER_NONE];
};

// FILTERS

Blockly.ODF['filter_and'] = function (block) {
  const code = 'new AndFilter(new AndFilterOption(Arrays.asList(\n';
  let filters = block.getInputTargetBlock('FILTERS');
  const subCode = [];
  while (filters != null) {
    subCode.push(Blockly.ODF.blockToCode(filters));
    filters = filters.getNextBlock();
  }
  return code + indent(subCode.join(',\n')) + '\n)))';
};

Blockly.ODF['filter_cluster'] = function (block) {
  const type = Blockly.ODF.valueToCode(block, 'TYPE', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new ClusterFilter(new ClusterFilterOption(' + type + '))';
};

Blockly.ODF['filter_combination'] = function (block) {
  const code = 'new CombinationFilter(new CombinationFilterOption(slice,\n';
  let first = Blockly.ODF.blockToCode(block.getInputTargetBlock('FIRST'));
  let second = Blockly.ODF.blockToCode(block.getInputTargetBlock('SECOND'));
  return code + indent(first) + ',\n' + indent(second) + '\n))';
};

Blockly.ODF['filter_compactquery'] = function (block) {
  const code = 'new CompactQueryFilter(new CompactQueryFilterOption(Arrays.asList(\n';
  let filters = block.getInputTargetBlock('FILTERS');
  const subCode = [];
  while (filters != null) {
    subCode.push(Blockly.ODF.blockToCode(filters));
    filters = filters.getNextBlock();
  }
  return code + indent(subCode.join(',\n')) + '\n)))';
};

Blockly.ODF['filter_continouswrapper'] = function (block) {
  const before = block.getFieldValue('MARGIN_BEFORE');
  const after = block.getFieldValue('MARGIN_AFTER');
  return 'new ContinuousWrapperFilter(new ContinuousWrapperFilterOption(slice, ' + before + ', ' + after + '))';
};

Blockly.ODF['filter_datetimespan'] = function (block) {
  const start = Blockly.ODF.valueToCode(block, 'START', Blockly.ODF.ORDER_LITERAL) || 'null';
  const end = Blockly.ODF.valueToCode(block, 'END', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new DateTimeSpanFilter(new DateTimeSpanFilterOption(' + start + ', ' + end + '))';
};

Blockly.ODF['filter_vaultentrytype'] = function (block) {
  const type = Blockly.ODF.valueToCode(block, 'TYPE', Blockly.ODF.ORDER_LITERAL) || 'null';
  return 'new VaultEntryTypeFilter(new VaultEntryTypeFilterOption(' + type + '))'
};
