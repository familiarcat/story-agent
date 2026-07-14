export type ThemeOverrideKey =
  | 'bg'
  | 'surface'
  | 'surface-2'
  | 'text'
  | 'text-dim'
  | 'border'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'accent4'
  | 'danger'
  | 'ok'
  | 'warn'
  | 'on-accent'
  | 'radius'
  | 'radius-elbow'
  | 'font'
  | 'uppercase';

export type ThemeOverrideMap = Partial<Record<ThemeOverrideKey, string>>;

export const THEME_LAYER_STACK = ['core', 'client', 'project', 'aspect'] as const;

export type ClientThemeId = 'none' | 'regulated' | 'executive' | 'consumer';
export type ProjectThemeId = 'none' | 'operations' | 'research' | 'delivery';
export type AspectThemeId = 'none' | 'telemetry' | 'planning' | 'analysis';

export const CLIENT_THEME_PRESETS: Record<ClientThemeId, ThemeOverrideMap> = {
  none: {},
  regulated: {
    accent4: '#7fc9ff',
    border: '#5f7a8f',
    warn: '#f2c35d',
  },
  executive: {
    accent1: '#f4b15a',
    accent3: '#c7a4d8',
    radius: '10px',
  },
  consumer: {
    accent1: '#5fa9ff',
    accent2: '#8f84ff',
    accent4: '#7dd3fc',
  },
};

export const PROJECT_THEME_PRESETS: Record<ProjectThemeId, ThemeOverrideMap> = {
  none: {},
  operations: {
    surface: '#171d24',
    'surface-2': '#202934',
    accent4: '#82c9ff',
  },
  research: {
    surface: '#1c1524',
    'surface-2': '#271f31',
    accent3: '#c7a4df',
  },
  delivery: {
    surface: '#1c1c20',
    'surface-2': '#252832',
    ok: '#76d59a',
  },
};

export const ASPECT_THEME_PRESETS: Record<AspectThemeId, ThemeOverrideMap> = {
  none: {},
  telemetry: {
    accent4: '#6fd3ff',
    text: '#e6f4ff',
  },
  planning: {
    accent2: '#f0c56a',
    warn: '#ffcd70',
  },
  analysis: {
    accent3: '#9ec8ff',
    'text-dim': '#c9d8ea',
  },
};

export function composeThemeLayerOverrides(input: {
  clientTheme: ClientThemeId;
  projectTheme: ProjectThemeId;
  aspectTheme: AspectThemeId;
}): ThemeOverrideMap {
  return {
    ...CLIENT_THEME_PRESETS[input.clientTheme],
    ...PROJECT_THEME_PRESETS[input.projectTheme],
    ...ASPECT_THEME_PRESETS[input.aspectTheme],
  };
}

export function toCssVarName(key: ThemeOverrideKey): string {
  return `--${key}`;
}
