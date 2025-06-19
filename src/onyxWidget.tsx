import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { PLUGIN_ID } from '.';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    route: (route: string) => Promise<Response>,
    s3: (path: string) => Promise<void>,
    fw: (path: string, content: string) => Promise<void>,
    v: string,
    sessionID: string,
    stateDB: IStateDB
  ) {
    super();
    this.httpPathHandler = route;
    this.s3PathHandler = s3;
    this.fileWriter = fw;
    this.version = v;
    this.sessionID = sessionID;
    this._stateDB = stateDB;
    this._stateKey = `${PLUGIN_ID}:${sessionID}`;
    this._cache = new Map<string, any>();
    this._loadCache();

    // Cleanup state on disposal
    this.disposed.connect(this._cleanup, this);
  }

  httpPathHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => Promise<void>;
  fileWriter: (path: string, content: string) => Promise<void>;
  version: string;
  sessionID: string;

  private _stateDB: IStateDB;
  private _stateKey: string;
  private _cache: Map<string, any>;
  private _isLoaded = false;

  // Load all data into cache on initialisation
  private async _loadCache(): Promise<void> {
    try {
      const data = await this._stateDB.fetch(this._stateKey);
      if (data && typeof data === 'object') {
        this._cache = new Map(Object.entries(data));
      }
    } catch {
      // No existing data
    }
    this._isLoaded = true;
  }

  // Save cache to IStateDB
  private async _saveCache(): Promise<void> {
    if (!this._isLoaded) {
      return;
    }
    const data = Object.fromEntries(this._cache);
    await this._stateDB.save(this._stateKey, data);
  }

  private _cleanup = async (): Promise<void> => {
    try {
      await this._stateDB.remove(this._stateKey);
      console.log(`OnyxWidget: Cleaned up state for session ${this.sessionID}`);
    } catch (error) {
      console.error(`Failed to clean up state for ${this.sessionID}:`, error);
    }
  };

  // Synchronous getItem using cache
  getItem = (key: string): any => {
    const value = this._cache.get(key);
    console.log(`OnyxWidget: getItem(${key})`, value);
    return value;
  };

  // Synchronous setItem with async persistence
  setItem = (key: string, value: any): void => {
    console.log(`OnyxWidget: setItem(${key}, ${value})`);
    this._cache.set(key, value);
    // Async save without blocking
    this._saveCache().catch(console.error);
  };

  render(): JSX.Element {
    return (
      <Onyx
        httpPathHandler={this.httpPathHandler}
        s3PathHandler={this.s3PathHandler}
        fileWriter={this.fileWriter}
        extVersion={this.version}
        getItem={this.getItem.bind(this)}
        setItem={this.setItem.bind(this)}
      />
    );
  }
}
