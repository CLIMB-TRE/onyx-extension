import { Widget } from '@lumino/widgets';

export class OpenS3FileWidget extends Widget {
  constructor() {
    const body = document.createElement('div');
    const existingLabel = document.createElement('label');
    existingLabel.textContent = 'S3 file name:';

    const input = document.createElement('input');
    input.value = '';
    input.placeholder = 's3://example-bucket/example-file.html';

    body.appendChild(existingLabel);
    body.appendChild(input);

    super({ node: body });
  }

  get inputNode() {
    return this.node.getElementsByTagName('input')[0];
  }

  getValue() {
    return this.inputNode.value;
  }
}
