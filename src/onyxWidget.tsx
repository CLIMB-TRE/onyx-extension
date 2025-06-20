import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import { IStateDB } from '@jupyterlab/statedb';
import { PLUGIN_ID } from '.';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    httpPathHandler: (route: string) => Promise<Response>,
    s3PathHandler: (path: string) => Promise<void>,
    fileWriter: (path: string, content: string) => Promise<void>,
    version: string,
    sessionID: string,
    stateDB: IStateDB
  ) {
    super();
    this.httpPathHandler = httpPathHandler;
    this.s3PathHandler = s3PathHandler;
    this.fileWriter = fileWriter;
    this.version = version;
    this.sessionID = sessionID;
    this._stateDB = stateDB;
    this._stateKey = `${PLUGIN_ID}:${sessionID}`;
    this._cache = new Map<string, any>();
    this._isLoaded = false;

    // Load initial state from stateDB into cache
    this._loadCache();

    // Cleanup stateDB on widget disposal
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
  private _isLoaded: boolean;

  // Load all data into cache on initialisation
  private _loadCache() {
    this._stateDB
      .fetch(this._stateKey)
      .then(data => {
        if (data && typeof data === 'object') {
          this._cache = new Map(Object.entries(data));
        }
      })
      .catch(error => {
        console.error(
          `Failed to load state for Onyx ${this.sessionID}:`,
          error
        );
      })
      .finally(() => {
        this._isLoaded = true;
      });
  }

  // Save cache to stateDB
  private _saveCache() {
    if (!this._isLoaded) {
      return;
    }
    this._stateDB
      .save(this._stateKey, Object.fromEntries(this._cache))
      .catch(error => {
        console.error(
          `Failed to save state for Onyx ${this.sessionID}:`,
          error
        );
      });
  }

  // Cleanup stateDB
  private _cleanup() {
    this._stateDB.remove(this._stateKey).catch(error => {
      console.error(
        `Failed to remove state for Onyx ${this.sessionID}:`,
        error
      );
    });
  }

  // Get item from the cache
  getItem(key: string) {
    const value = this._cache.get(key);
    console.log(`OnyxWidget: getItem(${key})`, value);
    return value;
  }

  // Set item in the cache and save cache to stateDB
  setItem(key: string, value: any) {
    console.log(`OnyxWidget: setItem(${key}, ${value})`);
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
