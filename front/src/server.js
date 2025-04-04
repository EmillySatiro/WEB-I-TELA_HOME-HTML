const express = require('express')
const cookieParser = require('cookie-parser');
const { chromium } = require('playwright');

const server = express()
const port = process.env.PORT || 3000
const host_backend = process.env.HOST_BACKEND || 'localhost'
const port_backend = process.env.PORT_BACKEND || 5000

console.log(`Frontend rodando na porta ${port}`)
console.log(`Backend rodando na porta ${port_backend}`)
console.log(`Host do backend: ${host_backend}`)

server.use(express.static("public"))
server.use(express.urlencoded({extended: true}))
server.use(cookieParser())

const nunjucks = require('nunjucks')
nunjucks.configure(
  "src/views",{
    express: server,
    noCache: true,
    autoescape: true
  }
)

server.get('/', async (req,res) => {
    return res.render('./auth/login.htm')
})

server.get('/cadastrar', async (req,res) => {
  const saved = req.query.cadastro == 'true' ? true : false
  return res.render('./auth/cadastrar.htm', {
    saved: saved
  })
})

server.post('/save_conta', express.urlencoded({ extended: true }), async (req,res) => {
  const data = req.body
  console.log(data)

  const response = await fetch(
    `http://${host_backend}:${port_backend}/cadastro`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: data.nome,
        sobrenome: data.sobrenome,
        email: data.email,
        senha: data.senha,
        confirmar_senha: data.confirmar_senha,
        checkbox: data.checkbox,
      })
  })
  console.log(response)

  if(response.status !== 201) {
    return res.status(500).send(response.statusText);
  }else{
    res.cookie('username', data.nome);
    const responseData = await response.json();
    res.cookie('idUser', responseData.idUser);
    return res.redirect('/cadastrar?cadastro=true')
  }
})

server.get('/perguntas', async (req,res) => {
  return res.render('./auth/perguntas.htm')
})

server.get('/recuperar_conta', async (req,res) => {
  return res.render('./auth/esqueci-senha.htm');
})

server.get('/alterar-senha', express.urlencoded({ extended: true }),async (req,res) => {
  const email = req.query.email
  return res.render('./auth/recuperacao-senha.htm', { email: email });
})

server.get('/inicio', async (req,res) => {
  let idUser = req.cookies.idUser
  const response = await fetch(
    `http://${host_backend}:${port_backend}/transacao?id=${idUser}`
  );

  const response_cartao = await fetch(
    `http://${host_backend}:${port_backend}/cards/id=${idUser}`
  );

  dados = await response.json()
  const cartao_data = await response_cartao.json()

  const response_perguntas = await fetch(
    `http://${host_backend}:${port_backend}/respostas/id=${idUser}`
  );
  const perguntas = await response_perguntas.json()
  const resposta = perguntas[0].resposta.length - 1;
  
  var meta = perguntas[0].resposta[resposta].resposta;

  if(cartao_data.length > 0){
    const ultimo_cartao = cartao_data.length - 1;
    var meta = cartao_data[ultimo_cartao].meta;
  }

  gasto = parseFloat(dados.reduce((acc, curr) => acc + parseFloat(curr.valor), 0)).toFixed(2)
  porcentagem = (gasto / meta) * 100;
  
  return res.render('./navigation/inicio.htm', {
    transacoes: dados,
    gasto_total: gasto,
    limite: parseFloat(meta) - gasto,
    porcentagem: porcentagem > 100 ? 100 : porcentagem,
    quantidade_cartao: cartao_data.length,
    cartoes: cartao_data,
  })
})

server.get('/contas', express.urlencoded({ extended: true }), async (req,res) => {
  
  const response = await fetch(
    `http://${host_backend}:${port_backend}/cards/id=${req.cookies.idUser}`
  );

  const cartoes = await response.json()

  const saved = req.query.cadastro == 'true' ? true : false
  if(saved){
    res.clearCookie('cadastro')
  }

  return res.render('./navigation/contas.htm', {
    idUser: req.cookies.idUser,
    cartoes: cartoes,
    saved:  saved,
    cadastro: "Cartao"
  })
})

server.post('/save_cartao', express.urlencoded({ extended: true }), async (req,res) => {
  let idUser = req.cookies.idUser;
  const data = req.body

  const response = await fetch(
    `http://${host_backend}:${port_backend}/cards/id=${idUser}`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        tipo: data.tipo, 
        numero: data.numero, 
        nome: data.nome, 
        meta: data.meta, 
      })
    }
  );

  if(response.status !== 201) {
    return res.status(500).send('Erro ao salvar o cartão');
  }else{
    return res.redirect('/contas?cadastro=true')
  }
})

server.get('/metas', async (req,res) => {
  let idUser = req.cookies.idUser
  
  const response_card = await fetch(
    `http://${host_backend}:${port_backend}/cards/id=${idUser}`
  );
  const cartao_data = await response_card.json()

  const ultimo_cartao = cartao_data.length - 1;
  const meta = cartao_data[ultimo_cartao].meta;

  const response_transacao = await fetch(
    `http://${host_backend}:${port_backend}/transacao_categoria/id=${idUser}`
  );
  dados = await response_transacao.json()

  gasto = Object.values(dados).reduce((acc, categoria) => acc + categoria.total_gasto, 0);

  porcentagem = (gasto / meta) * 100;

  return res.render('./navigation/metas.htm', {
    categorias: dados,
    limite: meta,
    gasto_limite: meta - gasto,
    gasto_total: gasto,
    porcentagem: porcentagem > 100 ? 100 : porcentagem,
  })
})

server.get('/financas', async (req,res) => {
  let idUser = req.cookies.idUser

  const response_transacao = await fetch(
    `http://${host_backend}:${port_backend}/transacao?id=${idUser}`
  );
  dados = await response_transacao.json()

  const response_pendente = await fetch(
    `http://${host_backend}:${port_backend}/transacao_next_transactions/id=${idUser}`
  );
  gasto_pendente = await response_pendente.json()

  const response_categorias = await fetch(
    `http://${host_backend}:${port_backend}/get_categorias/id=${idUser}`
  );
  categorias = await response_categorias.json()

  const response_meses = await fetch(
    `http://${host_backend}:${port_backend}/transacao_mes/id=${idUser}`
  );
  meses = await response_meses.json()

  return res.render('./navigation/financas.htm', {
    idUser: idUser,
    transacoes: dados,
    gasto_total: parseFloat(dados.reduce((acc, curr) => acc + parseFloat(curr.valor), 0)).toFixed(2),
    pendente: parseFloat(gasto_pendente.pendente).toFixed(2),
    categorias: categorias,
    meses: meses,
  })
})

server.get('/ajuda', async (req,res) => {
  return res.render('./navigation/ajuda.htm')
})

server.get('/ajuda_selecionado', async (req,res) => {
  return res.render('./navigation/ajuda_selecionado.htm')
})

server.get('/perfil', async (req,res) => {
  let username = req.cookies.username
  let idUser = req.cookies.idUser

  const saved = req.query.atualizado == 'true' ? true : false
  
  return res.render('./navigation/perfil.htm', 
    {
      nome: username,
      idUser: idUser,
      saved: saved
    }
  )
})

server.post('/update_perfil', express.urlencoded({ extended: true }), async (req,res) => {
  let idUser = req.cookies.idUser
  const data = req.body

  console.log(data)

  const response = await fetch(
    `http://${host_backend}:${port_backend}/perfil/id=${idUser}`,{
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome: data.nome,
        sobrenome: data.sobrenome,
        email: data.email,
        senha: data.senha,
      })
    });

  if(response.status !== 200) {
    return res.status(500).send('Erro ao salvar o perfil');
  }else{
    res.cookie('username', data.nome);
    return res.redirect('/perfil?atualizado=true')
  }
})

server.get('/historico', async (req,res) => {
  let idUser = req.cookies.idUser

  const response = await fetch(
    `http://${host_backend}:${port_backend}/transacao?id=${idUser}`
  );
  dados = await response.json()
  return res.render('./navigation/operacoes.htm',{transacoes: dados})
})

const somenteExportarPdf = (req, res, next) => {
  const token = req.query.token;
  if (token !== 'SECRETO_123') { // Substitua por um token complexo
    return res.status(403).send('Acesso negado: token inválido');
  }
  next();
};

server.get('/relatorio',somenteExportarPdf,async (req, res) => {
  const { id, mes, categoria } = req.query;
  
  const response_user = await fetch(
    `http://${host_backend}:${port_backend}/users/id=${id}`
  );
  const user = await response_user.json()

  const response_transacao = await fetch(
    `http://${host_backend}:${port_backend}/transacao?id=${id}&mes=${mes}&categoria=${categoria}`
  );
  const transacoes = await response_transacao.json()
  
  const transacoesComDatas = transacoes.map(transacao => {
    const [dia, mes, ano] = transacao.data.split('/').map(Number);
    return {
      ...transacao,
      dataObj: new Date(ano, mes - 1, dia)
    };
  });

  const datas = transacoesComDatas.map(t => t.dataObj);

  const data_min = new Date(Math.min(...datas));
  const data_max = new Date(Math.max(...datas));

  const data_inicio = data_min.toLocaleDateString('pt-BR');
  const data_fim = data_max.toLocaleDateString('pt-BR');

  const gastos_maiores = transacoes.sort((a, b) => b.valor - a.valor).slice(0, 3);
  const gasto = parseFloat(transacoes.reduce((acc, curr) => acc + parseFloat(curr.valor), 0)).toFixed(2)

  const dados = {
    nome: user.nome,
    sobrenome: user.sobrenome,
    data_inicio: data_inicio,
    data_fim: data_fim,
    gasto_total: gasto,
    gastos_maiores: gastos_maiores,
    gastos: transacoes,
  }

  return res.render('./pdf/relatorio.htm',{ dados:dados})
});

server.get('/exportar-pdf', express.urlencoded({ extended: true }), async (req, res) => {
  const { id, mes, categoria } = req.query;
  
  console.log(req.query)

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-web-security', '--no-sandbox']
    });

    const page = await browser.newPage();
    
    await page.setViewportSize({ width: 1200, height: 5000 });
    
    await page.goto(`http://${host_backend}:${port}/relatorio?token=SECRETO_123&id=${id}&mes=${mes}&categoria=${categoria}`, {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    await page.waitForFunction(() => {
      const bodyHeight = document.body.scrollHeight;
      return bodyHeight > 1000;
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: false
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).send('Erro na geração do PDF: ' + error.message);
  } finally {
    if (browser) await browser.close();
  }
});

server.listen(port)