'use babel';

import HealthDataFilterView from './health-data-filter-view';
import {CompositeDisposable, Disposable} from 'atom';

import {js2xml} from "xml-js";

export default {

  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable(
      // Add an opener for our view.
      atom.workspace.addOpener(uri => {
        if (uri === 'atom://health-data-filter') {
          return new HealthDataFilterView();
        }
      }),

      // Register command that toggles this view
      atom.commands.add('atom-workspace', {
        'health-data-filter:toggle': () => this.toggle()
      }),

      // Destroy any ActiveEditorInfoViews when the package is deactivated.
      new Disposable(() => {
        atom.workspace.getPaneItems().forEach(item => {
          if (item instanceof HealthDataFilterView) {
            item.destroy();
          }
        });
      })
    );
  },

  deserialize(state) {
    let workspace;
    if (state.workspace !== undefined)
      workspace = js2xml(state.workspace);
    return new HealthDataFilterView(workspace);
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  toggle() {
    atom.workspace.toggle('atom://health-data-filter')
  }

};
