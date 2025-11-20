import React from 'react';
import { IThemeManager, ReactWidget } from '@jupyterlab/apputils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IStateDB } from '@jupyterlab/statedb';
import { PLUGIN_NAMESPACE } from '.';
import { requestAPI, requestAPIResponse } from './handler';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    widgetEnabled: boolean,
    documentManager: IDocumentManager,
    themeManager: IThemeManager,
    version: string,
    name: string,
    stateDB: IStateDB,
    stateKeyPrefix: string,
    initialState?: Map<string, any>
  ) {
    super();
    this.widgetEnabled = widgetEnabled;
    this.documentManager = documentManager;
    this.themeManager = themeManager;
    this.bsTheme = this.setBSTheme(this.themeManager.theme);
    this.version = version;
    this.name = name;
    this._stateDB = stateDB;
    this._stateKeyPrefix = stateKeyPrefix;
    this._cache = initialState ?? new Map<string, any>();

    // Add class for the widget
    this.addClass('onyx-Widget');

    // Cleanup stateDB on widget disposal
    this.disposed.connect(this._cleanup, this);
  }

  widgetEnabled: boolean;
  documentManager: IDocumentManager;
  themeManager: IThemeManager;
  bsTheme: string;
  version: string;
  name: string;
  private _stateDB: IStateDB;
  private _stateKeyPrefix: string;
  private _cache: Map<string, any>;

  // Save value to stateDB
  private _save(stateKey: string, value: any) {
    this._stateDB.save(stateKey, value).catch(error => {
      console.error(`Failed to save state ${stateKey}:`, error);
    });
  }

  // Cleanup stateDB
  private async _cleanup() {
    const pluginStateKeys = await this._stateDB.list(PLUGIN_NAMESPACE);

    // Remove all keys that start with the stateKeyPrefix
    pluginStateKeys.ids.forEach(stateKey => {
      if (stateKey.startsWith(this._stateKeyPrefix)) {
        this._stateDB.remove(stateKey).catch(error => {
          console.error(`Failed to remove state ${stateKey}:`, error);
        });
      }
    });
  }

  // Set the bootstrap theme from JupyterLab theme
  setBSTheme(theme: string | null): string {
    this.bsTheme =
      theme && !this.themeManager.isLight(theme) ? 'dark' : 'light';
    document.documentElement.setAttribute('data-bs-theme', this.bsTheme);
    return this.bsTheme;
  }

  // Update the bootstrap theme and re-render widget
  updateTheme(theme: string | null): void {
    this.setBSTheme(theme);
    this.update();
  }

  // Handler for rerouting requests to the Onyx API
  httpPathHandler = async (route: string): Promise<Response> => {
    return requestAPIResponse('reroute', {}, ['route', route]);
  };

  // Handler for opening S3 documents
  s3PathHandler = async (uri: string): Promise<void> => {
    const data = await requestAPI<any>('s3', {}, ['uri', uri]);
    this.documentManager.open(data['path']);
  };

  // Handler for writing files
  fileWriter = async (path: string, content: string): Promise<void> => {
    const data = await requestAPI<any>(
      'file-write',
      {
        body: JSON.stringify({ content: content }),
        method: 'POST'
      },
      ['path', path]
    );
    this.documentManager.open(data['path']);
  };

  // Get item from the cache
  getItem = (key: string) => {
    const stateKey = `${this._stateKeyPrefix}:${key}`;
    return this._cache.get(stateKey);
  };

  // Set item in the cache and save to stateDB
  setItem = (key: string, value: any) => {
    const stateKey = `${this._stateKeyPrefix}:${key}`;
    this._cache.set(stateKey, value);
    this._save(stateKey, value);
  };

  // Set the title of the widget
  setTitle = (title: string): void => {
    this.title.label = title;
  };

  render(): JSX.Element {
    return (
      <Onyx
        enabled={this.widgetEnabled}
        extTheme={this.bsTheme}
        extVersion={this.version}
        httpPathHandler={this.httpPathHandler}
        s3PathHandler={this.s3PathHandler}
        fileWriter={this.fileWriter}
        getItem={this.getItem}
        setItem={this.setItem}
        setTitle={this.setTitle}
      />
    );
  }
}
