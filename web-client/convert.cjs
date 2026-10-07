const fs = require('fs');

const html = fs.readFileSync('../stitch_eon_cloud_workspace/code.html', 'utf8');
const bodyStart = html.indexOf('<body');
const bodyEnd = html.indexOf('</body>');

let body = html.substring(bodyStart, bodyEnd + 7);

// Extract inner contents of body
const startIdx = body.indexOf('>') + 1;
const endIdx = body.lastIndexOf('</body>');
body = body.substring(startIdx, endIdx);

// Convert to React component
body = body.replace(/class=/g, 'className=');
body = body.replace(/<!--(.*?)-->/gs, '{/* $1 */}');
body = body.replace(/<img(.*?)>/g, '<img$1 />');
body = body.replace(/<input(.*?)>/g, '<input$1 />');
body = body.replace(/style="(.*?)"/g, (match, styleString) => {
    // Basic inline style to object converter
    const styles = styleString.split(';').filter(s => s.trim().length > 0);
    const obj = {};
    styles.forEach(s => {
        const [key, value] = s.split(':');
        if (key && value) {
            const camelKey = key.trim().replace(/-([a-z])/g, (m, letter) => letter.toUpperCase());
            obj[camelKey] = value.trim();
        }
    });
    return `style={${JSON.stringify(obj)}}`;
});
// Remove any weird empty strings or invalid react props
body = body.replace(/data-alt=/g, 'alt=');
body = body.replace(/for=/g, 'htmlFor=');
body = body.replace(/tabindex=/g, 'tabIndex=');

const appJsx = `
import React from 'react';
import './index.css';

function App() {
  return (
    <>
      ${body}
    </>
  );
}

export default App;
`;

fs.writeFileSync('src/App.jsx', appJsx);
console.log("Converted code.html to App.jsx");
