import React from 'react';
import { IThemeManager, ReactWidget } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { PLUGIN_NAMESPACE } from '.';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    httpPathHandler: (route: string) => Promise<Response>,
    s3PathHandler: (path: string) => Promise<void>,
    fileWriter: (path: string, content: string) => Promise<void>,
    themeManager: IThemeManager,
    version: string,
    name: string,
    stateDB: IStateDB,
    stateKeyPrefix: string,
    initialState?: Map<string, any>
  ) {
    super();
    this.httpPathHandler = httpPathHandler;
    this.s3PathHandler = s3PathHandler;
    this.fileWriter = fileWriter;
    this.themeManager = themeManager;
    this.theme = this.setTheme();
    this.version = version;
    this.name = name;
    this._stateDB = stateDB;
    this._stateKeyPrefix = stateKeyPrefix;
    this._cache = initialState ?? new Map<string, any>();

    // Cleanup stateDB on widget disposal
    this.disposed.connect(this._cleanup, this);
  }

  httpPathHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => Promise<void>;
  fileWriter: (path: string, content: string) => Promise<void>;
  themeManager: IThemeManager;
  theme: string;
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

  // Get item from the cache
  getItem(key: string) {
    const stateKey = `${this._stateKeyPrefix}:${key}`;
    return this._cache.get(stateKey);
  }

  // Set item in the cache and save to stateDB
  setItem(key: string, value: any) {
    const stateKey = `${this._stateKeyPrefix}:${key}`;
    this._cache.set(stateKey, value);
    this._save(stateKey, value);
  }

  // Set the title of the widget
  setTitle(title: string): void {
    this.title.label = title;
  }

  // Set the theme
  setTheme(): string {
    this.theme =
      this.themeManager.theme &&
      !this.themeManager.isLight(this.themeManager.theme)
        ? 'dark'
        : 'light';
    document.documentElement.setAttribute('data-bs-theme', this.theme);
    return this.theme;
  }

  // Update the theme and re-render widget
  updateTheme(): void {
    this.setTheme();
    this.update();
  }

  render(): JSX.Element {
    return (
      <Onyx
        httpPathHandler={this.httpPathHandler}
        s3PathHandler={this.s3PathHandler}
        fileWriter={this.fileWriter}
        extTheme={this.theme}
        extVersion={this.version}
        getItem={this.getItem.bind(this)}
        setItem={this.setItem.bind(this)}
        setTitle={this.setTitle.bind(this)}
      />
    );
  }
}
