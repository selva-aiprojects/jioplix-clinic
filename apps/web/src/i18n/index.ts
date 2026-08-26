import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import hi from './locales/hi.json'
import ta from './locales/ta.json'
import te from './locales/te.json'
import kn from './locales/kn.json'
import mr from './locales/mr.json'
import bn from './locales/bn.json'
import gu from './locales/gu.json'
import ml from './locales/ml.json'
import or from './locales/or.json'
import pa from './locales/pa.json'
import as from './locales/as.json'
import ur from './locales/ur.json'
import ne from './locales/ne.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      mr: { translation: mr },
      bn: { translation: bn },
      gu: { translation: gu },
      ml: { translation: ml },
      or: { translation: or },
      pa: { translation: pa },
      as: { translation: as },
      ur: { translation: ur },
      ne: { translation: ne },
    },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
