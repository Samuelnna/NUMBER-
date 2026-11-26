import { useEffect, useMemo, useState } from 'react';
import './arithmetic.css';
import './voice.css';

const AVATARS = ['🦊', '🐼', '🐸', '🦋', '🐻', '🐰'];
const MODES = [
  { id: 'count', title: 'Count & find', description: 'Count the friendly things, then pick the number.', icon: '🍓', tint: 'peach', skill: 'Counting' },
  { id: 'compare', title: 'Which has more?', description: 'Look carefully. Which group has more?', icon: '🍋', tint: 'yellow', skill: 'Comparing' },
  { id: 'sequence', title: 'Number trail', description: 'Help the numbers find their place in line.', icon: '🪁', tint: 'blue', skill: 'Number order' },
  { id: 'addition', title: 'Addition', description: 'Put little groups together and add them up.', icon: '➕', tint: 'peach', skill: 'Adding' },
  { id: 'subtraction', title: 'Subtraction', description: 'Take some away and find what is left.', icon: '➖', tint: 'blue', skill: 'Taking away' },
  { id: 'multiplication', title: 'Multiplication', description: 'Make equal groups and count them all.', icon: '✖️', tint: 'yellow', skill: 'Equal groups' },
  { id: 'division', title: 'Division', description: 'Share things equally between groups.', icon: '➗', tint: 'peach', skill: 'Sharing equally' },
];
const STORAGE_KEY = 'numbers-game-v1';
const readSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { profiles: [], activeId: null }; }
  catch { return { profiles: [], activeId: null }; }
};

function speakMath(text) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => /^en(-|_)/i.test(voice.lang) && /Samantha|Google.*English|Natural/i.test(voice.name))
    || voices.find((voice) => /^en(-|_)/i.test(voice.lang))
    || null;
  window.speechSynthesis.speak(utterance);
  return true;
}

function App() {
  const [saved, setSaved] = useState(readSaved);
  const [screen, setScreen] = useState(saved.profiles.length ? 'home' : 'profiles');
  const [profileForm, setProfileForm] = useState({ name: '', age: '7', avatar: AVATARS[0] });
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState('count');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [spoken, setSpoken] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const active = saved.profiles.find((profile) => profile.id === saved.activeId) || saved.profiles[0] || null;

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }, [saved]);
  useEffect(() => {
    if (!spoken || screen !== 'play') {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return undefined;
    }
    const timer = window.setTimeout(() => speakMath(question.prompt), 350);
    return () => window.clearTimeout(timer);
  }, [screen, round, spoken, question.prompt]);

  const question = useMemo(() => makeQuestion(mode, active?.age || 7, round), [mode, active?.age, round]);

  function saveProfile(event) {
    event.preventDefault();
    const name = profileForm.name.trim();
    if (!name) return;
    if (editingId) {
      setSaved((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === editingId ? { ...item, name, age: Number(profileForm.age), avatar: profileForm.avatar } : item) }));
      setEditingId(null);
    } else {
      const created = { id: crypto.randomUUID(), name, age: Number(profileForm.age), avatar: profileForm.avatar, games: 0, stars: 0, bestScore: 0 };
      setSaved((current) => ({ ...current, profiles: [...current.profiles, created], activeId: created.id }));
    }
    setProfileForm({ name: '', age: '7', avatar: AVATARS[0] });
    setScreen('home');
  }

  function chooseProfile(id) {
    setSaved((current) => ({ ...current, activeId: id }));
    setScreen('home');
  }

  function startGame(nextMode) {
    setMode(nextMode);
    setRound(0);
    setScore(0);
    setSelected(null);
    setScreen('play');
  }

  function answer(value) {
    if (selected !== null) return;
    setSelected(value);
    const correct = value === question.answer;
    if (correct) {
      setScore((current) => current + 1);
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 700);
    }
    if (spoken) speakMath(correct ? 'That is right! Great thinking!' : `Good try. The answer is ${question.answer}. Let’s try another one.`);
  }

  function nextQuestion() {
    if (round >= 4) {
      setSaved((current) => ({ ...current, profiles: current.profiles.map((item) => item.id === active?.id ? { ...item, games: item.games + 1, stars: item.stars + score, bestScore: Math.max(item.bestScore, score) } : item) }));
      setScreen('complete');
    } else {
      setRound((current) => current + 1);
      setSelected(null);
    }
  }

  function editProfile(profile) {
    setEditingId(profile.id);
    setProfileForm({ name: profile.name, age: String(profile.age), avatar: profile.avatar });
    setScreen('profiles');
  }

  const sayPrompt = () => speakMath(question.prompt);

  if (screen === 'profiles') return <ProfileScreen profiles={saved.profiles} form={profileForm} setForm={setProfileForm} onSave={saveProfile} onChoose={chooseProfile} onEdit={editProfile} editingId={editingId} onCancel={() => { setEditingId(null); setScreen('home'); }} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('home')} aria-label="Numbers home"><span className="brand-mark">N<span>.</span></span><span className="brand-name">numbers</span></button>
        <div className="topbar-right">
          <button className={`sound-toggle ${spoken ? 'is-on' : ''}`} onClick={() => setSpoken(!spoken)} aria-pressed={spoken} title="Toggle spoken maths"><span aria-hidden="true">{spoken ? '🔊' : '🔈'}</span><span className="sound-label">Auto-read maths</span></button>
          {active && <button className="profile-chip" onClick={() => setScreen('profiles')} aria-label={`Switch profile. Current profile: ${active.name}`}><span className="profile-avatar-small">{active.avatar}</span><span>{active.name}</span><span className="chevron">⌄</span></button>}
        </div>
      </header>

      {screen === 'home' && active && <main className="home-view">
        <section className="welcome-row">
          <div><p className="eyebrow">A LITTLE PRACTICE, A LOT OF PROGRESS</p><h1>Hi {active.name}! <span className="wave">✦</span></h1><p className="welcome-copy">Ready to play with numbers? Let’s take it one little step at a time.</p></div>
          <div className="welcome-doodle" aria-hidden="true"><span>✿</span><span className="doodle-number">1<br/>2<br/>3</span></div>
        </section>
        <section className="progress-card" aria-label="Your learning progress">
          <div className="progress-intro"><span className="progress-icon">🌱</span><div><h2>Your number garden</h2><p>Every game helps you grow!</p></div></div>
          <div className="stat"><strong>{active.games}</strong><span>games played</span></div>
          <div className="stat"><strong>{active.stars} <span className="star-small">★</span></strong><span>stars earned</span></div>
          <div className="progress-art" aria-hidden="true"><span>🌷</span><span>🌼</span><span>🌱</span></div>
        </section>
        <div className="section-heading"><div><p className="eyebrow">PICK YOUR PLAY</p><h2>What shall we explore?</h2></div><span className="gentle-note">No rush — go at your own pace <span>♡</span></span></div>
        <section className="game-grid" aria-label="Choose a game">
          {MODES.map((item, index) => <button key={item.id} className={`game-card ${item.tint}`} onClick={() => startGame(item.id)}>
            <span className="card-number">{String(index + 1).padStart(2, '0')}</span><span className="game-emoji" aria-hidden="true">{item.icon}</span><span className="game-card-text"><strong>{item.title}</strong><span>{item.description}</span></span><span className="skill-pill">{item.skill}</span><span className="card-arrow" aria-hidden="true">↗</span>
          </button>)}
        </section>
        <footer className="home-footer"><span>Made for curious minds, just like yours.</span><span className="footer-sun" aria-hidden="true">☼</span></footer>
      </main>}

      {screen === 'play' && <main className="play-view">
        <div className="play-top"><button className="back-button" onClick={() => setScreen('home')}><span aria-hidden="true">←</span> Back to games</button><span className="round-label">ROUND {round + 1} <span>OF 5</span></span><button className="listen-button" onClick={sayPrompt} aria-label="Hear the maths question">🔊 <span>Hear the maths</span></button></div>
        <div className="round-track" aria-label={`Round ${round + 1} of 5`}><span style={{ width: `${((round + 1) / 5) * 100}%` }} /></div>
        <section className="question-card">
          <p className="eyebrow">{MODES.find((item) => item.id === mode)?.skill.toUpperCase()}</p><h1>{question.prompt}</h1>
          <div className={`question-visual ${celebrate ? 'celebrate' : ''}`}>
            {mode === 'count' && <div className="fruit-grid" aria-label={`${question.answer} strawberries`}>{Array.from({ length: question.answer }, (_, index) => <span key={index} aria-hidden="true">🍓</span>)}</div>}
            {mode === 'compare' && <div className="compare-visual"><div className="fruit-group" aria-label={`${question.left} apples`}><span className="group-label">A</span><div>{Array.from({ length: question.left }, (_, index) => <span key={index} aria-hidden="true">🍎</span>)}</div></div><span className="vs">OR</span><div className="fruit-group" aria-label={`${question.right} bananas`}><span className="group-label">B</span><div>{Array.from({ length: question.right }, (_, index) => <span key={index} aria-hidden="true">🍌</span>)}</div></div></div>}
            {mode === 'sequence' && <div className="number-line" aria-label="Number sequence with one missing number">{question.sequence.map((number, index) => <span key={index} className={`number-cell ${number === null ? 'missing' : ''}`}>{number ?? '?'}</span>)}</div>}
            {question.equation && <div className="equation-visual" aria-label={`${question.left} ${question.operator} ${question.right}`}><span>{question.left}</span><span className="equation-operator">{question.operator}</span><span>{question.right}</span><span className="equation-equals">=</span><span className="equation-blank">?</span></div>}
          </div>
          {selected === null ? <p className="choose-hint">Tap the answer that feels right</p> : <p className={`answer-feedback ${selected === question.answer ? 'correct' : 'try-again'}`} role="status">{selected === question.answer ? ['Lovely counting!', 'You did it!', 'Brilliant thinking!', 'That’s the one!', 'Look at you go!'][round] : 'Good try! The right answer is highlighted.'}</p>}
          <div className="answer-options">{question.options.map((option) => <button key={option} disabled={selected !== null} onClick={() => answer(option)} className={`answer-button ${selected === option ? (option === question.answer ? 'answer-correct' : 'answer-wrong') : selected !== null && option === question.answer ? 'answer-reveal' : ''}`} aria-label={`Answer ${option}`}>{option}</button>)}</div>
          {selected !== null && <button className="next-button" onClick={nextQuestion}>{round === 4 ? 'Finish game' : 'Next question'} <span aria-hidden="true">→</span></button>}
        </section>
        <p className="play-encouragement">✨ You’re doing wonderfully, {active?.name}.</p>
      </main>}

      {screen === 'complete' && <main className="complete-view"><div className="confetti" aria-hidden="true">✦　✿　✧　✦</div><div className="complete-badge">🌟</div><p className="eyebrow">GAME COMPLETE</p><h1>You did it, {active?.name}!</h1><p className="complete-copy">You showed up, tried your best, and that’s what makes you a number star.</p><div className="score-card"><span>⭐</span><div><strong>{score} out of 5</strong><small>answers found</small></div><span>🌱</span></div><p className="score-note">{score >= 4 ? 'Wonderful work — your number garden is blooming!' : 'Every try helps your brain grow. Ready for another go?'}</p><div className="complete-actions"><button className="next-button" onClick={() => startGame(mode)}>Play again <span>↻</span></button><button className="quiet-button" onClick={() => setScreen('home')}>Choose another game</button></div></main>}
    </div>
  );
}

function ProfileScreen({ profiles, form, setForm, onSave, onChoose, onEdit, editingId, onCancel }) {
  return <main className="profile-page"><header className="profile-brand"><span className="brand-mark">N<span>.</span></span><span className="brand-name">numbers</span></header><div className="profile-layout">
    <section className="profile-welcome"><div className="profile-illustration" aria-hidden="true"><span className="big-number">1</span><span className="bubble bubble-one">2</span><span className="bubble bubble-two">3</span><span className="tiny-star">✦</span><span className="tiny-flower">✿</span></div><p className="eyebrow">A HAPPY PLACE TO LEARN</p><h1>Numbers make<br/>wonderful things.</h1><p>Make a little profile so your games and progress are saved just for you.</p><span className="privacy-note"><span>🔒</span> Your profile stays on this device.</span></section>
    <section className="profile-panel">
      {profiles.length > 0 && !editingId && <div className="existing-profiles"><p className="eyebrow">WHO’S PLAYING TODAY?</p>{profiles.map((profile) => <div className="existing-profile" key={profile.id}><button className="existing-profile-main" onClick={() => onChoose(profile.id)}><span className="profile-avatar-large">{profile.avatar}</span><span><strong>{profile.name}</strong><small>Level {profile.age - 4} · {profile.stars} stars</small></span><span className="profile-arrow">→</span></button><button className="edit-profile" aria-label={`Edit ${profile.name}'s profile`} onClick={() => onEdit(profile)}>✎</button></div>)}<div className="or-divider"><span>OR MAKE A NEW PROFILE</span></div></div>}
      <p className="eyebrow">{editingId ? 'UPDATE YOUR DETAILS' : 'LET’S GET STARTED'}</p><h2>{editingId ? 'Edit profile' : 'Create your profile'}</h2><p className="form-intro">A grown-up can help you with this bit.</p>
      <form onSubmit={onSave}>
        <label className="field-label" htmlFor="child-name">Your first name</label><input id="child-name" type="text" placeholder="What should we call you?" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={20} autoComplete="given-name" required />
        <label className="field-label" htmlFor="child-age">How old are you?</label><select id="child-age" value={form.age} onChange={(event) => setForm({ ...form, age: event.target.value })}>{Array.from({ length: 10 }, (_, index) => index + 4).map((age) => <option key={age} value={age}>{age} years old</option>)}</select>
        <span className="field-label avatar-label">Pick your little buddy</span><div className="avatar-picker" role="radiogroup" aria-label="Choose an avatar">{AVATARS.map((avatar) => <button type="button" key={avatar} role="radio" aria-checked={form.avatar === avatar} aria-label={`Choose ${avatar} avatar`} className={form.avatar === avatar ? 'avatar-choice chosen' : 'avatar-choice'} onClick={() => setForm({ ...form, avatar })}>{avatar}</button>)}</div>
        <button className="create-button" type="submit">{editingId ? 'Save my profile' : 'Let’s play!'} <span>→</span></button>{editingId && <button className="cancel-button" type="button" onClick={onCancel}>Cancel</button>}
      </form>
    </section>
  </div><footer className="profile-footer">A gentle little game for growing number confidence <span>♡</span></footer></main>;
}

function makeQuestion(mode, age, round) {
  const max = age <= 6 ? 5 : age <= 8 ? 8 : 10;
  if (mode === 'count') {
    const answer = 2 + ((round * 3 + age) % (max - 1));
    return { prompt: 'How many strawberries can you count?', answer, options: makeOptions(answer, max) };
  }
  if (mode === 'compare') {
    const left = 2 + ((round + age) % Math.max(2, max - 2));
    const right = left + (round % 2 === 0 ? 1 : -1);
    const answer = left > right ? 1 : 2;
    return { prompt: 'Which group has more?', left, right, answer, options: [1, 2] };
  }
  if (mode === 'sequence') {
    const start = 1 + ((round * 2 + age) % Math.max(2, max - 2));
    const missingAt = round % 3;
    const sequence = [start, start + 1, start + 2].map((number, index) => index === missingAt ? null : number);
    const answer = start + missingAt;
    return { prompt: 'Which number belongs in the empty space?', sequence, answer, options: makeOptions(answer, max) };
  }
  return makeArithmeticQuestion(mode, max, round);
}

function makeArithmeticQuestion(mode, max, round) {
  const config = {
    addition: { operator: '+', words: 'plus' },
    subtraction: { operator: '−', words: 'take away' },
    multiplication: { operator: '×', words: 'times' },
    division: { operator: '÷', words: 'divided by' },
  }[mode];
  let left; let right; let answer;
  if (mode === 'addition') {
    left = 1 + ((round * 2) % Math.max(2, max - 1));
    right = 1 + ((round + 1) % Math.max(2, max - left));
    if (left + right > max) right = Math.max(1, max - left);
    answer = left + right;
  } else if (mode === 'subtraction') {
    right = 1 + (round % Math.max(2, max - 1));
    left = right + 1 + (round % Math.max(1, max - right));
    if (left > max) left = max;
    right = Math.min(right, left - 1);
    answer = left - right;
  } else if (mode === 'multiplication') {
    const pairs = [];
    for (let a = 2; a <= Math.sqrt(max); a += 1) for (let b = 2; b <= Math.floor(max / a); b += 1) pairs.push([a, b]);
    const [a, b] = pairs[round % pairs.length] || [2, 2];
    left = a; right = b; answer = a * b;
  } else {
    const pairs = [];
    for (let divisor = 2; divisor <= Math.floor(Math.sqrt(max)); divisor += 1) {
      for (let quotient = 2; quotient <= Math.floor(max / divisor); quotient += 1) pairs.push([divisor * quotient, divisor, quotient]);
    }
    const [dividend, divisor, quotient] = pairs[round % pairs.length] || [4, 2, 2];
    left = dividend; right = divisor; answer = quotient;
  }
  return { prompt: `What is ${left} ${config.words} ${right}?`, left, right, operator: config.operator, answer, equation: true, options: makeOptions(answer, max) };
}

function makeOptions(answer, max) {
  const options = new Set([answer]);
  if (answer > 1) options.add(answer - 1);
  if (answer < max) options.add(answer + 1);
  let offset = 2;
  while (options.size < 3) { options.add(answer + offset <= max ? answer + offset : Math.max(1, answer - offset)); offset += 1; }
  return [...options].sort(() => Math.random() - 0.5);
}

export default App;
