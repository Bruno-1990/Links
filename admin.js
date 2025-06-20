// Inicializa o cliente Supabase
const supabaseClient = window.supabase.createClient(
  'https://rmkokxhzmmizxjmcrjff.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJta29reGh6bW1penhqbWNyamZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNDc2ODcsImV4cCI6MjA2NTgyMzY4N30.YFXpLvLNMblNQJ5Or-Tp19xfslQWvVcse5lUje_jblE'
);

// Carrega os quadros
async function carregarQuadros() {
  const { data, error } = await supabaseClient.from('quadros').select('*').order('nome');
  const container = document.getElementById('quadro-container');
  container.innerHTML = '';

  if (error) {
    container.innerHTML = '<p>Erro ao carregar quadros.</p>';
    return;
  }

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

// Abre modal ao clicar
function handleAbrirModal(el) {
  const id = el.dataset.id;
  const nome = decodeURIComponent(el.dataset.nome);
  const icone = decodeURIComponent(el.dataset.icone);
  abrirModal(id, nome, icone);
}

// Adiciona novo quadro
async function adicionarQuadro() {
  const nome = document.getElementById('nome-quadro').value.trim();
  const icone = document.getElementById('icone-quadro').value.trim();
  if (!nome) return alert('Informe o nome do quadro.');

  await supabaseClient.from('quadros').insert([{ nome, icone }]);
  document.getElementById('nome-quadro').value = '';
  document.getElementById('icone-quadro').value = '';
  carregarQuadros();
}

// Remove quadro e links
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

// Abre modal e mostra os links
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

  // Formulário + Dropzone
  html += `
    <form onsubmit="event.preventDefault(); adicionarLink(${id}, '${nome.replace(/'/g, "\\'")}', '${icone.replace(/'/g, "\\'")}')">
      <input id="nome-link" placeholder="Nome do link">
      <input id="url-link" placeholder="URL">
      <button type="submit" class="btn-primary">Adicionar Link</button>
    </form>

    <hr>
    <h3>Importar links por arquivo JSON</h3>
    <div id="drop-zone" class="drop-zone">
        Arraste um arquivo .json, .bat ou .pdf aqui ou clique para selecionar
        <input type="file" id="file-input" accept=".json,.bat,.pdf" hidden>
    </div>`;

  const modal = document.getElementById('modalDinamico');
  document.getElementById('modal-content').innerHTML = html;
  modal.style.display = 'flex';
  modal.classList.add('show');

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
      if (file) processUpload(file);
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) processUpload(file);
    });

    async function processUpload(file) {
      try {
        const nomeArquivo = file.name.toLowerCase();

        if (nomeArquivo.endsWith('.json')) {
          const text = await file.text();
          const links = JSON.parse(text);

          if (!Array.isArray(links)) {
            throw new Error("Formato inválido: o conteúdo deve ser um array.");
          }

          const validLinks = links.filter(l =>
            typeof l.nome === 'string' && typeof l.url === 'string'
          );

          if (validLinks.length === 0) {
            return Swal.fire('Erro', 'Nenhum link válido encontrado no arquivo.', 'error');
          }

          await supabaseClient.from('links').insert(
            validLinks.map(l => ({
              id_quadro: id,
              nome: l.nome,
              url: l.url
            }))
          );

          Swal.fire('Sucesso!', `${validLinks.length} links importados com sucesso.`, 'success');
          abrirModal(id, nome, icone);
          return;
        }
        
        if (nomeArquivo.endsWith('.pdf')) {
        const { data, error } = await supabaseClient.storage
            .from('bat-files')
            .upload(`pdfs/${file.name}`, file, {
            cacheControl: '3600',
            upsert: true
            });

        if (error) {
            return Swal.fire('Erro no upload', error.message, 'error');
        }

        const { data: publicData } = supabaseClient.storage
            .from('bat-files')
            .getPublicUrl(`pdfs/${file.name}`);

        const publicURL = publicData?.publicUrl;

        if (!publicURL) {
            return Swal.fire('Erro', 'Não foi possível obter a URL pública do PDF.', 'error');
        }

        await supabaseClient.from('links').insert([{
            id_quadro: id,
            nome: file.name,
            url: publicURL
        }]);

        Swal.fire('Upload completo!', 'Arquivo PDF armazenado com sucesso.', 'success');
        abrirModal(id, nome, icone);
        return;
        }

        if (nomeArquivo.endsWith('.bat')) {
          const { data, error } = await supabaseClient.storage
            .from('bat-files')
            .upload(`scripts/${file.name}`, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error) {
            return Swal.fire('Erro no upload', error.message, 'error');
          }

          const { data: publicData } = supabaseClient.storage
            .from('bat-files')
            .getPublicUrl(`scripts/${file.name}`);

          const publicURL = publicData?.publicUrl;

          if (!publicURL) {
            return Swal.fire('Erro', 'Não foi possível obter a URL pública do arquivo.', 'error');
          }

          await supabaseClient.from('links').insert([{
            id_quadro: id,
            nome: file.name,
            url: publicURL
          }]);

          Swal.fire('Upload completo!', 'Arquivo .bat armazenado com sucesso.', 'success');
          abrirModal(id, nome, icone);
          return;
        }

        Swal.fire('Erro', 'Tipo de arquivo não suportado.', 'error');
      } catch (err) {
        Swal.fire('Erro ao importar', err.message, 'error');
      }
    }
  }, 100);
}

// Adiciona link manual
async function adicionarLink(id_quadro, nome, icone) {
  const nomeLink = document.getElementById('nome-link').value.trim();
  const urlLink = document.getElementById('url-link').value.trim();
  if (!nomeLink || !urlLink) return alert('Preencha o nome e a URL do link.');

  await supabaseClient.from('links').insert([{ id_quadro, nome: nomeLink, url: urlLink }]);
  abrirModal(id_quadro, nome, icone);
}

// Remove link
async function removerLink(id_link, id_quadro, nome, icone) {
  await supabaseClient.from('links').delete().eq('id', id_link);
  abrirModal(id_quadro, nome, icone);
}

// Fecha modal
function fecharModal() {
  const modal = document.getElementById('modalDinamico');
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
    document.getElementById('modal-content').innerHTML = '';
  }, 400);
}

// Fechar modal ao clicar fora
document.getElementById('modalDinamico').addEventListener('click', function (event) {
  if (event.target.id === 'modalDinamico') {
    fecharModal();
  }
});

// Fechar modal ao pressionar ESC
document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    fecharModal();
  }
});

// Carregar quadros ao iniciar
window.onload = carregarQuadros;
