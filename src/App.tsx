import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
//import App from '../../react-prototype/src/App'
import Onyx from 'climb-onyx-ui';

export class ReactAppWidget extends ReactWidget {
  constructor(route: (route: string)=> Promise<Response>, s3: (path: string) => void) {
    super();
    this.routeHandler = route;
    this.s3PathHandler= s3;
  }

  routeHandler: (route: string)=> Promise<Response>;
  s3PathHandler: (path: string) => void;

  render(): JSX.Element {
    return <Onyx httpPathHandler={this.routeHandler} s3PathHandler={this.s3PathHandler} />;
  }
}
