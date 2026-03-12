/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            /* Recurse into a subdirectory */
            results = results.concat(walk(file));
        } else { 
            /* Is a file */
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // We want to replace "Class {varName}" with "{String(varName || '').toLowerCase().startsWith('class') ? varName : 'Class ' + varName}"
    const regex = /Class \{([a-zA-Z0-9_.\?]+)\}/g;
    if (regex.test(content)) {
        content = content.replace(regex, (match, p1) => {
            return `{String(${p1} || '').toLowerCase().startsWith('class') ? ${p1} : 'Class ' + ${p1}}`;
        });
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
        changed++;
    }
});

console.log(`Updated ${changed} files.`);
