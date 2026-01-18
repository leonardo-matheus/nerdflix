/**
 * Script para gerar o cache JSON pré-processado
 * Execute este script localmente para gerar o nerdflix-cache.json
 * Depois faça upload para o R2 no mesmo bucket
 * 
 * Uso: node generate-cache.js
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const PLAYLIST_URL = 'https://pub-f8e264b0f9ce4788ba346df77c54fef5.r2.dev/2024/ListaVip.m3u8';
const OUTPUT_FILE = 'nerdflix-cache.json';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        console.log('Baixando:', url);
        const startTime = Date.now();
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return fetchUrl(response.headers.location).then(resolve).catch(reject);
            }
            
            let data = '';
            const totalSize = parseInt(response.headers['content-length'] || 0);
            let downloaded = 0;
            
            response.on('data', (chunk) => {
                data += chunk;
                downloaded += chunk.length;
                
                if (totalSize > 0) {
                    const percent = ((downloaded / totalSize) * 100).toFixed(1);
                    const mb = (downloaded / 1024 / 1024).toFixed(2);
                    process.stdout.write(`\rProgresso: ${percent}% (${mb} MB)`);
                }
            });
            
            response.on('end', () => {
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\nDownload concluído em ${elapsed}s`);
                resolve(data);
            });
        }).on('error', reject);
    });
}

function parseExtInf(line) {
    const item = {
        name: '',
        group: '',
        logo: '',
        tvgId: '',
        tvgName: ''
    };
    
    const groupMatch = line.match(/group-title="([^"]*)"/);
    if (groupMatch) item.group = groupMatch[1];
    
    const logoMatch = line.match(/tvg-logo="([^"]*)"/);
    if (logoMatch) item.logo = logoMatch[1];
    
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
    if (tvgIdMatch) item.tvgId = tvgIdMatch[1];
    
    const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
    if (tvgNameMatch) item.tvgName = tvgNameMatch[1];
    
    const nameParts = line.split(',');
    if (nameParts.length > 1) {
        item.name = nameParts[nameParts.length - 1].trim();
    }
    
    if (!item.name && item.tvgName) {
        item.name = item.tvgName;
    }
    
    return item;
}

function determineType(item) {
    const groupLower = (item.group || '').toLowerCase();
    const nameLower = (item.name || '').toLowerCase();
    
    const movieKeywords = ['filme', 'filmes', 'movie', 'movies', 'cinema', 'lançamento', 'dublado', 'legendado'];
    if (movieKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
        return 'movies';
    }
    
    const seriesKeywords = ['série', 'series', 'temporada', 'episódio', 'episode', 'season', 's0', 'e0'];
    if (seriesKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
        return 'series';
    }
    
    const channelKeywords = ['tv', 'canal', 'channel', 'ao vivo', 'live', 'hd', 'fhd', 'sd', '24h', 'aberto'];
    if (channelKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
        return 'channels';
    }
    
    return 'other';
}

function parseM3U8(content) {
    const lines = content.split('\n');
    const items = [];
    const categories = {};
    let currentItem = null;
    
    console.log(`Processando ${lines.length.toLocaleString()} linhas...`);
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            currentItem = parseExtInf(line);
        } else if (line && !line.startsWith('#') && currentItem) {
            currentItem.url = line;
            currentItem.id = items.length;
            currentItem.type = determineType(currentItem);
            
            items.push(currentItem);
            
            const category = currentItem.group || 'Outros';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(currentItem);
            
            currentItem = null;
        }
        
        if (i % 50000 === 0) {
            process.stdout.write(`\rProcessados: ${items.length.toLocaleString()} itens`);
        }
    }
    
    console.log(`\nTotal: ${items.length.toLocaleString()} itens em ${Object.keys(categories).length} categorias`);
    
    return { items, categories };
}

async function main() {
    try {
        console.log('=== NERDFLIX Cache Generator ===\n');
        
        const content = await fetchUrl(PLAYLIST_URL);
        
        const data = parseM3U8(content);
        
        console.log('\nGerando JSON...');
        const json = JSON.stringify(data);
        
        const sizeMB = (json.length / 1024 / 1024).toFixed(2);
        console.log(`Tamanho do JSON: ${sizeMB} MB`);
        
        fs.writeFileSync(OUTPUT_FILE, json);
        console.log(`\n✅ Arquivo salvo: ${OUTPUT_FILE}`);
        console.log('\nFaça upload deste arquivo para:');
        console.log('https://pub-f8e264b0f9ce4788ba346df77c54fef5.r2.dev/2024/nerdflix-cache.json');
        
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

main();
