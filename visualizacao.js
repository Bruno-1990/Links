// Inicializa o cliente Supabase com a URL e chave pública
const supabaseClient = window.supabase.createClient(
  'https://rmkokxhzmmizxjmcrjff.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta29reGh6bW1penhqbWNyamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDc2ODcsImV4cCI6MjA2NTgyMzY4N30.YFXpLvLNMblNQJ5Or-Tp19xfslQWvVcse5lUje_jblE'
);

// Função assíncrona que carrega os quadros salvos no Supabase e renderiza na tela
async function carregarQuadros() {
  
  // Busca todos os registros da tabela 'quadros', ordenados por nome
  const { data, error } = await supabaseClient
    .from('quadros')
    .select('*')
    .order('nome');

  
    // Seleciona o container onde os quadros serão inseridos
  const container = document.getElementById('quadro-container');
  container.innerHTML = ''; // Limpa conteúdo anterior

  
  // Se houve erro ou nenhum dado foi retornado, exibe mensagem
  if (error || !data.length) {
    container.innerHTML = '<p>Nenhum quadro encontrado.</p>';
    return;
  }

  // Para cada quadro retornado, cria e insere o bloco HTML correspondente
  for (const q of data) {
    const div = document.createElement('div');
    div.className = 'accordion';

    // Cria o HTML de cada quadro com ícone e nome, e ação de abrir o modal
    div.innerHTML = `
      <div class="accordion-header" onclick="abrirModal(${q.id}, '${q.nome}', '${q.icone || '📁'}')">
        ${q.icone || '📁'} ${q.nome}
      </div>`;
    
    container.appendChild(div);
  }
}

// Função que exibe os links do quadro selecionado em um modal
async function abrirModal(id, nome, icone) {
 
  // Busca os links associados ao quadro informado
  const { data, error } = await supabaseClient
    .from('links')
    .select('*')
    .eq('id_quadro', id);

  const container = document.getElementById('modal-content');

 
  // Inicia o HTML com o título do quadro
  let html = `<h2>${icone} ${nome}</h2>`;

 
  // Se não houver links ou ocorrer erro, exibe mensagem
  if (error || !data.length) {
    html += '<p>Nenhum link encontrado.</p>';
    
  } else {
    // Para cada link, cria o HTML do botão de acesso
    html += data
      .map(
        (link) => `
      <div class="link-item">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer">
          ${link.nome}
        </a>
        <div class="note">Download direto - Botão direito, "Abrir link em nova janela"</div>
      </div>`
      )
      .join('');
  }

  // Insere o HTML no modal e o exibe
  container.innerHTML = html;
  const modal = document.getElementById('modalDinamico');
  modal.style.display = 'flex'; // Torna o modal visível

  // Adiciona animação após um pequeno delay
  setTimeout(() => modal.classList.add('show'), 10);
}

// Função para fechar o modal com animação e limpar conteúdo
function fecharModal() {
  const modal = document.getElementById('modalDinamico');
  modal.classList.remove('show'); // Inicia fechamento visual

  // Após a transição, esconde o modal e limpa o conteúdo
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('modal-content').innerHTML = '';
  }, 400);
}

// Fecha o modal ao pressionar a tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fecharModal();
});

// Fecha o modal ao clicar fora da área do conteúdo (overlay)
document.getElementById('modalDinamico').addEventListener('click', (e) => {
  if (e.target.id === 'modalDinamico') fecharModal();
});

// Quando a página carregar, executa a função de carregar quadros automaticamente
window.onload = carregarQuadros;
