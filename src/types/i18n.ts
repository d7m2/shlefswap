
export type Locale = 'en' ;

// Allow nested translations
export type TranslationValue = string | { [key: string]: TranslationValue };
export type Translations = { [key: string]: TranslationValue };
