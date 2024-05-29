import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette, MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { IDocumentManager } from '@jupyterlab/docmanager';


import { ILauncher } from '@jupyterlab/launcher';

import { requestAPI } from './handler';
import { ReactAppWidget } from './App'
import { chatIcon } from './icon';

/**
 * Initialization data for the onyx_extension extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'onyx_extension:plugin',
  description:
    'Onyx-extension.',
  autoStart: true,
  optional: [ILauncher],
  requires: [ICommandPalette, IDocumentManager],
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    documentManager: IDocumentManager,
    launcher: ILauncher | null
  ) => {
    console.log(
      'JupyterLab extension @onyx_extension is activated!'
    );

    
    const command = 'onyx_extension';
    const s3_command = 's3_onyx_extension';
    const category = 'Onyx';
    
  
  let domain: string
  let token: string

  requestAPI<any>('settings')
      .then(data => {
        console.log(data);
        domain = data['domain']
        token = data['token']
      })
      .catch(reason => {
        console.error(
          `The onyx_extension server extension appears to be missing.\n${reason}`
        );
      });
      
  // Create a single widget
  let widget: MainAreaWidget<ReactAppWidget>

  app.commands.addCommand(command, {
      label: 'Onyx',
      caption: 'Onyx',
      icon: chatIcon,
      execute: () => {
        if (!widget || widget.disposed) {
          const content = new ReactAppWidget(domain,token)
          widget = new MainAreaWidget({ content })
          widget.title.label = 'Onyx'
          widget.title.closable = true
        }
        if (!tracker.has(widget)) {
          tracker.add(widget)
        }
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, 'main')
        }
  
        // Activate the widget
        app.shell.activateById(widget.id)
      },
    });

    palette.addItem({ command, category: category });

    if (launcher) {
      // Add launcher
      launcher.add({
        command: command,
        category: category
      });
    }


    app.commands.addCommand(s3_command, {
      label: 'Onyx s3',
      caption: 'Onyx s3',
      icon: chatIcon,
      execute: () => {
        requestAPI<any>('s3?s3location="s3://mscape-published-reports/C-B01922D432_scylla_report.html"',{},
        ['s3location','s3://mscape-published-reports/C-B01922D432_scylla_report.html'])
      .then(data => {
        console.log(data);
        documentManager.open('a.tmp')
      })
      .catch(reason => {
        console.error(
          `The onyx_extension server extension appears to be missing.\n${reason}`
        );
      });

        
        
        
      },
    });

    palette.addItem({ command:s3_command, category: category });


  }
};

const tracker = new WidgetTracker<MainAreaWidget<ReactAppWidget>>({
  namespace: 'onyx_extension',
})

export default plugin;
