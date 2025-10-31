import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ICommandPalette,
  IThemeManager,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { HTMLViewer, IHTMLViewerTracker } from '@jupyterlab/htmlviewer';
import { ILauncher } from '@jupyterlab/launcher';
import { requestAPI, requestAPIResponse } from './handler';
import { OnyxWidget } from './onyxWidget';
import { docsIcon, onyxIcon } from './icon';

export const PLUGIN_NAME = 'climb-onyx-gui';
// Namespace still includes '-extension' suffix
// This is to enable continuation of pre-existing saved states
export const PLUGIN_NAMESPACE = `@${PLUGIN_NAME}-extension`;
const PLUGIN_ID = `${PLUGIN_NAMESPACE}:plugin`;

const tracker = new WidgetTracker<MainAreaWidget<OnyxWidget>>({
  namespace: PLUGIN_NAME // Maintain consistency with existing tracker namespace
});

/**
 * Initialization data for the climb-onyx-gui extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  description: 'JupyterLab extension for the Onyx Graphical User Interface',
  autoStart: true,
  requires: [ICommandPalette, IDocumentManager, IStateDB, IThemeManager],
  optional: [ILauncher, ILayoutRestorer, IHTMLViewerTracker],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    stateDB: IStateDB,
    themeManager: IThemeManager,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null,
    htmlTracker: IHTMLViewerTracker | null
  ) => {
    console.log(`JupyterLab extension ${PLUGIN_NAME} is activated!`);

    // Define command IDs and categories
    const docsCommandID = 'docs_extension';
    const onyxCommandID = 'onyx_extension';
    const category = 'CLIMB-TRE';

    // Retrieve extension version and log to the console
    let version = '';
    requestAPI<any>('version')
      .then(data => {
        version = data['version'];
        console.log(`JupyterLab extension ${PLUGIN_NAME} version: ${version}`);
      })
      .catch(error =>
        console.error(`Failed to fetch ${PLUGIN_NAME} version: ${error}`)
      );

    // Handler for determining if the Onyx Widget is enabled
    const widgetEnabledHandler = async (): Promise<boolean> => {
      return requestAPI<any>('widget-enabled')
        .then(data => {
          return data['enabled'];
        })
        .catch(error => {
          console.error(`Failed to fetch ${PLUGIN_NAME} status: ${error}`);
          return false;
        });
    };

    // Handler for rerouting requests to the Onyx API
    const httpPathHandler = async (route: string): Promise<Response> => {
      return requestAPIResponse('reroute', {}, ['route', route]);
    };

    // Handler for opening S3 documents
    const s3PathHandler = async (uri: string): Promise<void> => {
      return requestAPI<any>('s3', {}, ['uri', uri]).then(data => {
        documentManager.open(data['path']);
      });
    };

    // Handler for writing files
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

    // Handle layout restoration
    if (restorer) {
      void restorer.restore(tracker, {
        command: onyxCommandID,
        args: widget => ({ name: widget.content.name }),
        name: widget => widget.content.name
      });
    }

    // Function to create new Onyx widgets
    const createOnyxWidget = async (
      name?: string
    ): Promise<MainAreaWidget<OnyxWidget>> => {
      // Generate a unique name if not provided
      if (!name) {
        name = Date.now().toString();
      }

      // Prefix shared by all state keys for this widget
      const stateKeyPrefix = `${PLUGIN_ID}:${name}`;

      // Load any initial state before widget creation
      const initialState = new Map<string, any>();
      const pluginStateKeys = await stateDB.list(PLUGIN_NAMESPACE);

      pluginStateKeys.ids.forEach((stateKey, index) => {
        if (stateKey.startsWith(stateKeyPrefix)) {
          initialState.set(stateKey, pluginStateKeys.values[index]);
        }
      });

      // Determine if the widget is enabled
      const widgetEnabled = await widgetEnabledHandler();

      // Create the OnyxWidget instance
      const content = new OnyxWidget(
        widgetEnabled,
        httpPathHandler,
        s3PathHandler,
        fileWriteHandler,
        themeManager,
        version,
        name,
        stateDB,
        stateKeyPrefix,
        initialState
      );

      // Add class for the widget
      content.addClass('onyx-Widget');

      // Define the MainAreaWidget with the OnyxWidget content
      const widget = new MainAreaWidget({ content });
      widget.id = `onyx-widget-${name}`;
      widget.title.label = 'Onyx';
      widget.title.icon = onyxIcon;
      widget.title.closable = true;

      return widget;
    };

    // Add commands to the command registry
    // Command to open the CLIMB-TRE documentation
    app.commands.addCommand(docsCommandID, {
      label: 'CLIMB-TRE Documentation',
      caption: 'CLIMB-TRE Documentation',
      icon: docsIcon,
      execute: () => {
        // Open link in new tab
        window.open('https://climb-tre.github.io/');
      }
    });

    // Command to launch the Onyx GUI
    app.commands.addCommand(onyxCommandID, {
      label: 'Onyx',
      caption: 'Onyx | API for Pathogen Metadata',
      icon: onyxIcon,
      execute: async args => {
        const name = args['name'] as string;
        let widget: MainAreaWidget<OnyxWidget>;

        if (name) {
          // Restore existing widget
          const existingWidget = tracker.find(w => w.content.name === name);
          if (existingWidget) {
            widget = existingWidget;
          } else {
            widget = await createOnyxWidget(name);
          }
        } else {
          // Create new widget
          widget = await createOnyxWidget();
        }

        // Add the widget to the tracker if it's not there
        if (!tracker.has(widget)) {
          tracker.add(widget);
        }

        // Attach the widget to the main work area if it's not there
        if (!widget.isAttached) {
          app.shell.add(widget, 'main');
        }

        // Activate and return the widget
        app.shell.activateById(widget.id);
        return widget;
      }
    });

    // Add commands to the command palette
    palette.addItem({ command: docsCommandID, category: category });
    palette.addItem({ command: onyxCommandID, category: category });

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
    }

    if (htmlTracker) {
      htmlTracker.widgetAdded.connect((sender, panel: HTMLViewer) => {
        panel.trusted = true;
      });
    }

    // Update theme on change
    themeManager.themeChanged.connect(theme => {
      tracker.forEach(w => w.content.updateTheme(theme.theme));
    });
  }
};

export default plugin;
