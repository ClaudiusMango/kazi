import { describe, expect, it } from 'vitest';
import { checkBriefForDangerSigns, checkDangerSigns, normalise } from './interceptor';
import type { NurseBrief } from './types';

const red = (s: string) => expect(checkDangerSigns(s).category, s).toBe('red');
const amber = (s: string) => expect(checkDangerSigns(s).category, s).toBe('amber');
const clear = (s: string) => expect(checkDangerSigns(s).category, s).toBe(null);

describe('normalise', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalise('  CHEST   PAIN!!!  ')).toBe('chest pain');
  });

  it('strips apostrophes so "can\'t" reads as "cant"', () => {
    expect(normalise("I can't breathe")).toBe('i cant breathe');
    expect(normalise('I can’t breathe')).toBe('i cant breathe');
  });

  it('strips diacritics', () => {
    expect(normalise('chèst páin')).toBe('chest pain');
  });
});

describe('red flags — spec acceptance', () => {
  it('catches the canonical cases', () => {
    red('I have chest pain');
    red('CHEST PAIN!!!');
    clear('I have a headache');
  });
});

describe('red flags — phrasings a fixed term list misses', () => {
  it('catches chest complaints not phrased as "chest pain"', () => {
    red('my chest hurts');
    red('pain in my chest');
    red('my chest feels tight');
    red('there is pressure in my chest');
  });

  it('catches breathing complaints in patient phrasing', () => {
    red('short of breath');
    red('it is hard to breathe');
    red("I can't breathe properly");
    red('my child is breathing fast');
  });

  it('catches bleeding described conversationally', () => {
    red('blood in my stool');
    red('I coughed up blood');
    red('I threw up blood this morning');
  });

  it('catches neurological signs with natural word order', () => {
    red('numbness on one side');
    red('worst headache of my life');
    red('my left arm is weak');
  });

  it('catches consciousness and obstetric signs', () => {
    red('I blacked out');
    red('I fainted at work');
    red("I'm 7 months pregnant and I'm bleeding");
  });

  it('catches paediatric and sepsis signs', () => {
    red("my baby won't feed");
    red('my child is not waking up');
    red('stiff neck and fever');
  });
});

describe('false positives that must NOT fire', () => {
  it('does not treat a burning sensation as a burn injury', () => {
    clear('burning when I pass urine');
    clear('I have heartburn since Tuesday');
    clear('burning feeling in my throat');
  });

  it('does not treat accidental injury as self-harm', () => {
    clear('I hurt myself falling off a boda');
    clear('I hurt myself at work yesterday');
  });

  it('does not fire on routine clinical vocabulary', () => {
    clear('my blood pressure is high');
    clear('I came for a blood test');
    clear('I found the lump by accident');
    clear('my baby is feeding well');
    clear('I have a chest infection');
  });
});

describe('amber — self-harm', () => {
  it('catches intent-marked disclosures', () => {
    amber('I want to die');
    amber('I have been thinking about hurting myself');
    amber('sometimes I feel suicidal');
    amber('there is nothing to live for');
  });

  it('is reached only when red does not apply first', () => {
    expect(checkDangerSigns('I want to die').category).toBe('amber');
  });
});

describe('checkpoint 3 — scanning the returned brief', () => {
  const emptyBrief = (): NurseBrief => ({
    chief_complaint: [],
    onset_duration: [],
    context_exposures: [],
    patient_concerns: [],
    not_asked_about: [],
  });

  it('catches a danger sign in a standardised term', () => {
    const brief = emptyBrief();
    brief.chief_complaint = [
      { verbatim: 'my heart is going fast', standardised: 'palpitations', confidence: 'clear' },
    ];
    expect(checkBriefForDangerSigns(brief).category).toBe('red');
  });

  it('catches a danger sign in verbatim when standardised is null (sijui)', () => {
    const brief = emptyBrief();
    brief.chief_complaint = [
      { verbatim: 'my chest is squeezing me', standardised: null, confidence: 'sijui' },
    ];
    expect(checkBriefForDangerSigns(brief).category).toBe('red');
  });

  it('returns no match on a clean brief', () => {
    const brief = emptyBrief();
    brief.chief_complaint = [
      { verbatim: 'my head has been aching', standardised: 'headache', confidence: 'clear' },
    ];
    expect(checkBriefForDangerSigns(brief).triggered).toBe(false);
  });
});

describe('purity', () => {
  it('has no network dependency and is deterministic', () => {
    const a = checkDangerSigns('my chest hurts');
    const b = checkDangerSigns('my chest hurts');
    expect(a).toEqual(b);
  });
});
