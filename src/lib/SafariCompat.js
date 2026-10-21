/**
 * Utilitários de compatibilidade com Safari
 * Oferece fallbacks para APIs limitadas em Safari/iOS
 */

/**
 * localStorage seguro com fallback para memória em modo privado
 */
class SafeStorage {
  constructor() {
    this.memoryStore = {};
    this.isPrivateMode = this.detectPrivateMode();
  }

  detectPrivateMode() {
    try {
      const test = '__safari_private_mode_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return false;
    } catch {
      return true;
    }
  }

  setItem(key, value) {
    try {
      if (this.isPrivateMode) {
        this.memoryStore[key] = value;
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      this.memoryStore[key] = value;
    }
  }

  getItem(key) {
    try {
      if (this.isPrivateMode) {
        return this.memoryStore[key] || null;
      }
      return localStorage.getItem(key);
    } catch {
      return this.memoryStore[key] || null;
    }
  }

  removeItem(key) {
    try {
      if (!this.isPrivateMode) {
        localStorage.removeItem(key);
      }
    } catch {}
    delete this.memoryStore[key];
  }

  clear() {
    try {
      if (!this.isPrivateMode) {
        localStorage.clear();
      }
    } catch {}
    this.memoryStore = {};
  }
}

export const safeStorage = new SafeStorage();

/**
 * Formata data em YYYY-MM-DD
 * Input: Date object ou string ISO
 * Output: string YYYY-MM-DD
 */
export function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${year}-${month}-${day}`;
}

/**
 * Parse data de input type="date" com segurança
 * Safari algumas vezes retorna formato diferentes
 */
export function parseDateFromInput(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return `${year}-${month}-${day}`;
}

/**
 * Detecta se está em Safari
 */
export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Detecta versão do Safari
 */
export function getSafariVersion() {
  const ua = navigator.userAgent;
  const match = ua.match(/Version\/([\d.]+).*Safari/);
  return match ? parseInt(match[1].split('.')[0]) : null;
}

/**
 * Scroll seguro com fallback para Safari antigo
 */
export function safeScrollTo(element, options = {}) {
  const { behavior = 'smooth', block = 'start' } = options;

  try {
    element.scrollIntoView({ behavior, block });
  } catch {
    // Fallback para Safari antigo
    element.scrollIntoView();
  }
}

/**
 * Viewport height seguro (vh em Safari é problemático)
 */
export function getSafeViewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight;
}

/**
 * Fix para input focus em Safari iOS
 * Previne zoom ao focar em input
 */
export function applyInputFocusFix(inputElement) {
  if (!inputElement) return;
  
  const handler = (e) => {
    // Resetar font-size para evitar zoom
    const originalSize = window.getComputedStyle(inputElement).fontSize;
    inputElement.style.fontSize = originalSize;
    setTimeout(() => {
      inputElement.style.fontSize = originalSize;
    }, 100);
  };
  
  inputElement.addEventListener('focus', handler);
  return () => inputElement.removeEventListener('focus', handler);
}

/**
 * Fix para overflow-y em Safari iOS
 * Previne bouncing scroll quando body tem overflow hidden
 */
export function preventBodyScroll() {
  const originalStyle = document.body.style.cssText;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  
  return () => {
    document.body.style.cssText = originalStyle;
  };
}

/**
 * Re-enable body scroll
 */
export function enableBodyScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}

/**
 * Detecta viewport com notch (iPhone X+)
 */
export function hasNotch() {
  const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'));
  return safeAreaTop > 20;
}

/**
 * ✅ CORREÇÃO #1: Normaliza datas para formato compatível com Safari
 * Safari é rigoroso: new Date("2026-04-07") falha, mas new Date("2026/04/07") funciona
 * Entrada: "2026-04-07" (ISO format)
 * Saída: "2026/04/07" (Safari-compatible format)
 */
export function normalizeDateForSafari(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') return null;
  // Converter YYYY-MM-DD para YYYY/MM/DD
  return dateStr.replace(/-/g, '/');
}

/**
 * Cria uma Date segura que funciona em Safari
 * Input: string ISO (YYYY-MM-DD) ou Date object
 * Output: Date object válido
 */
export function createSafariDate(dateInput) {
  if (!dateInput) return null;
  
  // Se é Date, converter para string ISO primeiro
  let dateStr = typeof dateInput === 'string' ? dateInput : dateInput.toISOString().split('T')[0];
  
  // Truncar parte de hora se existir (ex: "2026-04-11T19:30" → "2026-04-11")
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  
  // Normalizar para formato Safari-safe (YYYY/MM/DD)
  const safeDateStr = normalizeDateForSafari(dateStr);
  
  try {
    const date = new Date(safeDateStr);
    // Validar se é data válida
    if (isNaN(date.getTime())) {
      console.warn('Data inválida:', dateInput);
      return null;
    }
    return date;
  } catch (error) {
    console.error('Erro ao criar data:', error);
    return null;
  }
}

/**
 * Valida se uma string de data é válida em Safari
 */
export function isValidSafariDate(dateStr) {
  if (!dateStr) return false;
  const date = createSafariDate(dateStr);
  return date !== null && !isNaN(date.getTime());
}