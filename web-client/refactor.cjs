const fs = require('fs');

const path = 'C:\\Users\\USER\\Desktop\\DATA WORK\\EON CLOUD\\web-client\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// The main content starts at `<main ...>` and ends at `</main>`.
const mainStart = content.indexOf('<main');
const mainEnd = content.lastIndexOf('</main>') + 7;

if (mainStart === -1 || mainEnd === -1) {
  console.error("Could not find main tags");
  process.exit(1);
}

let innerContent = content.substring(mainStart, mainEnd);

// Replace `<main className="...">` with just empty fragment or `<div>` 
// since Layout already provides `<main>`.
// Actually, Layout has `<main className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto overflow-x-hidden relative">`
// We can just strip the outer `<main>` tag from Dashboard content.
innerContent = innerContent.replace(/<main[^>]*>/, '').replace(/<\/main>$/, '');

const newContent = `import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import '../index.css';

function Dashboard() {
  return (
    <Layout>
      ${innerContent}
    </Layout>
  );
}

export default Dashboard;
`;

fs.writeFileSync(path, newContent);
console.log("Successfully refactored Dashboard.jsx");
