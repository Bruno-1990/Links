// Inicializa o cliente Supabase com a URL e chave pública
const supabaseClient = window.supabase.createClient(
  'https://rmkokxhzmmizxjmcrjff.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta29reGh6bW1penhqbWNyamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDc2ODcsImV4cCI6MjA2NTgyMzY4N30.YFXpLvLNMblNQJ5Or-Tp19xfslQWvVcse5lUje_jblE'
);
// Carrega todos os quadros da tabela 'quadros' do Supabase
async function carregarQuadros() {
  const { data, error } = await supabaseClient.from('quadros').select('*').order('nome');
  const container = document.getElementById('quadro-container');
  container.innerHTML = ''; // Limpa o conteúdo anterior

  if (error) {
    container.innerHTML = '<p>Erro ao carregar quadros.</p>';
    return;
  }

  // Para cada quadro, cria um cartão com nome, ícone e botão de exclusão
  for (const q of data) {
    const div = document.createElement('div');
    div.className = 'accordion';
    div.innerHTML = `
      <div class="accordion-header">
        <span data-id="${q.id}" data-nome="${encodeURIComponent(q.nome)}" data-icone="${encodeURIComponent(q.icone || '📁')}" onclick="handleAbrirModal(this)">
          ${q.icone || '📁'} ${q.nome}
        </span>
        <button class="btn-icon" onclick="removerQuadro(${q.id})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>`;
    container.appendChild(div);
  }
}

// Manipulador intermediário para abrir modal (decodifica os dados do quadro)
function handleAbrirModal(el) {
  const id = el.dataset.id;
  const nome = decodeURIComponent(el.dataset.nome);
  const icone = decodeURIComponent(el.dataset.icone);
  abrirModal(id, nome, icone);
}

// Insere um novo quadro com nome e ícone fornecidos
async function adicionarQuadro() {
  const nome = document.getElementById('nome-quadro').value.trim();
  const icone = document.getElementById('icone-quadro').value.trim();
  if (!nome) return alert('Informe o nome do quadro.');

  await supabaseClient.from('quadros').insert([{ nome, icone }]);
  document.getElementById('nome-quadro').value = '';
  document.getElementById('icone-quadro').value = '';
  carregarQuadros(); // Recarrega a lista após adicionar
}

// Remove o quadro e os links associados, com confirmação via SweetAlert
async function removerQuadro(id) {
  const confirm = await Swal.fire({
    title: 'Tem certeza?',
    text: 'O quadro e todos os links associados serão excluídos!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, excluir',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  });

  if (confirm.isConfirmed) {
    await supabaseClient.from('quadros').delete().eq('id', id);
    await supabaseClient.from('links').delete().eq('id_quadro', id);
    carregarQuadros();
    fecharModal();
    Swal.fire('Excluído!', 'O quadro foi removido.', 'success');
  }
}

// Abre o modal de visualização e cadastro de links para um quadro específico
async function abrirModal(id, nome, icone) {
  const { data, error } = await supabaseClient
    .from('links')
    .select('*')
    .eq('id_quadro', id);

  let html = `<h2 style="text-align:center;">${icone} ${nome}</h2>`;

  if (error) {
    html += '<p>Erro ao carregar links.</p>';
  } else if (data.length === 0) {
    html += '<p style="text-align:center; opacity:0.7">Nenhum link cadastrado ainda.</p>';
  } else {
    for (const link of data) {
      html += `
        <div class="link-item">
          <a href="${link.url}" target="_blank">${link.nome}</a>
          <button class="btn-icon" onclick="removerLink(${link.id}, ${id}, '${nome.replace(/'/g, "\\'")}', '${icone.replace(/'/g, "\\'")}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>`;
    }
  }

  // Formulário de link manual
  html += `
    <form onsubmit="event.preventDefault(); adicionarLink(${id}, '${nome.replace(/'/g, "\\'")}', '${icone.replace(/'/g, "\\'")}')">
      <input id="nome-link" placeholder="Nome do link">
      <input id="url-link" placeholder="URL">
      <button type="submit" class="btn-primary">Adicionar Link</button>
    </form>

    <hr>
    <h3>Importar links por arquivo JSON</h3>
    <div id="drop-zone" class="drop-zone">
      Arraste um arquivo .json aqui ou clique para selecionar
      <input type="file" id="file-input" accept=".json" hidden>
    </div>`;

  const modal = document.getElementById('modalDinamico');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
  modal.classList.add('show');

  // Ativa o dropzone após o HTML ser injetado
  setTimeout(() => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.style.backgroundColor = '#ddf';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.style.backgroundColor = '';
      const file = e.dataTransfer.files[0];
      if (file) processJSONFile(file);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) processJSONFile(file);
    });

    async function processJSONFile(file) {
      try {
        const text = await file.text();
        const links = JSON.parse(text);

        if (!Array.isArray(links)) throw new Error("Formato inválido: o conteúdo deve ser um array.");

        const validLinks = links.filter(l =>
          typeof l.nome === 'string' && typeof l.url === 'string'
        );

        if (validLinks.length === 0) {
          Swal.fire('Erro', 'Nenhum link válido encontrado no arquivo.', 'error');
          return;
        }

        await supabaseClient.from('links').insert(
          validLinks.map(l => ({
            id_quadro: id,
            nome: l.nome,
            url: l.url
          }))
        );

        Swal.fire('Sucesso!', `${validLinks.length} links importados com sucesso.`, 'success');
        abrirModal(id, nome, icone); // recarrega o modal com os novos links

      } catch (err) {
        Swal.fire('Erro ao importar', err.message, 'error');
      }
    }
  }, 100);
}


// Insere um novo link vinculado ao quadro atual
async function adicionarLink(id_quadro, nome, icone) {
  const nomeLink = document.getElementById('nome-link').value.trim();
  const urlLink = document.getElementById('url-link').value.trim();
  if (!nomeLink || !urlLink) return alert('Preencha o nome e a URL do link.');

  await supabaseClient.from('links').insert([{ id_quadro, nome: nomeLink, url: urlLink }]);
  abrirModal(id_quadro, nome, icone); // Reabre o modal com link atualizado
}

// Remove um link específico e recarrega o modal
async function removerLink(id_link, id_quadro, nome, icone) {
  await supabaseClient.from('links').delete().eq('id', id_link);
  abrirModal(id_quadro, nome, icone);
}

// Fecha o modal com animação e limpa o conteúdo interno
function fecharModal() {
  const modal = document.getElementById('modalDinamico');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('modal-content').innerHTML = '';
  }, 400);
}

// Permite fechar o modal ao clicar fora da área central
document.getElementById('modalDinamico').addEventListener('click', function (event) {
  if (event.target.id === 'modalDinamico') {
    fecharModal();
  }
});

// Permite fechar o modal ao pressionar a tecla ESC
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    fecharModal();
  }
});

// Executa o carregamento inicial dos quadros quando a página carrega
window.onload = carregarQuadros;
