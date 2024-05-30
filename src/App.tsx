import React from 'react';
import { ReactWidget } from '@jupyterlab/apputils';
//import App from '../../react-prototype/src/App'
import Onyx from 'climb-onyx-ui';

export class ReactAppWidget extends ReactWidget {
  constructor(dom: string, tok: string, s3: (path: string) => void) {
    super();
    this.domain = dom;
    this.token = tok;
    this.s3PathHandler= s3;
  }

  domain: string;
  token: string;
  s3PathHandler: (path: string) => void;

  render(): JSX.Element {
    return <Onyx domain={this.domain} token={this.token} s3PathHandler={this.s3PathHandler} />;
  }
}
