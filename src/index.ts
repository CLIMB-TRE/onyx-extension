import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  showDialog,
  Dialog,
  IThemeManager
} from '@jupyterlab/apputils';

import { IDocumentManager } from '@jupyterlab/docmanager';
import { HTMLViewer, IHTMLViewerTracker } from '@jupyterlab/htmlviewer';

import { ILauncher } from '@jupyterlab/launcher';

import { requestAPI, requestAPIResponse } from './handler';
import { OnyxWidget } from './onyxWidget';
import { dnaIcon } from './icon';
import { OpenS3FileWidget } from './openS3FileWidget';

/**
 * Initialization data for the climb-onyx-gui extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb-onyx-gui-extension:plugin',
  description: 'JupyterLab extension for the Onyx Graphical User Interface',
  autoStart: true,
  optional: [ILauncher, IHTMLViewerTracker],
  requires: [ICommandPalette, IDocumentManager, IThemeManager],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    themeManager: IThemeManager,
    launcher: ILauncher | null,
    htmlTracker: IHTMLViewerTracker | null
  ) => {
    console.log('JupyterLab extension @climb-onyx-gui is activated!');

    const command = 'onyx_extension';
    const s3_command = 's3_onyx_extension';
    const category = 'CLIMB-TRE';

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
            `The climb-onyx-gui server extension appears to be missing.\n${reason}`
          );
        });
    };

    const write_file_function = (path: string, content: string) => {
      const dataToSend = { content: content };
      requestAPI<any>(
        'file-write',
        {
          body: JSON.stringify(dataToSend),
          method: 'POST'
        },
        ['path', path]
      )
        .then(data => {
          documentManager.open(data['path']);
        })
        .catch(reason => {
          console.error(
            `The climb-onyx-gui server extension appears to be missing.\n${reason}`
          );
        });
    };

    const routeHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route]);
    };

    // Create a single widget
    let widget: MainAreaWidget<OnyxWidget>;

    app.commands.addCommand(command, {
      label: 'Onyx',
      caption: 'Onyx',
      icon: dnaIcon,
      execute: () => {
        console.log(themeManager.theme);
        themeManager.themeChanged.connect((sender, args) => {
          console.log(args);
        });

        if (!widget || widget.disposed) {
          const content = new OnyxWidget(
            routeHandler,
            s3_open_function,
            write_file_function,
            themeManager.theme || ''
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
      label: 'Open s3 document',
      caption: 'Open s3 document',
      icon: dnaIcon,
      execute: () => {
        showDialog({
          body: new OpenS3FileWidget(),
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'GO' })],
          focusNodeSelector: 'input',
          title: 'Open S3 Document'
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
              `The climb-onyx-gui server extension appears to be missing.\n${reason}`
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

const tracker = new WidgetTracker<MainAreaWidget<OnyxWidget>>({
  namespace: 'climb-onyx-gui'
});

export default plugin;
