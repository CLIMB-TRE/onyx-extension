import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    route: (route: string) => Promise<Response>,
    s3: (path: string) => Promise<void>,
    fw: (path: string, content: string) => Promise<void>,
    v: string,
    sessionID: string
  ) {
    super();
    this.httpPathHandler = route;
    this.s3PathHandler = s3;
    this.fileWriter = fw;
    this.version = v;
    this.sessionID = sessionID;
    this._sessionData = new Map<string, any>();
  }

  httpPathHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => Promise<void>;
  fileWriter: (path: string, content: string) => Promise<void>;
  version: string;
  sessionID: string;
  private _sessionData: Map<string, any>;

  getItem(key: string): any {
    const value = this._sessionData.get(key);
    console.log(`Getting session data for key: ${key}, value: ${value}`);
    return value;
  }

  setItem(key: string, value: any): void {
    console.log(`Setting session data for key: ${key}, value: ${value}`);
    this._sessionData.set(key, value);
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
