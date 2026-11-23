import { Fragment } from 'react';

// A Vietnamese letter that English does not have: a vowel with a tone or a hat, đ, ơ, ư.
const VI = /[À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/;

/**
 * A name that mixes Vietnamese words into another language (the products' names: "Nối Bag", "Nếp Keychain"):
 * each run of Vietnamese words is marked lang="vi", the rest takes the page's language, so a screen reader
 * voices "Nối" in Vietnamese and "Bag" in English. On a Vietnamese page the page's own lang covers all of it.
 * A word counts as Vietnamese when it has a letter English does not; a plain-letter Vietnamese word next to
 * one (as in "Chie Dù") joins its run only when it stands between two such words.
 */
export function ViWords({ text }: { text: string }) {
  const words = text.split(' ');
  const vi = words.map((w) => VI.test(w));
  // a plain word between two Vietnamese words is Vietnamese too
  const isVi = vi.map((v, i) => v || (i > 0 && i < words.length - 1 && vi[i - 1] && vi[i + 1]));
  const runs: { vi: boolean; text: string }[] = [];
  words.forEach((w, i) => {
    const last = runs[runs.length - 1];
    if (last && last.vi === isVi[i]) last.text += ` ${w}`;
    else runs.push({ vi: isVi[i], text: w });
  });
  return runs.map((run, i) => (
    <Fragment key={i}>
      {i > 0 && ' '}
      {run.vi ? <span lang="vi">{run.text}</span> : run.text}
    </Fragment>
  ));
}
