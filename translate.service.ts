import { firestore } from './worker';

export const translateQuote = async (quote: string, locales: Array<string>): Promise<{ [key: string]: string }> => {
  // TODO replace Google translate api stub, with actual Google translate SDK
  const { data: { translations: [ translation ] } } = await Promise.resolve({
    'data': {
      'translations': [ {
        'detectedSourceLanguage': 'en', 'translatedText': 'Dis bonjour à mon petit ami.'
      } ]
    }
  });
  if (!translation) {
    return {};
  }
  return { FR: translation.translatedText };
};

export const saveQuoteTranslations = async (quoteId, movieId, translations: { [key: string]: string }) => {
  return Promise.all(Object.entries(translations).map(([ locale, text ]) =>
    firestore.collection(`movies/${ movieId }/quotes/${ quoteId }/translations`)
      .doc(locale)
      .create({ text })
  ));
};

export const handleQuoteTranslate = async (data: Buffer) => {
  const { quote, quoteId, movieId } = JSON.parse(data.toString('utf-8'));
  const translations                = await translateQuote(quote, [ 'FR' ]);
  await saveQuoteTranslations(quoteId, movieId, translations);
};
