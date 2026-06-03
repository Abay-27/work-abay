
import fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf-8');
const lines = content.split('\n');

let braceCount = 0;
let inAppContent = false;
let startLine = -1;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('function AppContent()')) {
        inAppContent = true;
        startLine = i + 1;
    }
    
    if (inAppContent) {
        for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
        }
        
        if (braceCount === 0 && startLine !== -1 && i > startLine) {
            console.log(`AppContent ends on line ${i + 1}`);
            break;
        }
    }
}
