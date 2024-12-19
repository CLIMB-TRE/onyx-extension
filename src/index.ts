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
import { OnyxWidget } from './onyxWidget';
import { AgateWidget } from './agateWidget';
import { dnaIcon, innerJoinIcon, openFileIcon } from './icon';
import { OpenS3FileWidget } from './openS3FileWidget';

/**
 * Initialization data for the climb-onyx-gui extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'climb-onyx-gui-extension:plugin',
  description: 'JupyterLab extension for the Onyx Graphical User Interface',
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
    console.log('JupyterLab extension @climb-onyx-gui is activated!');

    const docs_command = 'docs_extension';
    const onyx_command = 'onyx_extension';
    const agate_command = 'agate_extension';
    const s3_command = 's3_onyx_extension';
    const category = 'CLIMB-TRE';

    let version = '';

    requestAPI<any>('version')
      .then(data => {
        version = data['version'];
        console.log(`JupyterLab extension version: ${version}`);
      })
      .catch(_ => {});

    const httpPathHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route]);
    };

    
    const httpAgatePathHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route], true);
    };

    const s3PathHandler = async (path: string): Promise<void> => {
      return requestAPI<any>('s3', {}, ['s3location', path]).then(data => {
        documentManager.open(data['temp_file']);
      });
    };

    const fileWriteHandler = async (
      path: string,
      content: string
    ): Promise<void> => {
      return requestAPI<any>(
        'file-write',
        {
          body: JSON.stringify({ content: content }),
          method: 'POST'
        },
        ['path', path]
      ).then(data => {
        documentManager.open(data['path']);
      });
    };

    app.commands.addCommand(docs_command, {
      label: 'CLIMB-TRE Documentation',
      caption: 'CLIMB-TRE Documentation',
      icon: dnaIcon,
      execute: () => {
        // Open link in new tab
        window.open('https://climb-tre.github.io/');
      }
    });

    // Create a single widget
    let widget: MainAreaWidget<OnyxWidget>;

    app.commands.addCommand(onyx_command, {
      label: 'Onyx',
      caption: 'Onyx',
      icon: innerJoinIcon,
      execute: () => {
        if (!widget || widget.disposed) {
          const content = new OnyxWidget(
            httpPathHandler,
            s3PathHandler,
            fileWriteHandler,
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

    // Create a single agate widget
    let agate_widget: MainAreaWidget<AgateWidget>;

    app.commands.addCommand(agate_command, {
      label: 'Agate',
      caption: 'Agate',
      icon: dnaIcon,
      execute: () => {
        if (!agate_widget || agate_widget.disposed) {
          const content = new AgateWidget(
            httpAgatePathHandler,
            s3PathHandler,
            fileWriteHandler,
            version
          );
          content.addClass('agate-Widget');
          agate_widget = new MainAreaWidget({ content });
          agate_widget.title.label = 'Agate';
          agate_widget.title.closable = true;
        }
        if (!agate_tracker.has(agate_widget)) {
          agate_tracker.add(agate_widget);
        }
        if (!agate_widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(agate_widget, 'main');
        }

        // Activate the widget
        app.shell.activateById(agate_widget.id);
      }
    });

    app.commands.addCommand(s3_command, {
      label: 'Open S3 Document',
      caption: 'Open S3 Document',
      icon: openFileIcon,
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
            s3PathHandler(s3_link).catch(reason => {
              console.error(
                `The climb-onyx-gui server extension appears to be missing.\n${reason}`
              );
            });
          })
          .catch(reason => {
            console.error(
              `The climb-onyx-gui server extension appears to be missing.\n${reason}`
            );
          });
      }
    });

    palette.addItem({ command: docs_command, category: category });
    palette.addItem({ command: onyx_command, category: category });
    palette.addItem({ command: agate_command, category: category });
    palette.addItem({ command: s3_command, category: category });

    if (launcher) {
      launcher.add({command: docs_command, category: category});
      launcher.add({command: onyx_command, category: category});
      launcher.add({command: s3_command, category: category});
      launcher.add({command: agate_command,category: category});
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

const agate_tracker = new WidgetTracker<MainAreaWidget<AgateWidget>>({
  namespace: 'climb-agate-gui'
});

export default plugin;
