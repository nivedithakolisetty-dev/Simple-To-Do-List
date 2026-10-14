/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#17352A',
    tint: '#285B43',

    background: '#F5F5EF',
    foreground: '#17352A',

    card: '#FFFFFF',
    cardForeground: '#17352A',

    primary: '#285B43',
    primaryForeground: '#FFFFFF',

    secondary: '#E8EDE3',
    secondaryForeground: '#355344',

    muted: '#E9EDE5',
    mutedForeground: '#718076',

    accent: '#E8EDC8',
    accentForeground: '#355344',

    destructive: '#B34E43',
    destructiveForeground: '#FFFFFF',

    border: '#E1E6DC',
    input: '#D9E0D5',
  },
  dark: {
    text: '#EAF2E8',
    tint: '#B6D780',
    background: '#121A16',
    foreground: '#EAF2E8',
    card: '#1D2922',
    cardForeground: '#EAF2E8',
    primary: '#B6D780',
    primaryForeground: '#17231B',
    secondary: '#29372E',
    secondaryForeground: '#DBE7D9',
    muted: '#29372E',
    mutedForeground: '#A0B0A2',
    accent: '#34412B',
    accentForeground: '#D9E8B2',
    destructive: '#E27669',
    destructiveForeground: '#24110F',
    border: '#334238',
    input: '#3C4B40',
  },

  radius: 18,
};

export default colors;
