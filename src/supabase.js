// Configurações do Supabase
const SUPABASE_URL = "https://apbbhuhtdqfwfmlzxnwv.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYmJodWh0ZHFmd2ZtbHp4bnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTcyNjUsImV4cCI6MjA3MTI5MzI2NX0.D330nS8F9ZIMqnZHzvFIST-wv4ccCyyumV6s4zSmAGs";

// Verificar se estamos no browser e se o Supabase está disponível
const isBrowser = typeof window !== 'undefined';
if (isBrowser && !window.supabase) {
  console.error('Supabase library not loaded. Make sure to include the Supabase script in your HTML.');
}

// Criar instância única global do cliente Supabase para evitar conflitos de token
let globalSupabaseClient = null;

// Função para obter ou criar cliente Supabase único
function getSupabaseClient() {
  if (!globalSupabaseClient && isBrowser && window.supabase) {
    console.log('🔧 Criando instância única do cliente Supabase');
    globalSupabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false, // Evitar conflitos de sessão
          autoRefreshToken: false // Evitar conflitos de token
        }
      }
    );
    
    // Disponibilizar globalmente para evitar múltiplas instâncias
    window.globalSupabaseClient = globalSupabaseClient;
  }
  
  return globalSupabaseClient;
}

// Exportar cliente único ou fallback
export const supabase = getSupabaseClient() || {
  // Fallback object para evitar erros quando Supabase não está carregado
  auth: {
    signUp: () => Promise.reject(new Error('Supabase not loaded')),
    signIn: () => Promise.reject(new Error('Supabase not loaded')),
    signOut: () => Promise.reject(new Error('Supabase not loaded')),
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  from: () => ({
    select: () => Promise.reject(new Error('Supabase not loaded')),
    insert: () => Promise.reject(new Error('Supabase not loaded')),
    update: () => Promise.reject(new Error('Supabase not loaded')),
    delete: () => Promise.reject(new Error('Supabase not loaded'))
  })
};

// Exportar função para obter cliente (para uso em HTML) - apenas no browser
if (isBrowser) {
  window.getSupabaseClient = getSupabaseClient;
}

// Função global para calcular nível do jogador (compatibilidade com possíveis chamadas SQL)
if (isBrowser) {
  window.calculate_player_level = function(score) {
  // Importar RewardSystem dinamicamente para evitar dependência circular
  import('./classes/RewardSystem.js').then(({ default: RewardSystem }) => {
    const rewardSystem = new RewardSystem();
    return rewardSystem.calculate_player_level(score);
  }).catch(() => {
    // Fallback simples baseado em pontuação
    if (typeof score === 'bigint') score = Number(score);
    if (score >= 50000) return 5;
    if (score >= 25000) return 4;
    if (score >= 10000) return 3;
    if (score >= 5000) return 2;
    return 1;
  });
  };
}