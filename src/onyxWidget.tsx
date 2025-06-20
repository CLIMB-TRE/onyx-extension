import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    httpPathHandler: (route: string) => Promise<Response>,
    s3PathHandler: (path: string) => Promise<void>,
    fileWriter: (path: string, content: string) => Promise<void>,
    version: string,
    name: string,
    stateDB: IStateDB,
    stateKey: string,
    initialState?: Map<string, any>
  ) {
    super();
    this.httpPathHandler = httpPathHandler;
    this.s3PathHandler = s3PathHandler;
    this.fileWriter = fileWriter;
    this.version = version;
    this.name = name;
    this._stateDB = stateDB;
    this._stateKey = stateKey;
    this._cache = initialState ?? new Map<string, any>();

    // Cleanup stateDB on widget disposal
    this.disposed.connect(this._cleanup, this);
  }

  httpPathHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => Promise<void>;
  fileWriter: (path: string, content: string) => Promise<void>;
  version: string;
  name: string;

  private _stateDB: IStateDB;
  private _stateKey: string;
  private _cache: Map<string, any>;

  // Save cache to stateDB
  private _saveCache() {
    this._stateDB
      .save(this._stateKey, Object.fromEntries(this._cache))
      .catch(error => {
        console.error(`Failed to save state for ${this._stateKey}:`, error);
      });
  }

  // Cleanup stateDB
  private _cleanup() {
    this._stateDB.remove(this._stateKey).catch(error => {
      console.error(`Failed to remove state for ${this._stateKey}:`, error);
    });
  }

  // Get item from the cache
  getItem(key: string) {
    const value = this._cache.get(key);
    console.log(`${this._stateKey}: getItem(${key})`, value);
    return value;
  }

  // Set item in the cache and save cache to stateDB
  setItem(key: string, value: any) {
    console.log(`${this._stateKey}: setItem(${key}, ${value})`);
    this._cache.set(key, value);
    this._saveCache();
  }

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
