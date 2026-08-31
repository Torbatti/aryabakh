    document.addEventListener('DOMContentLoaded', () => {
        // Select all <pre> elements that contain a <code> block
        const codeBlocks = document.querySelectorAll('pre > code');

        codeBlocks.forEach((codeEl) => {
            const preEl = codeEl.parentElement;

            // Make sure the <pre> can position the button absolutely
            preEl.style.position = 'relative';

            // Create the copy button
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.type = 'div';
            button.textContent = 'Copy';

            // Basic inline styling (feel free to move to CSS)
            Object.assign(button.style, {
                position: 'absolute',
                top: '8px',
                right: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                //   background: '#333',
                //   color: '#fff',
                //   border: 'none',
                //   borderRadius: '4px',
                cursor: 'pointer',
                //   opacity: '0.8',
            });

            button.addEventListener('click', async () => {
                const codeText = codeEl.innerText;

                try {
                    // Preferred method (requires secure context: https or localhost)
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(codeText);
                    } else {
                        // Fallback for older/non-secure contexts
                        fallbackCopyTextToClipboard(codeText);
                    }

                    button.textContent = 'Copied!';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                    button.textContent = 'Error';
                    setTimeout(() => {
                        button.textContent = 'Copy';
                    }, 2000);
                }
            });

            preEl.appendChild(button);
        });
    });

    // Fallback copy method using a temporary textarea + execCommand
    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Avoid scrolling to bottom and keep it invisible
        Object.assign(textArea.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '2em',
            height: '2em',
            padding: '0',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            background: 'transparent',
        });

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback: unable to copy', err);
        }

        document.body.removeChild(textArea);
    }
