const fs = require('fs');
const content = fs.readFileSync('CanaisBR01.m3u8', 'utf8');
const lines = content.split('\n');
const groups = [];
const items = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF')) {
        const nameMatch = line.match(/tvg-name="([^"]*)"/);
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        const groupMatch = line.match(/group-title="([^"]*)"/);
        
        const name = nameMatch ? nameMatch[1] : 'Sem nome';
        const logo = logoMatch ? logoMatch[1] : '';
        const group = groupMatch ? groupMatch[1] : 'Geral';
        
        let groupIndex = groups.indexOf(group);
        if (groupIndex === -1) {
            groups.push(group);
            groupIndex = groups.length - 1;
        }
        
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        if (nextLine && !nextLine.startsWith('#')) {
            items.push({ n: name, g: groupIndex, l: logo, u: nextLine });
        }
    }
}

const data = { g: groups, i: items };
fs.writeFileSync('canais-br.json', JSON.stringify(data));
console.log('Gerado: ' + items.length + ' canais, ' + groups.length + ' grupo(s)');
console.log('Grupos:', groups);
