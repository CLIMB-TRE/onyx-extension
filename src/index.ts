import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  showDialog,
  Dialog
} from '@jupyterlab/apputils';

import { IDocumentManager } from '@jupyterlab/docmanager';
import { HTMLViewer, IHTMLViewerTracker } from '@jupyterlab/htmlviewer';

import { ILauncher } from '@jupyterlab/launcher';

import { requestAPI } from './handler';
import { ReactAppWidget } from './App';
import { chatIcon } from './icon';
import { Widget } from '@lumino/widgets';

class OpenS3FileWidget extends Widget {
  constructor() {
    const body = document.createElement('div');
    const existingLabel = document.createElement('label');
    existingLabel.textContent = 'S3 file name:';

    const input = document.createElement('input');
    input.value = '';
    input.placeholder =
      's3://mscape-published-reports/C-B01922D432_scylla_report.html';

    body.appendChild(existingLabel);
    body.appendChild(input);

    super({ node: body });
  }

  get inputNode() {
    return this.node.getElementsByTagName('input')[0];
  }

  getValue() {
    return this.inputNode.value;
  }
}

/**
 * Initialization data for the onyx_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'onyx_extension:plugin',
  description: 'Onyx-extension.',
  autoStart: true,
  optional: [ILauncher, IHTMLViewerTracker],
  requires: [ICommandPalette, IDocumentManager],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    launcher: ILauncher | null,
    htmlTracker: IHTMLViewerTracker | null
  ) => {
    console.log('JupyterLab extension @onyx_extension is activated!');

    const command = 'onyx_extension';
    const s3_command = 's3_onyx_extension';
    const category = 'Onyx';

    let domain: string;
    let token: string;

    const s3_open_function = (s3_link: string) => {
      requestAPI<any>('s3', {}, ['s3location', s3_link])
        .then(data => {
          console.log(data);
          documentManager.open(data['temp_file']);
        })
        .catch(reason => {
          console.error(
            `The onyx_extension server extension appears to be missing.\n${reason}`
          );
        });
    };

    requestAPI<any>('settings')
      .then(data => {
        console.log(data);
        domain = data['domain'];
        token = data['token'];
      })
      .catch(reason => {
        console.error(
          `The onyx_extension server extension appears to be missing.\n${reason}`
        );
      });

    // Create a single widget
    let widget: MainAreaWidget<ReactAppWidget>;

    app.commands.addCommand(command, {
      label: 'Onyx',
      caption: 'Onyx',
      icon: chatIcon,
      execute: () => {
        if (!widget || widget.disposed) {
          const content = new ReactAppWidget(domain, token, s3_open_function);
          widget = new MainAreaWidget({ content });
          widget.title.label = 'Onyx';
          widget.title.closable = true;
        }
        if (!tracker.has(widget)) {
          tracker.add(widget);
        }
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, 'main');
        }

        // Activate the widget
        app.shell.activateById(widget.id);
      }
    });

    palette.addItem({ command, category: category });

    if (launcher) {
      launcher.add({
        command: command,
        category: category
      });
    }

    app.commands.addCommand(s3_command, {
      label: 'Onyx open s3 document',
      caption: 'Onyx open s3 document',
      icon: chatIcon,
      execute: () => {
        showDialog({
          body: new OpenS3FileWidget(),
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'GO' })],
          focusNodeSelector: 'input',
          title: 'Open site'
        })
          .then(result => {
            if (result.button.label === 'Cancel') {
              return;
            }
            if (!result.value) {
              return;
            }
            const s3_link = result.value;
            s3_open_function(s3_link);
          })
          .catch(reason => {
            console.error(
              `The onyx_extension server extension appears to be missing.\n${reason}`
            );
          });
      }
    });

    palette.addItem({ command: s3_command, category: category });

    if (launcher) {
      launcher.add({
        command: s3_command,
        category: category
      });
    }

    if (htmlTracker) {
      htmlTracker.widgetAdded.connect((sender, panel: HTMLViewer) => {
        panel.trusted = true;
      });
    }
  }
};

const tracker = new WidgetTracker<MainAreaWidget<ReactAppWidget>>({
  namespace: 'onyx_extension'
});

export default plugin;
