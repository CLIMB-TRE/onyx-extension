import { LabIcon } from '@jupyterlab/ui-components';
import DNA_ICON from './../style/icons/dna.svg';
import INNER_JOIN_ICON from './../style/icons/inner_join.svg';
import OPEN_FILE_ICON from './../style/icons/open_file.svg';

export const dnaIcon = new LabIcon({
  name: 'climb-onyx-gui:dna',
  svgstr: DNA_ICON
});

export const innerJoinIcon = new LabIcon({
  name: 'climb-onyx-gui:inner-join',
  svgstr: INNER_JOIN_ICON
});

export const openFileIcon = new LabIcon({
  name: 'climb-onyx-gui:open-file',
  svgstr: OPEN_FILE_ICON
});
