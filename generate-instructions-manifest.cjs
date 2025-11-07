// Скрипт обходит папку с инструкциями и формирует manifest.json для фронтенда 
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Базовые пути до каталога ассетов и файла манифеста
const SRC_ASSETS = path.resolve(__dirname, 'src/assets');
const ROOT_DIR = path.join(SRC_ASSETS, 'instructions');
const OUT = path.join(ROOT_DIR, 'manifest.json');

// Игнорируем скрытые и временные файлы (например, ~ или .gitkeep) 
function isHidden(name) {
    return name.startsWith('.') || name.startsWith('~$') || name.startsWith('~');
}

// Если найден .doc, пытаемся сконвертировать его в .docx через soffice
function tryConvertDocToDocx(absPath) {
    try {
        const sofficeCmd = 'soffice';
        const outDir = path.dirname(absPath);
        execSync(`${sofficeCmd} --headless --convert-to docx --outdir "${outDir}" "${absPath}"`, { stdio: 'ignore' });

        const base = path.basename(absPath, path.extname(absPath));
        const converted = path.join(outDir, `${base}.docx`);
        if (fs.existsSync(converted)) {
            return converted;
        }
    } catch {
        // soffice not installed or conversion failed; ignore and fall back to the source file
    }
    return null;
}

// Рекурсивно строим структуру папок и файлов, собирая метаданные для клиента 
function walk(absDir, relDir = 'instructions') {
    const entries = fs.existsSync(absDir)
        ? fs.readdirSync(absDir, { withFileTypes: true })
        : [];

    const folders = [];
    const files = [];

    for (const entry of entries) {
        if (isHidden(entry.name)) continue;

        const abs = path.join(absDir, entry.name);
        const relPosix = path.posix.join(relDir, entry.name);
        const asAsset = `assets/${relPosix}`;

        if (entry.isDirectory()) {
            folders.push({
                name: entry.name,
                type: 'folder',
                path: asAsset,
                children: walk(abs, relPosix),
            });
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const stats = fs.statSync(abs);
        const ext = path.extname(entry.name).slice(1).toLowerCase();

        let convertedPath;
        if (ext === 'doc') {
            const convertedAbs = tryConvertDocToDocx(abs);
            if (convertedAbs) {
                const relConverted = path.relative(SRC_ASSETS, convertedAbs).split(path.sep).join('/');
                convertedPath = `assets/${relConverted}`;
            }
        }

        files.push({
            name: entry.name,
            type: 'file',
            path: asAsset,
            ext,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            mime: require('mime-types').lookup(abs) || 'application/octet-stream', // Определяем MIME-тип для предпросмотра
            readable: ['txt', 'md', 'json', 'log', 'csv', 'xml', 'ini', 'yml', 'yaml'].includes(ext),
            convertedPath: convertedPath || undefined,
        });
    }

    const collator = new Intl.Collator('ru-RU', { numeric: true, sensitivity: 'base' });
    folders.sort((a, b) => collator.compare(a.name, b.name));
    files.sort((a, b) => collator.compare(a.name, b.name));
    return [...folders, ...files];
}

if (!fs.existsSync(ROOT_DIR)) {
    fs.mkdirSync(ROOT_DIR, { recursive: true }); // Гарантируем, что корневой каталог инструкций существует //
}

// Формируем дерево и сохраняем его в manifest.json
const tree = walk(ROOT_DIR);
fs.writeFileSync(OUT, JSON.stringify(tree, null, 2), 'utf8'); // Пишем с отступами, чтобы было удобно читать

// Подсчитываем количество узлов для информативного лога 
function countNodes(nodes) {
    return nodes.reduce((total, node) => total + 1 + (node.children ? countNodes(node.children) : 0), 0);
}

console.log(`\u2714 instructions-manifest.json generated (${countNodes(tree)} nodes) -> ${path.relative(process.cwd(), OUT)}`); // Сообщаем в консоль, сколько элементов попало в манифест

