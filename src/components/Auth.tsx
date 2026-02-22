import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatedBackground as AnimatedBg } from './AnimatedBackground';

interface AuthProps {
  onLogin: (email: string, password: string) => Promise<string | null>;
  onRegister: (data: { email: string; password: string; username: string; displayName: string; avatarUrl?: string }) => Promise<string | null>;
  onActivateSession: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  type?: 'text' | 'sticker' | 'buttons' | 'avatar-picker' | 'profile-card' | 'game-guess' | 'game-reaction' | 'game-emoji-memory';
  buttons?: { label: string; action: string }[];
  avatars?: string[];
  profileData?: { name: string; username: string; avatarUrl: string };
  gameData?: GameData;
}

interface GameData {
  state: string;
  label?: string;
  emojis?: string[];
  options?: string[];
  selected?: string[];
}

type Step =
  | 'welcome'
  | 'choose-action'
  | 'reg-name'
  | 'reg-username'
  | 'reg-email'
  | 'reg-password'
  | 'reg-confirm-password'
  | 'reg-avatar'
  | 'reg-done'
  | 'login-email'
  | 'login-password'
  | 'login-done'
  | 'game-choose'
  | 'game-guess-playing'
  | 'game-reaction-waiting'
  | 'game-reaction-ready'
  | 'game-emoji-memory'
  | 'game-emoji-recall'
  | 'game-done';

const funFacts = [
  'Первый твит в истории был "just setting up my twttr" 🐦',
  'Каждую минуту загружается 500 часов видео на YouTube 📹',
  'Слово "emoji" с японского — "картинка" + "символ" 🎌',
  'В Instagram первое фото — собака основателя 🐕',
  'Среднестатистический человек проверяет телефон 96 раз в день 📱',
  '71% пользователей засыпают с телефоном в руках 😴',
];

const nameReactions = [
  'Красивое имя! Звучит как имя главного героя 🦸',
  'Ого, мне уже нравится! 🔥',
  'Приятно познакомиться! ✨',
  'Классное имя, запомню навсегда 🧠',
  'О, у меня был друг с таким именем... шучу, я же бот 🤖',
];

const usernameReactions = [
  'Отличный выбор! 10 из 10 за стиль 💯',
  'Уже бронирую это имя 🏷️',
  'Звучит круто, мне нравится ✨',
  'Это имя будет на слуху! 📢',
  'Лучший юзернейм что я видел сегодня 🏆',
];

const errorReactions = [
  'Упс! Попробуем ещё раз 🙈',
  'Почти! Но не совсем 🎯',
  'Не-не-не, давай по-другому 😅',
  'Ой. Давай ещё разок 🔄',
];

const avatarSeeds = [
  'Felix', 'Aneka', 'Milo', 'Luna', 'Oscar', 'Zara',
  'Buster', 'Cleo', 'Duke', 'Ivy', 'Rex', 'Nova',
];

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function Auth({ onLogin, onRegister, onActivateSession }: AuthProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>('welcome');
  const [isTyping, setIsTyping] = useState(false);
  const [regData, setRegData] = useState({ name: '', username: '', email: '', password: '', avatarUrl: '' });
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showConfetti, setShowConfetti] = useState(false);
  const [regProgress, setRegProgress] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);

  // Game states
  const [guessTarget, setGuessTarget] = useState(0);
  const [guessAttempts, setGuessAttempts] = useState(0);
  const [guessMax] = useState(3);
  const [reactionStartTime, setReactionStartTime] = useState(0);
  const [emojiSequence, setEmojiSequence] = useState<string[]>([]);
  const [emojiCorrectIndex, setEmojiCorrectIndex] = useState(0);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  const addMessage = useCallback((msg: Omit<Message, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() + Math.random(), timestamp: new Date() }]);
    scrollToBottom();
  }, [scrollToBottom]);

  const botSay = useCallback((text: string, type: Message['type'] = 'text', extra: Partial<Message> = {}) => {
    return new Promise<void>(resolve => {
      setIsTyping(true);
      setInputDisabled(true);
      const delay = Math.min(text.length * 20 + 400, 1800);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({ text, sender: 'bot', type, ...extra });
        resolve();
      }, delay);
    });
  }, [addMessage]);

  const botSayQuick = useCallback((text: string, type: Message['type'] = 'text', extra: Partial<Message> = {}) => {
    return new Promise<void>(resolve => {
      setIsTyping(true);
      setInputDisabled(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({ text, sender: 'bot', type, ...extra });
        resolve();
      }, 500);
    });
  }, [addMessage]);

  const enableInput = useCallback(() => {
    setInputDisabled(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Welcome
  useEffect(() => {
    const init = async () => {
      await botSay('Привет! 👋 Я бот «и как»');
      await botSay(`Кстати, факт дня: ${rand(funFacts)}`);
      await botSay('Что будем делать?', 'buttons', {
        buttons: [
          { label: '📝 Зарегистрироваться', action: 'register' },
          { label: '🔑 Войти', action: 'login' },
        ],
      });
      setStep('choose-action');
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleButtonAction = async (action: string) => {
    if (action === 'register') {
      addMessage({ text: '📝 Зарегистрироваться', sender: 'user' });
      setRegProgress(1);
      await botSay('Отлично! Давай создадим тебе аккаунт 🚀');
      await botSay('Как тебя зовут?');
      setStep('reg-name');
      enableInput();
    } else if (action === 'login') {
      addMessage({ text: '🔑 Войти', sender: 'user' });
      await botSay('С возвращением! 🤗');
      await botSay('Введи свой email:');
      setStep('login-email');
      enableInput();
    } else if (action === 'play-game') {
      addMessage({ text: '🎮 Давай сыграем!', sender: 'user' });
      await botSay('Выбирай игру! 🕹️', 'buttons', {
        buttons: [
          { label: '🔢 Угадай число', action: 'game-guess' },
          { label: '⚡ Реакция', action: 'game-reaction' },
          { label: '🧠 Запомни эмодзи', action: 'game-emoji' },
          { label: '⏭️ Пропустить', action: 'skip-game' },
        ],
      });
      setStep('game-choose');
    } else if (action === 'game-guess') {
      addMessage({ text: '🔢 Угадай число', sender: 'user' });
      startGuessGame();
    } else if (action === 'game-reaction') {
      addMessage({ text: '⚡ Реакция', sender: 'user' });
      startReactionGame();
    } else if (action === 'game-emoji') {
      addMessage({ text: '🧠 Запомни эмодзи', sender: 'user' });
      startEmojiGame();
    } else if (action === 'skip-game') {
      addMessage({ text: '⏭️ Пропустить', sender: 'user' });
      await finishRegistration();
    } else if (action === 'play-again') {
      addMessage({ text: '🔄 Ещё раз!', sender: 'user' });
      await botSay('Выбирай! 🕹️', 'buttons', {
        buttons: [
          { label: '🔢 Угадай число', action: 'game-guess' },
          { label: '⚡ Реакция', action: 'game-reaction' },
          { label: '🧠 Запомни эмодзи', action: 'game-emoji' },
          { label: '✅ Хватит, поехали!', action: 'skip-game' },
        ],
      });
      setStep('game-choose');
    } else if (action === 'finish-game') {
      addMessage({ text: '✅ Поехали!', sender: 'user' });
      await finishRegistration();
    } else if (action === 'retry-login') {
      addMessage({ text: '🔄 Попробовать снова', sender: 'user' });
      setLoginData({ email: '', password: '' });
      await botSay('Давай ещё раз. Введи email:');
      setStep('login-email');
      enableInput();
    } else if (action === 'go-register') {
      addMessage({ text: '📝 Зарегистрироваться', sender: 'user' });
      setRegProgress(1);
      await botSay('Давай создадим аккаунт! 🚀');
      await botSay('Как тебя зовут?');
      setStep('reg-name');
      enableInput();
    } else if (action === 'login-after-confirm') {
      addMessage({ text: '✅ Я подтвердил!', sender: 'user' });
      await botSay('Пробую войти... ⏳');
      const error = await onLogin(regData.email, regData.password);
      if (!error) {
        setShowConfetti(true);
        await botSay('Отлично! Вход выполнен! 🎉');
        await botSay('Перехожу в ленту...');
        setStep('login-done');
        setTimeout(() => {
          onActivateSession();
        }, 1500);
      } else {
        await botSay(`Не получилось: ${error}`, 'buttons', {
          buttons: [
            { label: '🔄 Попробовать ещё', action: 'login-after-confirm' },
            { label: '🔑 Войти вручную', action: 'login' },
          ],
        });
      }
    }
  };

  // ========== GAME 1: GUESS NUMBER ==========
  const startGuessGame = async () => {
    const target = Math.floor(Math.random() * 10) + 1;
    setGuessTarget(target);
    setGuessAttempts(0);
    await botSay('🔢 Я загадал число от 1 до 10!');
    await botSay('У тебя 3 попытки. Пиши число!');
    setStep('game-guess-playing');
    enableInput();
  };

  const handleGuess = async (value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1 || num > 10) {
      await botSay('Это не число от 1 до 10 😅 Попробуй ещё');
      enableInput();
      return;
    }

    const attempt = guessAttempts + 1;
    setGuessAttempts(attempt);

    if (num === guessTarget) {
      await botSay('🎉🎉🎉');
      await botSay(`УГАДАЛ! Это было ${guessTarget}! С ${attempt}-й попытки!`);
      const score = guessMax - attempt + 1;
      await botSay(`Ты получаешь ${score === 3 ? '🏆 Гений!' : score === 2 ? '⭐ Отлично!' : '👍 Неплохо!'}`, 'buttons', {
        buttons: [
          { label: '🔄 Ещё раз!', action: 'play-again' },
          { label: '✅ Поехали!', action: 'finish-game' },
        ],
      });
      setStep('game-done');
    } else if (attempt >= guessMax) {
      await botSay(`Не угадал 😔 Это было ${guessTarget}`);
      await botSay('Но ты всё равно молодец! 💪', 'buttons', {
        buttons: [
          { label: '🔄 Ещё раз!', action: 'play-again' },
          { label: '✅ Поехали!', action: 'finish-game' },
        ],
      });
      setStep('game-done');
    } else {
      const hint = num > guessTarget ? '📉 Меньше!' : '📈 Больше!';
      const left = guessMax - attempt;
      await botSay(`${hint} Осталось ${left} ${left === 1 ? 'попытка' : 'попытки'}`);
      enableInput();
    }
  };

  // ========== GAME 2: REACTION ==========
  const startReactionGame = async () => {
    await botSay('⚡ Проверим твою реакцию!');
    await botSay('Когда кнопка станет 🟢 ЗЕЛЁНОЙ — нажми как можно быстрее!');
    await botSayQuick('Приготовься...');

    setStep('game-reaction-waiting');

    addMessage({
      text: '', sender: 'bot', type: 'game-reaction',
      gameData: { state: 'waiting', label: '🔴 Жди...' }
    });

    const delay = 2000 + Math.random() * 4000;
    reactionTimeoutRef.current = setTimeout(() => {
      setReactionStartTime(Date.now());
      setStep('game-reaction-ready');
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'game-reaction') {
            updated[i] = {
              ...updated[i],
              gameData: { state: 'ready', label: '🟢 ЖМИИ!' }
            };
            break;
          }
        }
        return updated;
      });
    }, delay);
  };

  const handleReactionClick = async (state: string) => {
    if (state === 'waiting') {
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'game-reaction') {
            updated[i] = {
              ...updated[i],
              gameData: { state: 'done', label: '❌ Рано!' }
            };
            break;
          }
        }
        return updated;
      });
      await botSay('Рано нажал! 😅 Нужно ждать зелёный!', 'buttons', {
        buttons: [
          { label: '🔄 Ещё раз!', action: 'play-again' },
          { label: '✅ Поехали!', action: 'finish-game' },
        ],
      });
      setStep('game-done');
      return;
    }

    const reactionTime = Date.now() - reactionStartTime;
    setMessages(prev => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].type === 'game-reaction') {
          updated[i] = {
            ...updated[i],
            gameData: { state: 'done', label: `⏱️ ${reactionTime}ms` }
          };
          break;
        }
      }
      return updated;
    });

    let result: string;
    if (reactionTime < 200) result = '🏆 НЕВЕРОЯТНО! Ты робот?! 🤖';
    else if (reactionTime < 300) result = '⚡ Молниеносно! Отличная реакция!';
    else if (reactionTime < 500) result = '👍 Хорошая реакция!';
    else result = '🐢 Ну... бывало и лучше 😄';

    await botSay(`${reactionTime}ms — ${result}`, 'buttons', {
      buttons: [
        { label: '🔄 Ещё раз!', action: 'play-again' },
        { label: '✅ Поехали!', action: 'finish-game' },
      ],
    });
    setStep('game-done');
  };

  // ========== GAME 3: EMOJI MEMORY ==========
  const startEmojiGame = async () => {
    const allEmoji = ['🍎', '🚀', '🎸', '🐶', '🌈', '⭐', '🎯', '🔥', '💎', '🌊', '🍕', '🎪', '🦋', '🍩', '🎲'];
    const shuffled = [...allEmoji].sort(() => Math.random() - 0.5);
    const sequence = shuffled.slice(0, 4);
    setEmojiSequence(sequence);
    setEmojiCorrectIndex(0);

    await botSay('🧠 Запомни последовательность эмодзи!');
    await botSay('У тебя 4 секунды...');

    addMessage({
      text: '', sender: 'bot', type: 'game-emoji-memory',
      gameData: { emojis: sequence, state: 'showing' }
    });
    setStep('game-emoji-memory');
    scrollToBottom();

    setTimeout(() => {
      const options = [...sequence];
      while (options.length < 8) {
        const e = rand(allEmoji);
        if (!options.includes(e)) options.push(e);
      }
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'game-emoji-memory') {
            updated[i] = {
              ...updated[i],
              gameData: { emojis: sequence.map(() => '❓'), state: 'hidden', options: shuffledOptions, selected: [] }
            };
            break;
          }
        }
        return updated;
      });
      setStep('game-emoji-recall');
      scrollToBottom();
    }, 4000);
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (step !== 'game-emoji-recall') return;

    const correctEmoji = emojiSequence[emojiCorrectIndex];
    if (emoji === correctEmoji) {
      const newIndex = emojiCorrectIndex + 1;
      setEmojiCorrectIndex(newIndex);

      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'game-emoji-memory') {
            const revealed = emojiSequence.map((e, idx) => idx < newIndex ? e : '❓');
            const selected = [...(updated[i].gameData?.selected || []), emoji];
            updated[i] = {
              ...updated[i],
              gameData: { ...updated[i].gameData!, emojis: revealed, selected }
            };
            break;
          }
        }
        return updated;
      });

      if (newIndex >= emojiSequence.length) {
        await botSay('🎉 Идеально! Ты запомнил все 4 эмодзи!');
        await botSay('У тебя отличная память! 🧠✨', 'buttons', {
          buttons: [
            { label: '🔄 Ещё раз!', action: 'play-again' },
            { label: '✅ Поехали!', action: 'finish-game' },
          ],
        });
        setStep('game-done');
      }
    } else {
      setMessages(prev => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].type === 'game-emoji-memory') {
            updated[i] = {
              ...updated[i],
              gameData: { ...updated[i].gameData!, emojis: emojiSequence, state: 'failed' }
            };
            break;
          }
        }
        return updated;
      });

      await botSay(`Ой, не то! Правильно было: ${emojiSequence.join(' ')}`);
      await botSay('Ничего, в следующий раз получится! 💪', 'buttons', {
        buttons: [
          { label: '🔄 Ещё раз!', action: 'play-again' },
          { label: '✅ Поехали!', action: 'finish-game' },
        ],
      });
      setStep('game-done');
    }
  };

  // ========== FINISH ==========
  const finishRegistration = async () => {
    await botSay('Создаю аккаунт... ⏳');

    const result = await onRegister({
      email: regData.email,
      password: regData.password,
      username: regData.username,
      displayName: regData.name,
      avatarUrl: regData.avatarUrl || undefined,
    });

    if (result === null) {
      setShowConfetti(true);
      await botSay('🎊 Аккаунт создан!');
      addMessage({
        text: '', sender: 'bot', type: 'profile-card',
        profileData: { name: regData.name, username: regData.username, avatarUrl: regData.avatarUrl }
      });
      scrollToBottom();
      await new Promise(r => setTimeout(r, 800));
      await botSay('Добро пожаловать в «и как»! 🚀');
      await botSay('Перехожу в ленту...');
      setStep('reg-done');

      // Ensure we're logged in, then activate session
      setTimeout(async () => {
        // Login to make sure session exists
        await onLogin(regData.email, regData.password);
        // Wait for Supabase session to settle
        await new Promise(r => setTimeout(r, 1000));
        // Activate — store will retry up to 15 times
        onActivateSession();
      }, 1500);
    } else if (result === 'EMAIL_CONFIRM_REQUIRED') {
      await botSay('📧 Почти готово!');
      await botSay('Supabase требует подтверждение email. Проверь почту и нажми ссылку подтверждения.');
      await botSay('После подтверждения нажми кнопку ниже 👇', 'buttons', {
        buttons: [
          { label: '✅ Я подтвердил, войти!', action: 'login-after-confirm' },
        ],
      });
    } else {
      await botSay(`Ошибка: ${result} 😔`, 'buttons', {
        buttons: [
          { label: '🔄 Попробовать снова', action: 'go-register' },
          { label: '🔑 Войти', action: 'login' },
        ],
      });
    }
  };

  // ========== MAIN INPUT HANDLER ==========
  const handleSend = async () => {
    const value = input.trim();
    if (!value || inputDisabled) return;

    const isPassword = step === 'reg-password' || step === 'reg-confirm-password' || step === 'login-password';
    addMessage({ text: isPassword ? '•'.repeat(value.length) : value, sender: 'user' });
    setInput('');
    setInputDisabled(true);

    switch (step) {
      case 'reg-name': {
        if (value.length < 2) {
          await botSay(rand(errorReactions) + ' Имя должно быть хотя бы 2 символа');
          enableInput();
          return;
        }
        setRegData(d => ({ ...d, name: value }));
        setRegProgress(2);
        await botSay(rand(nameReactions));
        await botSay('Придумай себе юзернейм (латиница, цифры, _):');
        setStep('reg-username');
        enableInput();
        break;
      }
      case 'reg-username': {
        if (value.length < 3 || !/^[a-zA-Z0-9_]+$/.test(value)) {
          await botSay(rand(errorReactions) + ' Минимум 3 символа, только латиница/цифры/_');
          enableInput();
          return;
        }
        setRegData(d => ({ ...d, username: value.toLowerCase() }));
        setRegProgress(3);
        await botSay(rand(usernameReactions));
        await botSay('Теперь email:');
        setStep('reg-email');
        enableInput();
        break;
      }
      case 'reg-email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          await botSay(rand(errorReactions) + ' Это не похоже на email 📧');
          enableInput();
          return;
        }
        setRegData(d => ({ ...d, email: value }));
        setRegProgress(4);
        await botSay('Супер! Придумай пароль (минимум 6 символов) 🔒');
        setStep('reg-password');
        enableInput();
        break;
      }
      case 'reg-password': {
        if (value.length < 6) {
          await botSay(rand(errorReactions) + ' Минимум 6 символов!');
          enableInput();
          return;
        }
        setRegData(d => ({ ...d, password: value }));
        const strength = value.length >= 12 ? '🔐 Мощный пароль! Хакеры плачут 😭' : value.length >= 8 ? '💪 Хороший пароль!' : '👌 Сойдёт, но можно длиннее';
        await botSay(strength);
        await botSay('Повтори пароль для подтверждения:');
        setStep('reg-confirm-password');
        setRegProgress(5);
        enableInput();
        break;
      }
      case 'reg-confirm-password': {
        if (value !== regData.password) {
          await botSay('Пароли не совпадают 😬 Попробуй ещё раз:');
          enableInput();
          return;
        }
        await botSay('Пароли совпадают ✅');
        await botSay('Выбери себе аватарку! 🎨', 'avatar-picker', {
          avatars: avatarSeeds.map(s => `https://api.dicebear.com/7.x/thumbs/svg?seed=${s}`),
        });
        setStep('reg-avatar');
        setRegProgress(6);
        break;
      }
      case 'login-email': {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          await botSay('Это не email 🤔 Попробуй ещё:');
          enableInput();
          return;
        }
        setLoginData(d => ({ ...d, email: value }));
        await botSay('Пароль:');
        setStep('login-password');
        enableInput();
        break;
      }
      case 'login-password': {
        await botSay('Проверяю... ⏳');
        const error = await onLogin(loginData.email, value);
        if (!error) {
          setShowConfetti(true);
          await botSay('Вход выполнен! С возвращением! 🎉');
          await botSay('Перехожу в ленту...');
          setStep('login-done');
          setTimeout(() => {
            onActivateSession();
          }, 1000);
        } else {
          await botSay(`${error} 😔`, 'buttons', {
            buttons: [
              { label: '🔄 Попробовать снова', action: 'retry-login' },
              { label: '📝 Зарегистрироваться', action: 'go-register' },
            ],
          });
        }
        break;
      }
      case 'game-guess-playing': {
        await handleGuess(value);
        break;
      }
    }
  };

  const handleAvatarSelect = async (url: string) => {
    if (step !== 'reg-avatar') return;
    setRegData(d => ({ ...d, avatarUrl: url }));
    addMessage({ text: '✅ Аватарка выбрана!', sender: 'user' });
    await botSay('Отличный выбор! 😎');
    await botSay('Перед тем как закончим — может сыграем? 🎮', 'buttons', {
      buttons: [
        { label: '🎮 Давай сыграем!', action: 'play-game' },
        { label: '⏭️ Пропустить', action: 'skip-game' },
      ],
    });
    setStep('game-choose');
  };

  const getPlaceholder = () => {
    switch (step) {
      case 'reg-name': return 'Введи своё имя...';
      case 'reg-username': return 'Придумай юзернейм...';
      case 'reg-email': return 'example@mail.com';
      case 'reg-password':
      case 'reg-confirm-password': return 'Введи пароль...';
      case 'login-email': return 'Введи email...';
      case 'login-password': return 'Введи пароль...';
      case 'game-guess-playing': return 'Число от 1 до 10...';
      default: return 'Сообщение...';
    }
  };

  const progressSteps = ['Имя', 'Ник', 'Email', 'Пароль', 'Подтв.', 'Аватар'];

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 noise">
      {/* Animated Background */}
      <AnimatedBg variant="auth" />

      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 7)],
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animation: `confettiFall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-[#0e0e12] rounded-3xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/50 flex flex-col" style={{ height: '85vh', maxHeight: '720px' }}>
          {/* Header */}
          <div className="bg-[#0a0a0e]/80 backdrop-blur-2xl px-5 py-4 border-b border-white/[0.04] flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">ик</div>
            <div className="flex-1">
              <div className="text-white font-semibold text-[13px]">и как — бот</div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                {isTyping ? (
                  <>
                    <span className="text-indigo-400">печатает</span>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    онлайн
                  </>
                )}
              </div>
            </div>

            {regProgress > 0 && regProgress <= 6 && (
              <div className="flex gap-1">
                {progressSteps.map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-6 h-1.5 rounded-full transition-all duration-500 ${
                        i + 1 <= regProgress ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-zinc-800'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-center py-2">
              <span className="text-[10px] text-zinc-600 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.04] font-medium">Сегодня</span>
            </div>

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-black mr-2 mt-1 shrink-0 shadow-md shadow-indigo-500/20">ик</div>
                )}

                <div className="max-w-[80%]">
                  {(msg.type === 'text' || !msg.type) && (
                    <div className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md shadow-lg shadow-indigo-500/15'
                        : 'bg-white/[0.04] text-zinc-200 rounded-bl-md border border-white/[0.04]'
                    }`}>
                      {msg.text}
                    </div>
                  )}

                  {msg.type === 'sticker' && (
                    <div className="text-6xl animate-pop-in">{msg.text}</div>
                  )}

                  {msg.type === 'buttons' && (
                    <div>
                      {msg.text && (
                        <div className="bg-[#252528] text-zinc-200 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm mb-2">
                          {msg.text}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {msg.buttons?.map((btn) => (
                          <button
                            key={btn.action}
                            onClick={() => handleButtonAction(btn.action)}
                            className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-indigo-500/50 text-zinc-200 rounded-xl text-[12px] font-medium transition-all duration-300 active:scale-95 hover:shadow-lg hover:shadow-indigo-500/5"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.type === 'avatar-picker' && (
                    <div>
                      <div className="bg-white/[0.04] text-zinc-200 px-4 py-2.5 rounded-2xl rounded-bl-md text-[13px] mb-2 border border-white/[0.04]">
                        {msg.text}
                      </div>
                      <div className="grid grid-cols-4 gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/[0.05]">
                        {msg.avatars?.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => handleAvatarSelect(url)}
                            className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-110 ${
                              regData.avatarUrl === url ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/20' : 'border-white/[0.06] hover:border-indigo-500/50'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.type === 'profile-card' && msg.profileData && (
                    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden w-64 animate-slide-up shadow-xl">
                      <div className="h-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative animate-gradient">
                        <div className="absolute -bottom-5 left-4">
                          <img
                            src={msg.profileData.avatarUrl || `https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.profileData.name}`}
                            className="w-12 h-12 rounded-full border-2 border-[#0e0e12] shadow-lg"
                            alt=""
                          />
                        </div>
                      </div>
                      <div className="pt-7 px-4 pb-4">
                        <p className="text-white font-semibold text-[13px]">{msg.profileData.name}</p>
                        <p className="text-zinc-500 text-[11px]">@{msg.profileData.username}</p>
                        <div className="flex gap-4 mt-3 text-[11px] text-zinc-500">
                          <span><b className="text-white">0</b> постов</span>
                          <span><b className="text-white">0</b> лайков</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {msg.type === 'game-reaction' && msg.gameData && (
                    <div className="bg-[#252528] rounded-xl border border-zinc-700 p-4 w-56">
                      <button
                        onClick={() => {
                          if (msg.gameData!.state === 'done') return;
                          handleReactionClick(msg.gameData!.state === 'ready' ? 'ready' : 'waiting');
                        }}
                        disabled={msg.gameData.state === 'done'}
                        className={`w-full py-6 rounded-xl text-white font-bold text-lg transition-all duration-200 active:scale-95 ${
                          msg.gameData.state === 'waiting'
                            ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                            : msg.gameData.state === 'ready'
                            ? 'bg-green-500 hover:bg-green-600 animate-none'
                            : msg.gameData.state === 'done' && msg.gameData.label?.includes('Рано')
                            ? 'bg-zinc-600 cursor-not-allowed'
                            : 'bg-blue-600 cursor-not-allowed'
                        }`}
                      >
                        {msg.gameData.label}
                      </button>
                    </div>
                  )}

                  {msg.type === 'game-emoji-memory' && msg.gameData && (
                    <div className="bg-[#252528] rounded-xl border border-zinc-700 p-4 w-64">
                      <div className="flex justify-center gap-2 mb-3">
                        {msg.gameData.emojis?.map((e, i) => (
                          <div
                            key={i}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl transition-all duration-300 ${
                              e === '❓' ? 'bg-zinc-700' : 'bg-zinc-700/50'
                            } ${msg.gameData!.state === 'failed' ? 'border border-red-500/50' : ''}`}
                          >
                            {e}
                          </div>
                        ))}
                      </div>

                      {(msg.gameData.state === 'hidden' || msg.gameData.state === 'failed') && msg.gameData.options && (
                        <>
                          <p className="text-xs text-zinc-400 text-center mb-2">
                            {msg.gameData.state === 'failed' ? 'Не угадал 😔' : 'Нажимай по порядку:'}
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {msg.gameData.options.map((e, i) => {
                              const isSelected = msg.gameData!.selected?.includes(e);
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleEmojiSelect(e)}
                                  disabled={isSelected || msg.gameData!.state === 'failed'}
                                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xl transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-blue-600/30 border border-blue-500'
                                      : msg.gameData!.state === 'failed'
                                      ? 'bg-zinc-800 opacity-50 cursor-not-allowed'
                                      : 'bg-zinc-700 hover:bg-zinc-600 active:scale-90 cursor-pointer'
                                  }`}
                                >
                                  {e}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {msg.gameData.state === 'showing' && (
                        <p className="text-xs text-zinc-400 text-center animate-pulse">Запоминай! ⏳</p>
                      )}
                    </div>
                  )}

                  {(msg.type === 'text' || !msg.type) && (
                    <div className={`text-[10px] text-zinc-600 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left ml-1'}`}>
                      {msg.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start animate-slide-up">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-black mr-2 mt-1 shadow-md shadow-indigo-500/20">ик</div>
                <div className="bg-white/[0.04] border border-white/[0.04] px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="bg-[#0a0a0e]/80 backdrop-blur-2xl px-4 py-3 border-t border-white/[0.04] shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type={(step === 'reg-password' || step === 'reg-confirm-password' || step === 'login-password') && !showPassword ? 'password' : 'text'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={inputDisabled}
                  placeholder={inputDisabled ? 'Ожидайте...' : getPlaceholder()}
                  className="w-full bg-white/[0.04] text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-[13px] outline-none border border-white/[0.06] focus:border-indigo-500/50 transition-all duration-300 disabled:opacity-30"
                />
                {(step === 'reg-password' || step === 'reg-confirm-password' || step === 'login-password') && (
                  <button
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-sm transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || inputDisabled}
                className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:opacity-30 rounded-xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 shrink-0 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                </svg>
              </button>
            </div>
            {!inputDisabled && (
              <div className="text-[10px] text-zinc-600 mt-1.5 text-center font-medium">Enter для отправки</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
