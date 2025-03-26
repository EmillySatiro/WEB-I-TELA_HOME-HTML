const express = require('express')
const cookieParser = require('cookie-parser');
const server = express()
const port = 3000

server.use(express.static("public"))
server.use(express.urlencoded({extended: true}))
server.use(cookieParser())

const nunjucks = require('nunjucks')
nunjucks.configure(
  "src/views",{
    express: server,
    noCache: true
  }
)

server.get('/', async (req,res) => {
    return res.render('./auth/login.htm')
})

server.get('/cadastrar', async (req,res) => {
  return res.render('./auth/cadastrar.htm')
})

server.get('/recuperar_conta', async (req,res) => {
  return res.render('./auth/esqueci-senha.htm')
})

server.get('/inicio', async (req,res) => {
  let idUser = req.cookies.idUser

  const response = await fetch(`http://127.0.0.1:5000/transacao/id=${idUser}`);
  dados = await response.json()


  return res.render('./navigation/inicio.htm', {
    transacoes: dados,
    gasto_total: parseFloat(dados.reduce((acc, curr) => acc + parseFloat(curr.valor), 0)).toFixed(2)
  })
})

server.get('/contas', async (req,res) => {
  return res.render('./navigation/contas.htm')
})

server.get('/metas', async (req,res) => {
  return res.render('./navigation/metas.htm')
})

server.get('/financas', async (req,res) => {
  let idUser = req.cookies.idUser

  const response = await fetch(`http://127.0.0.1:5000/transacao/id=${idUser}`);
  dados = await response.json()

  return res.render('./navigation/financas.htm', {transacoes: dados})
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

  return res.render('./navigation/perfil.htm', 
    {
      nome: username,
      idUser: idUser
    }
  )
})

server.get('/historico', async (req,res) => {
  let idUser = req.cookies.idUser

  const response = await fetch(`http://127.0.0.1:5000/transacao/id=${idUser}`);
  dados = await response.json()

  return res.render('./navigation/operacoes.htm',{transacoes: dados})
})

server.get('/perguntas', async (req,res) => {
  return res.render('./auth/perguntas.htm')
})

server.listen(port)