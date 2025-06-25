import markdownit from 'markdown-it';
import mkImport from '@vscode/markdown-it-katex'; const mk = mkImport.default || mkImport;
import hljs from 'highlight.js';

const md = new markdownit({
    highlight: function (str) {
        return hljs.highlightAuto(str).value;
    }
});

// Override default code block rendering
md.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const langName = token.info.trim().split(/\s+/g)[0];
    const highlighted = hljs.highlightAuto(token.content).value;

    return `
    <div class="code-block">
        <div class="code-block-top-bar">
            <span class="code-block-language">${langName || 'plaintext'}</span>
			<div class="code-block-buttons">
				<span class="copy-message" style="visibility: hidden;">Copied</span>
				<button class="icon-button code-block-button" onclick="copyCode(this.closest('.code-block'))" data-tooltip="Copy code block">
                    <svg xmlns="http://www.w3.org/2000/svg" class="heroicon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-label="Copy">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
                    </svg>
				</button>
			</div>
        </div>
        <code>${highlighted}</code>
    </div>`;
};

md.use(mk, { throwOnError: false, output: 'mathml' });

export function renderMarkdown(content, artifactDataMap = {}) {
    if (!content) return null;
    let renderedHtml = md.render(
        content
            .replace(/\\\[/g, '$$$')
            .replace(/\\\]/g, '$$$')
            .replace(/\\\(/g, '$$')
            .replace(/\\\)/g, '$$')
    );
    if (!renderedHtml) return null;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderedHtml;

    // Wrap tables with div.table-container
    wrapper.querySelectorAll('table').forEach(table => {
        const container = document.createElement('div');
        container.className = 'table-container';
        table.parentNode.insertBefore(container, table);
        container.appendChild(table);
    });

    // Process artifact links: insert buttons and remove original anchors
    Array.from(wrapper.querySelectorAll('a[href]')).forEach(a => {
        const href = a.getAttribute('href');
        const match = href.match(/\d+/);
        if (!match) return;
        const artifactId = Number(match[0]);
        const artifact = artifactDataMap[artifactId] || {};
        const title = (artifact.title || '').trim();
        const is_chart = Boolean(artifact.is_chart);
        const description = artifact.description || '';

        // Build icon SVG based on artifact type
        const iconSvg = is_chart ? `
            <svg xmlns="http://www.w3.org/2000/svg" class="heroicon heroicon-xxl color-mode-40" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" aria-label="Chart icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>` : `
            <svg xmlns="http://www.w3.org/2000/svg" class="heroicon heroicon-xxl color-mode-40" fill="none" viewBox="0 0 24 24" stroke-width="1" stroke="currentColor" aria-label="Table icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
            </svg>`;

        // HTML for the artifact button
        const btnHtml = `
            <button class="artifact-button-final-message" onclick="window.dispatchEvent(new CustomEvent('showArtifact', { detail: { artifactId: ${artifactId} } }))">
                <div class="artifact-button-final-message-content">
                    <span class="artifact-button-final-message-title">${title}</span>
                    <span class="artifact-button-final-message-description">${description}</span>
                </div>
                ${iconSvg}
            </button>
        `;

        // Insert button after the block-level container
        const block = a.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, table, div') || a;
        if (block.parentNode) block.insertAdjacentHTML('afterend', btnHtml);

        // Remove the original anchor and any trailing <br>
        const next = a.nextSibling;
        a.remove();
        if (next && next.nodeType === Node.ELEMENT_NODE && next.tagName.toLowerCase() === 'br') next.remove();

        // Auto-open behaviour
        if (!window.autoOpenedArtifacts) window.autoOpenedArtifacts = [];
        if (!window.autoOpenedArtifacts.includes(artifactId)) {
            window.autoOpenedArtifacts.push(artifactId);
            setTimeout(() => window.dispatchEvent(new CustomEvent('showArtifact', { detail: { artifactId } })), 0);
        }
    });

    // Clean up empty paragraphs left behind
    wrapper.querySelectorAll('p').forEach(p => { if (p.textContent.trim() === '' && p.parentNode) p.remove(); });

    renderedHtml = wrapper.innerHTML;

    return {
        __html: renderedHtml
    };
}