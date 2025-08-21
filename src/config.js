const getEnvVar = (name, fallback = null) => {
    // Tentar diferentes formas de acessar variáveis de ambiente
    if (typeof window !== 'undefined' && window.importMeta && window.importMeta.env) {
      return window.importMeta.env[name]; // Vite
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name]; // Node.js
    }
    if (typeof window !== 'undefined' && window.ENV) {
      return window.ENV[name]; // Variáveis definidas no HTML
    }
    return fallback;
  };
  
  export const config = {
    SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || "https://apbbhuhtdqfwfmlzxnwv.supabase.co/",
    SUPABASE_ANON_KEY: getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYmJodWh0ZHFmd2ZtbHp4bnd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MTcyNjUsImV4cCI6MjA3MTI5MzI2NX0.D330nS8F9ZIMqnZHzvFIST-wv4ccCyyumV6s4zSmAGs"
  };
  
  // Validar se as variáveis estão definidas
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
    console.log('Configure as variáveis de ambiente adequadamente');
  }