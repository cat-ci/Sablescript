            const runButton = document.getElementById('runButton');
            runButton.addEventListener('click', function () {
                const codeContent = editor.getValue();
                var newWindow = window.open("", "miniWindow", "width=600,height=400,resizable=yes");

                if (newWindow) {
                    newWindow.document.write(codeContent);
                    newWindow.document.close();
                } else {
                    alert("Popup blocked! Please allow pop-ups for this site.");
                }
            });
            function updateEncodingStatus() {
                let encoding = "UTF-8";
                let lineEnding = "Unknown";

                if (navigator.userAgent.indexOf("Windows") !== -1) {
                    lineEnding = "Windows (CR LF)";
                } else if (navigator.userAgent.indexOf("Mac") !== -1) {
                    lineEnding = "Mac (CR)";
                } else if (navigator.userAgent.indexOf("Linux") !== -1 || navigator.userAgent.indexOf("X11") !== -1) {
                    lineEnding = "Linux/Unix (LF)";
                }

                document.getElementById("statusEncoding").innerText = `${encoding} | ${lineEnding}`;
            }

            // Run the function on page load
            window.onload = updateEncodingStatus;


            let tabs = [];
            let currentTabId = null;

            function getModeFromExtension(ext) {
                switch (ext) {
                    case 'html': return 'htmlmixed';
                    case 'css':  return 'css';
                    case 'js':   return 'javascript';
                    case 'py':   return 'python';
                    case 'php':  return 'php';
                    case 'c':
                    case 'cpp':
                    case 'java': return 'text/x-c++src';
                    default:     return 'plaintext';
                }
            }

            function createNewTab(baseName = 'untitled', extension = 'txt', content = '') {
                const newId = Date.now();
                tabs.push({ id: newId, name: baseName, extension, content });
                return newId;
            }

            function renderTabs() {
                const tabsContainer = document.getElementById('tabsContainer');
                tabsContainer.innerHTML = '';

                tabs.forEach((tab) => {
                    const tabEl = document.createElement('div');
                    tabEl.className = 'tab-item' + (tab.id === currentTabId ? ' active' : '');
                    tabEl.setAttribute('data-id', tab.id);


                    const titleSpan = document.createElement('span');
                    titleSpan.className = 'tab-title';
                    titleSpan.textContent = tab.name + '.' + tab.extension;
                    tabEl.appendChild(titleSpan);


                    const renameInput = document.createElement('input');
                    renameInput.type = 'text';
                    renameInput.className = 'tab-rename-input';
                    renameInput.value = tab.name;
                    tabEl.appendChild(renameInput);


                    const closeSpan = document.createElement('span');
                    closeSpan.className = 'tab-close';
                    closeSpan.textContent = 'x';
                    tabEl.appendChild(closeSpan);


                    tabEl.addEventListener('click', (e) => {
                        if (e.target === closeSpan) return;
                        switchToTab(tab.id);
                    });

                    titleSpan.addEventListener('dblclick', (e) => {
                        e.stopPropagation();
                        startTabRename(tab.id, tabEl);
                    });

                    closeSpan.addEventListener('click', (e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                    });


                    renameInput.addEventListener('blur', () => {
                        finishTabRename(tab.id, renameInput.value);
                    });
                    renameInput.addEventListener('keydown', (evt) => {
                        if (evt.key === 'Enter') {
                            evt.preventDefault();
                            finishTabRename(tab.id, renameInput.value);
                        }
                    });

                    tabsContainer.appendChild(tabEl);
                });
            }

            function startTabRename(tabId, tabEl) {
                const titleSpan = tabEl.querySelector('.tab-title');
                const renameInput = tabEl.querySelector('.tab-rename-input');
                titleSpan.style.display = 'none';
                renameInput.style.display = 'inline-block';
                renameInput.focus();
                renameInput.select();
            }

            function finishTabRename(tabId, newName) {
                const tab = tabs.find(t => t.id === tabId);
                if (!tab) return;
                newName = newName.trim() || 'untitled';
                tab.name = newName;
                renderTabs();

                if (tabId === currentTabId) {
                    filenameBaseLabel.textContent = tab.name;
                    filenameBaseInput.value = tab.name;
                }
            }

            function closeTab(tabId) {
                const index = tabs.findIndex(t => t.id === tabId);
                if (index === -1) return;
                tabs.splice(index, 1);

                if (tabId === currentTabId) {

                    if (tabs.length > 0) {
                        switchToTab(tabs[tabs.length - 1].id);
                    } else {

                        currentTabId = null;
                        const newTabId = createNewTab();
                        switchToTab(newTabId);
                    }
                } else {
                    renderTabs();
                }
            }

            function switchToTab(tabId) {

                if (currentTabId !== null) {
                    const currentTab = tabs.find(t => t.id === currentTabId);
                    if (currentTab) {
                        currentTab.content = editor.getValue();
                        currentTab.name = filenameBaseInput.value.trim() || 'untitled';
                        currentTab.extension = filenameExt.value;
                    }
                }
                currentTabId = tabId;
                const newTab = tabs.find(t => t.id === currentTabId);
                if (!newTab) return;

                editor.setValue(newTab.content || '');
                editor.setOption('mode', getModeFromExtension(newTab.extension));
                filenameBaseLabel.textContent = newTab.name;
                filenameBaseInput.value = newTab.name;
                filenameExt.value = newTab.extension;

                renderTabs();
            }


            const editor = CodeMirror.fromTextArea(document.getElementById('codeEditor'), {
                lineNumbers: true,
                mode: 'plaintext',
                theme: 'custom-dark',
                tabSize: 4,
                indentUnit: 4,
                autoCloseTags: true,
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',

                    'Tab': function(cm) {
                        if (cm.somethingSelected()) {
                            cm.indentSelection('add');
                        } else {
                            cm.replaceSelection('\t');
                        }
                    },

                    'Shift-Tab': function(cm) {
                        if (cm.somethingSelected()) {
                            cm.indentSelection('subtract');
                        }
                    }
                }
            });




            editor.on('inputRead', function(cm, change) {
                let mode = cm.getOption('mode');
                let cursor = cm.getCursor();
                let token = cm.getTokenAt(cursor);
                let shouldAutocomplete = false;

                if (mode === 'htmlmixed') {
                    if (change.text[0] === '<' || token.type === 'tag' || token.type === 'attribute') {
                        shouldAutocomplete = true;
                    }

                    if (token.state.context && token.state.context.tagName === "script") {
                        cm.setOption("mode", "javascript");
                        shouldAutocomplete = true;
                    }

                    if (token.state.context && token.state.context.tagName === "style") {
                        cm.setOption("mode", "css");
                        shouldAutocomplete = true;
                    }
                }
                else if (mode === 'javascript') {
                    if (/\w|\./.test(change.text[0])) {
                        shouldAutocomplete = true;
                    }
                }
                else if (mode === 'css') {
                    if (token.type === 'property' || token.type === 'variable-3' || token.type === 'keyword' || change.text[0] === ':') {
                        shouldAutocomplete = true;
                    }
                }
                else if (mode === 'python') {
                    if (/\w|\./.test(change.text[0])) {
                        shouldAutocomplete = true;
                    }
                }
                else if (mode === 'php') {
                    if (token.type === 'variable' || change.text[0] === '$' || token.type === 'keyword') {
                        shouldAutocomplete = true;
                    }
                }

                if (shouldAutocomplete) {
                    CodeMirror.commands.autocomplete(cm, null, { completeSingle: false });
                }
            });

            const statusText = document.getElementById('statusText');
            editor.on('cursorActivity', function() {
                const pos = editor.getCursor();
                statusText.textContent = `Line ${pos.line + 1}, Col ${pos.ch + 1}`;
            });


            const btnNew = document.getElementById('btnNew');
            const btnLoad = document.getElementById('btnLoad');
            const btnSave = document.getElementById('btnSave');
            const btnRun = document.getElementById('btnRun');
            const fileInput = document.getElementById('fileInput');

            const filenameBaseLabel = document.getElementById('filenameBaseLabel');
            const filenameBaseInput = document.getElementById('filenameBaseInput');
            const filenameExt = document.getElementById('filenameExt');


            filenameBaseLabel.addEventListener('dblclick', () => {
                filenameBaseLabel.style.display = 'none';
                filenameBaseInput.style.display = 'inline-block';
                filenameBaseInput.focus();
                filenameBaseInput.select();
            });
            filenameBaseInput.addEventListener('blur', () => {
                applyTopBarRename();
            });
            filenameBaseInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyTopBarRename();
                }
            });
            function applyTopBarRename() {
                const newName = filenameBaseInput.value.trim() || 'untitled';
                filenameBaseLabel.textContent = newName;
                filenameBaseInput.style.display = 'none';
                filenameBaseLabel.style.display = 'inline-block';
                if (currentTabId !== null) {
                    const tab = tabs.find(t => t.id === currentTabId);
                    if (tab) {
                        tab.name = newName;
                        renderTabs();
                    }
                }
            }


            filenameExt.addEventListener('change', () => {
                if (currentTabId === null) return;
                const currentTab = tabs.find(t => t.id === currentTabId);
                if (currentTab) {
                    currentTab.extension = filenameExt.value;
                    editor.setOption('mode', getModeFromExtension(currentTab.extension));
                    renderTabs();
                }
            });


            function createAndSwitchToNewTab() {
                const newTabId = createNewTab();
                switchToTab(newTabId);
            }


            btnNew.addEventListener('click', createAndSwitchToNewTab);


            btnLoad.addEventListener('click', () => {
                fileInput.click();
            });
            fileInput.addEventListener('change', function() {
                const file = this.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const parts = file.name.split('.');
                    const baseName = parts.slice(0, -1).join('.') || 'untitled';
                    const extension = parts.slice(-1)[0] || 'txt';
                    const newTabId = createNewTab(baseName, extension, e.target.result);
                    switchToTab(newTabId);
                };
                reader.readAsText(file);
                this.value = '';
            });


            btnSave.addEventListener('click', saveFile);
            function saveFile() {
                if (currentTabId === null) return;
                const tab = tabs.find(t => t.id === currentTabId);
                if (!tab) return;
                tab.content = editor.getValue();
                tab.name = filenameBaseInput.value.trim() || 'untitled';
                tab.extension = filenameExt.value;

                const textToSave = tab.content;
                const blob = new Blob([textToSave], { type: 'text/plain' });
                const filename = `${tab.name}.${tab.extension}`;

                const tempLink = document.createElement('a');
                tempLink.href = URL.createObjectURL(blob);
                tempLink.download = filename;
                tempLink.click();
                URL.revokeObjectURL(tempLink.href);
            }


            btnRun.addEventListener("click", function() {
                var codeContent = editor.getValue();


                var newWindow = window.open("", "miniWindow", "width=600,height=400,resizable=yes");

                if (newWindow) {
                    newWindow.document.write(codeContent);
                    newWindow.document.close();
                } else {
                    alert("Popup blocked! Please allow pop-ups for this site.");
                }
            });



            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    saveFile();
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
                    e.preventDefault();
                    fileInput.click();
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                    e.preventDefault();
                    createAndSwitchToNewTab();
                }
            });


            (function init() {
                const initialTabId = createNewTab('untitled', 'txt', '');
                switchToTab(initialTabId);
            })();
        
            window.addEventListener("beforeunload", (event) => {
                event.preventDefault();
                event.returnValue = "";
            });
        
            document.addEventListener("DOMContentLoaded", function () {
                const select = document.getElementById("filenameExt");
                const tabContainer = document.getElementById("tabContainer");
                const tabs = document.querySelectorAll(".tab");
                const groups = document.querySelectorAll(".btn-group");

                function showGroup(groupName) {
                    groups.forEach(group => {
                        group.style.display = "none";
                    });

                    if (groupName === "html") {
                        tabContainer.style.display = "block";
                        document.querySelector(".btn-group.html").style.display = "flex";
                    } else {
                        tabContainer.style.display = "none";
                        const activeGroup = document.querySelector(`.btn-group.${groupName}`);
                        if (activeGroup) activeGroup.style.display = "flex";
                    }
                }

                select.addEventListener("change", function () {
                    showGroup(this.value);
                });

                tabs.forEach(tab => {
                    tab.addEventListener("click", function () {
                        tabs.forEach(t => t.classList.remove("active"));
                        this.classList.add("active");

                        groups.forEach(group => group.style.display = "none");
                        document.querySelector(`.btn-group.${this.dataset.tab}`).style.display = "flex";
                    });
                });

                showGroup(select.value);
            });
        
            editor.on("change", function () {
                const cmWrapper = document.querySelector(".CodeMirror");
                cmWrapper.style.minWidth = "100%";
                cmWrapper.style.maxWidth = "none";
            });

            document.addEventListener("DOMContentLoaded", function () {
                const sidebar = document.querySelector(".sidebar");
                const toggleButton = document.getElementById("sidebar");
                const copyButton = document.getElementById("copy");
                const repairButton = document.getElementById("repair");

                let sidebarVisible = true;

                toggleButton.addEventListener("click", function () {
                    sidebarVisible = !sidebarVisible;
                    sidebar.style.display = sidebarVisible ? "flex" : "none";
                });

                copyButton.addEventListener("click", function () {
                    if (!editor) return;

                    const currentContent = editor.getValue();

                    navigator.clipboard.writeText(currentContent).then(() => {
                    }).catch(err => {
                        console.error("Failed to copy: ", err);
                    });
                });

                repairButton.addEventListener("click", function () {
                    if (!editor) return;

                    editor.operation(() => {
                        let lines = [];
                        for (let i = 0; i < editor.lineCount(); i++) {
                            let line = editor.getLine(i).trim();
                            lines.push(line);
                        }

                        let formattedCode = lines.join("\n");

                        editor.replaceRange(formattedCode, { line: 0, ch: 0 }, { line: editor.lineCount(), ch: 0 });

                        for (let i = 0; i < editor.lineCount(); i++) {
                            editor.indentLine(i, "smart");
                        }
                    });

                });
            });


            function updateEditorWidth() {
                const editorContainer = document.querySelector(".editor-container");
                const sidebar = document.querySelector(".sidebar");
                const codeMirrorScroll = document.querySelector(".CodeMirror-scroll");

                if (!editorContainer || !codeMirrorScroll) return;

                let windowWidth = window.innerWidth;

                let sidebarWidth = sidebar && window.getComputedStyle(sidebar).display !== "none"
                ? sidebar.offsetWidth
                : 0;

                let availableWidth = windowWidth - sidebarWidth;
                codeMirrorScroll.style.maxWidth = `${availableWidth}px`;
                codeMirrorScroll.style.overflowX = "auto";
            }

            window.addEventListener("resize", updateEditorWidth);
            window.addEventListener("DOMContentLoaded", updateEditorWidth);

            document.getElementById("sidebar").addEventListener("click", function () {
                setTimeout(updateEditorWidth, 300);
            });

            document.addEventListener("DOMContentLoaded", function () {
                const fileMenu = document.querySelector(".file .dropdown-content");
                const editMenu = document.querySelector(".edit .dropdown-content");
                const fileInput = document.getElementById("fileInput");

                function createAndSwitchToNewTab() {
                    const newTabId = createNewTab();
                    switchToTab(newTabId);
                }

                function openFile() {
                    fileInput.click();
                }

                fileInput.addEventListener("change", function () {
                    const file = this.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const parts = file.name.split(".");
                        const baseName = parts.slice(0, -1).join(".") || "untitled";
                        const extension = parts.slice(-1)[0] || "txt";
                        const newTabId = createNewTab(baseName, extension, e.target.result);
                        switchToTab(newTabId);
                    };
                    reader.readAsText(file);
                    this.value = "";
                });

                function saveFile() {
                    if (currentTabId === null) return;
                    const tab = tabs.find(t => t.id === currentTabId);
                    if (!tab) return;
                    tab.content = editor.getValue();
                    tab.name = filenameBaseInput.value.trim() || "untitled";
                    tab.extension = filenameExt.value;

                    const textToSave = tab.content;
                    const blob = new Blob([textToSave], { type: "text/plain" });
                    const filename = `${tab.name}.${tab.extension}`;

                    const tempLink = document.createElement("a");
                    tempLink.href = URL.createObjectURL(blob);
                    tempLink.download = filename;
                    tempLink.click();
                    URL.revokeObjectURL(tempLink.href);
                }

                function saveFileAs() {
                    if (currentTabId === null) return;
                    const tab = tabs.find(t => t.id === currentTabId);
                    if (!tab) return;

                    const textToSave = editor.getValue();
                    const blob = new Blob([textToSave], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${tab.name}.${tab.extension}`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                }

                function undoEdit() {
                    editor.undo();
                }

                function redoEdit() {
                    editor.redo();
                }

                function copyText() {
                    navigator.clipboard.writeText(editor.getSelection());
                }

                function copyAllText() {
                    navigator.clipboard.writeText(editor.getValue());
                }

                function pasteText() {
                    navigator.clipboard.readText().then(text => {
                        editor.replaceSelection(text);
                    });
                }

                function selectAllText() {
                    editor.execCommand("selectAll");
                }

                function repairIndentation() {
                    editor.execCommand("indentAuto");
                }

                fileMenu.querySelector("a:nth-child(1)").addEventListener("click", createAndSwitchToNewTab);
                fileMenu.querySelector("a:nth-child(2)").addEventListener("click", openFile);
                fileMenu.querySelector("a:nth-child(3)").addEventListener("click", saveFile);
                fileMenu.querySelector("a:nth-child(4)").addEventListener("click", saveFileAs);

                editMenu.querySelector("a:nth-child(1)").addEventListener("click", undoEdit);
                editMenu.querySelector("a:nth-child(2)").addEventListener("click", redoEdit);
                editMenu.querySelector("a:nth-child(4)").addEventListener("click", copyText);
                editMenu.querySelector("a:nth-child(5)").addEventListener("click", copyAllText);
                editMenu.querySelector("a:nth-child(6)").addEventListener("click", pasteText);
                editMenu.querySelector("a:nth-child(7)").addEventListener("click", selectAllText);
                editMenu.querySelector("a:nth-child(9)").addEventListener("click", repairIndentation);
            });
