/** Classes of CSS modules: `.root`, `.qrCodeStub`. */
const CAMEL_CASE_CLASS = /^[a-z][a-zA-Z0-9]*$/;

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-recommended-scss', 'stylelint-config-recommended-vue/scss'],
  ignoreFiles: [
    '.nuxt/**',
    '.output/**',
    'dist/**',
    'tests/visual/{report,results}/**',
    'layers/colors/app/assets/generated.css',
  ],
  // `stylelint-disable` must say why the rule is broken: `/* stylelint-disable-line rule -- reason */`.
  reportDescriptionlessDisables: true,
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  rules: {
    'scss/at-rule-no-unknown': [true, {
      ignoreAtRules: ['theme', 'source', 'custom-variant', 'utility', 'variant', 'reference', 'slot'],
    }],
    // Empty `//` lines separate paragraphs of a comment.
    'scss/comment-no-empty': null,

    'declaration-no-important': true,
    'selector-max-id': 0,
    // A warning until the brand gradients of pages get tokens.
    'color-no-hex': [true, { severity: 'warning' }],

    // Theme and motion go through the `theme` and `motion` mixins.
    'media-feature-name-disallowed-list': [['prefers-color-scheme', 'prefers-reduced-motion'], {
      message: name => `Use the \`theme\` / \`motion\` mixins instead of "${name}"`,
    }],
    // Insets go through `insets.$top` and others.
    'declaration-property-value-disallowed-list': [{ '/.*/': ['/--safe-area-inset-/'] }, {
      message: 'Use `insets.$top`, `insets.$bottom`, … instead of `var(--safe-area-inset-*)`',
    }],
  },
  overrides: [
    {
      files: ['**/*.vue'],
      rules: {
        'at-rule-disallowed-list': [['apply', 'reference'], {
          message: name => `"${name}" is not used in style blocks`,
        }],
      },
    },
    {
      files: ['**/*.vue', '**/*.module.{css,scss}'],
      rules: {
        // CSS modules: a single camelCase class per selector, modifiers win by order.
        'selector-class-pattern': [CAMEL_CASE_CLASS, { resolveNestedSelectors: true }],
        'selector-max-class': 1,
        // Nesting doesn't count towards the limits above, so only pseudo-classes and pseudo-elements nest.
        'selector-nested-pattern': [/^&(::?[a-z-]+(\(.*\))?)+$/, {
          message: selector => `Expected a single class, nest only pseudo-classes and pseudo-elements: "${selector}"`,
        }],
      },
    },
    {
      // Defines the mixins and variables that the rules above point to.
      files: ['layers/styles/**'],
      rules: {
        'media-feature-name-disallowed-list': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
    {
      files: ['app/assets/tailwind.css'],
      rules: {
        // `@custom-variant` bodies nest `&` under the variant, not under a rule.
        'nesting-selector-no-missing-scoping-root': null,
        // The `dark` and `light` variants are the Tailwind counterparts of the `theme` mixins.
        'media-feature-name-disallowed-list': null,
      },
    },
  ],
};
