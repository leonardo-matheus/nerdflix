/**
 * Gerador de cache otimizado para NERDFLIX
 * Gera JSON compacto para carregamento ultra-rápido
 * 
 * Uso: node generate-cache.js
 * Depois faça upload do nerdflix-data.json para o R2
 */

const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const PLAYLIST_URL = 'https://pub-f8e264b0f9ce4788ba346df77c54fef5.r2.dev/2024/ListaVip.m3u8';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        console.log('📥 Baixando playlist...');
        const startTime = Date.now();
        
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return fetchUrl(response.headers.location).then(resolve).catch(reject);
            }
            
            let data = '';
            const totalSize = parseInt(response.headers['content-length'] || 0);
            let downloaded = 0;
            
            response.on('data', (chunk) => {
                data += chunk;
                downloaded += chunk.length;
                const percent = totalSize ? ((downloaded / totalSize) * 100).toFixed(1) : '?';
                process.stdout.write(`\r   Progresso: ${percent}% (${(downloaded/1024/1024).toFixed(1)} MB)`);
            });
            
            response.on('end', () => {
                console.log(`\n   Concluído em ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
                resolve(data);
            });
        }).on('error', reject);
    });
}

function parsePlaylist(content) {
    console.log('\n⚙️  Processando...');
    const lines = content.split('\n');
    const items = [];
    const groups = new Map();
    let currentItem = null;
    let groupId = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            // Parse minimal data
            const item = {};
            
            // Name (last part after comma)
            const nameParts = line.split(',');
            if (nameParts.length > 1) {
                item.n = nameParts[nameParts.length - 1].trim();
            }
            
            // Group
            const groupMatch = line.match(/group-title="([^"]*)"/);
            if (groupMatch && groupMatch[1]) {
                const groupName = groupMatch[1];
                if (!groups.has(groupName)) {
                    groups.set(groupName, groupId++);
                }
                item.g = groups.get(groupName);
            }
            
            // Logo (only if exists)
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            if (logoMatch && logoMatch[1]) {
                item.l = logoMatch[1];
            }
            
            currentItem = item;
        } else if (line && !line.startsWith('#') && currentItem) {
            currentItem.u = line;
            items.push(currentItem);
            currentItem = null;
        }
        
        if (i % 100000 === 0 && i > 0) {
            process.stdout.write(`\r   ${items.length.toLocaleString()} itens processados...`);
        }
    }
    
    // Convert groups map to array
    const groupsArray = Array.from(groups.keys());
    
    console.log(`\n   ✅ ${items.length.toLocaleString()} itens em ${groupsArray.length} categorias`);
    
    return { g: groupsArray, i: items };
}

async function main() {
    console.log('🎬 NERDFLIX - Gerador de Cache Otimizado\n');
    
    try {
        const content = await fetchUrl(PLAYLIST_URL);
        const data = parsePlaylist(content);
        
        console.log('\n💾 Gerando arquivos...');
        
        // JSON normal
        const json = JSON.stringify(data);
        const jsonSize = (json.length / 1024 / 1024).toFixed(2);
        fs.writeFileSync('nerdflix-data.json', json);
        console.log(`   📄 nerdflix-data.json: ${jsonSize} MB`);
        
        // JSON compactado com gzip
        const gzipped = zlib.gzipSync(json, { level: 9 });
        const gzipSize = (gzipped.length / 1024 / 1024).toFixed(2);
        fs.writeFileSync('nerdflix-data.json.gz', gzipped);
        console.log(`   📦 nerdflix-data.json.gz: ${gzipSize} MB`);
        
        console.log('\n✅ Concluído!');
        console.log('\n📤 Faça upload para o R2:');
        console.log('   https://pub-f8e264b0f9ce4788ba346df77c54fef5.r2.dev/2024/nerdflix-data.json');
        console.log('\n   Ou use o arquivo .gz e configure Content-Encoding: gzip');
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

main();
