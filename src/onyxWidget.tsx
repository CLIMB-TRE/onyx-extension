import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    route: (route: string) => Promise<Response>,
    s3: (path: string) => Promise<void>,
    fw: (path: string, content: string) => Promise<void>,
    v: string
  ) {
    super();
    this.httpPathHandler = route;
    this.s3PathHandler = s3;
    this.fileWriter = fw;
    this.version = v;
  }

  httpPathHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => Promise<void>;
  fileWriter: (path: string, content: string) => Promise<void>;
  version: string;

  render(): JSX.Element {
    return (
      <Onyx
        httpPathHandler={this.httpPathHandler}
        s3PathHandler={this.s3PathHandler}
        fileWriter={this.fileWriter}
        extVersion={this.version}
      />
    );
  }
}
