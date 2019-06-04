# OpenDiabetes-Atom
This project provides a package for the [Atom](https://atom.io) text editor which allows for programming [OpenDiabetesFilters](https://github.com/Edgxxar/OpenDiabetesFilter) using [Google Blockly](https://developers.google.com/blockly/).

## Installation
The following guide will install this package locally with your atom editor:

1. clone the repository into any directory
1. open a terminal and navigate into the directory
1. execute `npm install`
1. execute `apm link`
1. reload (`ctrl`+`shift`+`F5`) or restart your atom editor
1. check that the package was installed in the settings (`ctrl`+`,`)
   1. you may have to press the `Enable` button to enable the package. Then reload atom again.

## Keyboard shortcuts
Currently the following keyboard shortcuts open the different views:

| Shortcut | Action |
|----------|--------|
| `ctrl`+`alt`+`o` | Filter editor (Blockly) |
| `ctrl`+`alt`+`p` |  Plot view (Not yet implemented) |
| `ctrl`+`alt`+`l` | ODV settings |

These shortcuts are subject to change.
