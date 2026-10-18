// ESLint: hanya aturan yang menangkap bug nyata. `npm run lint` (juga di CI).
//  - rules-of-hooks (error): hook dipanggil bersyarat / setelah return -> crash React
//  - exhaustive-deps (peringatan): dependensi useEffect/useMemo tidak lengkap -> data basi,
//    timer ter-reset, dsb. Ditinjau satu per satu; tidak semua peringatan berarti bug.
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'public/**', 'src-launcher/**', 'electron/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
