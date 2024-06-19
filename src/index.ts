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

import { requestAPI, requestAPIResponse } from './handler';
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
    input.placeholder = 's3://example-bucket/example-file.html';

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
 * Initialization data for the climb-onyx-ui extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb-onyx-ui:plugin',
  description: 'climb-onyx-ui.',
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
    console.log('JupyterLab extension @climb-onyx-ui is activated!');

    const command = 'onyx_extension';
    const s3_command = 's3_onyx_extension';
    const category = 'Onyx';

    let version = '';

    requestAPI<any>('version')
      .then(data => {
        version = data['version'];
        console.log(`JupyterLab extension version: ${version}`);
      })
      .catch(_ => {});

    const s3_open_function = (s3_link: string) => {
      requestAPI<any>('s3', {}, ['s3location', s3_link])
        .then(data => {
          documentManager.open(data['temp_file']);
        })
        .catch(reason => {
          console.error(
            `The climb-onyx-ui server extension appears to be missing.\n${reason}`
          );
        });
    };

    const write_file_function = (path: string, content: string) => {
      const dataToSend = { content: content };
      requestAPI<any>('file-write',  {
        body: JSON.stringify(dataToSend),
        method: 'POST'
      }, ['path', path])
        .then(data => {
          documentManager.open(data['path']);
        })
        .catch(reason => {
          console.error(
            `The climb-onyx-ui server extension appears to be missing.\n${reason}`
          );
        });
    };

    const routeHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route]);
    };

    // Create a single widget
    let widget: MainAreaWidget<ReactAppWidget>;

    app.commands.addCommand(command, {
      label: 'Onyx',
      caption: 'Onyx',
      icon: chatIcon,
      execute: () => {
        if (!widget || widget.disposed) {
          const content = new ReactAppWidget(
            routeHandler,
            s3_open_function,
            write_file_function,
            version
          );
          content.addClass('onyx-Widget');
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
              `The climb-onyx-ui server extension appears to be missing.\n${reason}`
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
  namespace: 'climb-onyx-ui'
});

export default plugin;
