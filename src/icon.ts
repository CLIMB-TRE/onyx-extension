import { LabIcon } from '@jupyterlab/ui-components';
import DOCS_ICON from './../style/icons/docs.svg';
import ONYX_ICON from './../style/icons/onyx.svg';

export const docsIcon = new LabIcon({
  name: 'climb-onyx-gui:dna',
  svgstr: DOCS_ICON
});

export const onyxIcon = new LabIcon({
  name: 'climb-onyx-gui:inner-join',
  svgstr: ONYX_ICON
});
