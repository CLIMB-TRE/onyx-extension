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

    // Define command IDs and categories
    const docsCommandID = 'docs_extension';
    const onyxCommandID = 'onyx_extension';
    const s3CommandID = 's3_onyx_extension';
    const category = 'CLIMB-TRE';

    // Retrieve extension version and log to the console
    let version = '';
    requestAPI<any>('version')
      .then(data => {
        version = data['version'];
        console.log(`JupyterLab extension @climb-onyx-gui version: ${version}`);
      })
      .catch(_ => {});

    // Define handlers
    const httpPathHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route]);
    };

    const s3PathHandler = async (uri: string): Promise<void> => {
      return requestAPI<any>('s3', {}, ['uri', uri]).then(data => {
        documentManager.open(data['path']);
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

    // Add commands to the command registry
    app.commands.addCommand(docsCommandID, {
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

    app.commands.addCommand(onyxCommandID, {
      label: 'Onyx',
      caption: 'Onyx | API for Pathogen Metadata',
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
          widget.title.icon = innerJoinIcon;
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

    app.commands.addCommand(s3CommandID, {
      label: 'Open S3 Document',
      caption: 'Open S3 Document',
      icon: openFileIcon,
      execute: () => {
        showDialog({
          body: new OpenS3FileWidget(),
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Open' })],
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
            s3PathHandler(s3_link).catch(reason => console.error(reason));
          })
          .catch(reason => console.error(reason));
      }
    });

    // Add commands to the command palette
    palette.addItem({ command: docsCommandID, category: category });
    palette.addItem({ command: onyxCommandID, category: category });
    palette.addItem({ command: s3CommandID, category: category });

    // Add commands to the launcher
    if (launcher) {
      launcher.add({
        command: docsCommandID,
        category: category
      });

      launcher.add({
        command: onyxCommandID,
        category: category
      });

      launcher.add({
        command: s3CommandID,
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
