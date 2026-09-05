import { styleVariables } from '../utils';

/*
 * Chart colors are derived from the Material theme mirror in `utils.ts` so charts stay in
 * step with `_variables.scss` instead of carrying their own hardcoded hex values.
 * See the note above `styleVariables` for why the SCSS cannot be imported directly.
 */
export const chartPalette = {
  primary: styleVariables.primary,
  primaryLighter: styleVariables.primaryLighter,
  accent: styleVariables.accent,
  accentLighter: styleVariables.accentLighter,
  grey: styleVariables.grey,
  greyText: styleVariables.greyText,
  credit: '#43a047',
  debit: '#e53935'
};

export const categoricalPalette = [
  chartPalette.primary,
  chartPalette.accent,
  chartPalette.credit,
  chartPalette.debit,
  '#8e24aa',
  '#00acc1',
  '#fb8c00',
  '#5e35b1',
  '#7cb342',
  chartPalette.grey
];

export const paletteColor = (index: number) => categoricalPalette[index % categoricalPalette.length];

export const paletteColors = (count: number) => Array.from({ length: count }, (_unused, index) => paletteColor(index));
