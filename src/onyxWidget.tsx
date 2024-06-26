import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
import Onyx from 'climb-onyx-gui';

export class OnyxWidget extends ReactWidget {
  constructor(
    route: (route: string) => Promise<Response>,
    s3: (path: string) => void,
    fw: (path: string, content: string) => void,
    v: string
  ) {
    super();
    this.routeHandler = route;
    this.s3PathHandler = s3;
    this.fileWriter = fw;
    this.version = v;
  }

  routeHandler: (route: string) => Promise<Response>;
  s3PathHandler: (path: string) => void;
  fileWriter: (path: string, content: string) => void;
  version: string;

  render(): JSX.Element {
    return (
      <Onyx
        httpPathHandler={this.routeHandler}
        s3PathHandler={this.s3PathHandler}
        fileWriter={this.fileWriter}
        extVersion={this.version}
      />
    );
  }
}
