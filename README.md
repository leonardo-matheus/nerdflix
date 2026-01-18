# NERDFLIX 🎬

Site estilo Netflix para reprodução de listas M3U8.

## Funcionalidades

- ✅ Carrega e parseia listas M3U8 automaticamente
- ✅ Reconhece canais, filmes e séries
- ✅ Organiza por categorias/grupos (group-title)
- ✅ Exibe logos quando disponíveis (tvg-logo)
- ✅ Player integrado com suporte a HLS
- ✅ Busca por nome
- ✅ Filtros por tipo (canais, filmes, séries)
- ✅ Interface responsiva estilo Netflix
- ✅ Banner destacado rotativo

## Como usar

### Opção 1: Abrir diretamente
Abra o arquivo `index.html` no navegador (pode ter limitações de CORS).

### Opção 2: Servidor local (recomendado)

**Com Python:**
```bash
cd nerdflix
python -m http.server 8080
```

**Com Node.js:**
```bash
npx serve nerdflix
```

**Com VS Code:**
Use a extensão "Live Server"

Depois acesse: http://localhost:8080

## Estrutura

```
nerdflix/
├── index.html    # Página principal
├── styles.css    # Estilos Netflix-like
├── app.js        # Lógica da aplicação
└── README.md     # Este arquivo
```

## Configuração

Para alterar a URL da playlist, edite a linha no `app.js`:

```javascript
this.playlistUrl = 'SUA_URL_AQUI';
```

## Tecnologias

- HTML5 / CSS3
- JavaScript ES6+
- HLS.js (para streams HLS)
- Font Awesome (ícones)
- Google Fonts (Bebas Neue, Roboto)

## Formato M3U8 suportado

```
#EXTM3U
#EXTINF:-1 tvg-id="id" tvg-name="Nome" tvg-logo="url_logo" group-title="Categoria",Nome do Canal
http://url-do-stream.m3u8
```
