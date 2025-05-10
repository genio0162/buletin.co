import React, { useState, useRef, useEffect } from 'react';
import '../BuletinEditor.css';

const BuletinRichEditor: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [isAutosaved, setIsAutosaved] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [postType, setPostType] = useState<'free' | 'paid'>('free');
  const [customSlug, setCustomSlug] = useState<string>('');
  const [customSlugEnabled, setCustomSlugEnabled] = useState<boolean>(false);
  const [autosaveTimer, setAutosaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [hasPaidLine, setHasPaidLine] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(window.innerWidth < 768);
  // Add state for active tools
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const slug = customSlug || generateSlug(title);

  // Autosave functionality
  useEffect(() => {
    if (title || subtitle || editorRef.current?.innerHTML) {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
      
      const timer = setTimeout(() => {
        handleAutosave();
      }, 3000);
      
      setAutosaveTimer(timer);
    }
    
    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [title, subtitle]);

  // Listen to contenteditable changes for autosave
  useEffect(() => {
    const handleInput = () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
      
      const timer = setTimeout(() => {
        handleAutosave();
      }, 3000);
      
      setAutosaveTimer(timer);
      
      // When content changes, check for active formatting
      checkActiveFormatting();
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('input', handleInput);
    }

    return () => {
      if (editor) {
        editor.removeEventListener('input', handleInput);
      }
    };
  }, []);

  // Add mouseup and keyup listeners to detect active formatting after selection changes
  useEffect(() => {
    const handleSelectionChange = () => {
      checkActiveFormatting();
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('mouseup', handleSelectionChange);
      editor.addEventListener('keyup', handleSelectionChange);
      document.addEventListener('selectionchange', handleSelectionChange);
    }

    return () => {
      if (editor) {
        editor.removeEventListener('mouseup', handleSelectionChange);
        editor.removeEventListener('keyup', handleSelectionChange);
        document.removeEventListener('selectionchange', handleSelectionChange);
      }
    };
  }, []);

  // Default left alignment when editor is first clicked
  useEffect(() => {
    const editor = editorRef.current;
    
    if (editor) {
      const handleFocus = () => {
        if (!editor.innerHTML || editor.innerHTML.trim() === '') {
          document.execCommand('justifyLeft', false);
        }
        
        // Check active formatting on focus
        checkActiveFormatting();
      };
      
      editor.addEventListener('focus', handleFocus);
      
      return () => {
        editor.removeEventListener('focus', handleFocus);
      };
    }
  }, []);

  // Set mobile view on initial load and handle window resize
  useEffect(() => {
    const setMobileViewState = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // Set initial value
    setMobileViewState();
    
    // Add event listener
    window.addEventListener('resize', setMobileViewState);
    
    return () => {
      window.removeEventListener('resize', setMobileViewState);
    };
  }, []);

  // Close settings sidebar when in mobile view and window is resized
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && showSettings) {
        setShowSettings(false);
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showSettings]);

  // Function to check which formatting tools are active on the current selection
  const checkActiveFormatting = () => {
    const active: string[] = [];
    
    try {
      // Get the current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      // Check for basic formatting
      if (document.queryCommandState('bold')) active.push('bold');
      if (document.queryCommandState('italic')) active.push('italic');
      if (document.queryCommandState('underline')) active.push('underline');
      if (document.queryCommandState('strikeThrough')) active.push('strike');
      
      // Check alignment
      if (document.queryCommandState('justifyLeft')) active.push('align-left');
      if (document.queryCommandState('justifyCenter')) active.push('align-center');
      if (document.queryCommandState('justifyRight')) active.push('align-right');
      if (document.queryCommandState('justifyFull')) active.push('align-justify');
      
      // Check lists
      if (document.queryCommandState('insertUnorderedList')) active.push('bullet-list');
      if (document.queryCommandState('insertOrderedList')) active.push('numbered-list');
      
      // Check for headings, paragraphs, etc.
      const parentElement = selection.anchorNode?.parentElement;
      if (parentElement) {
        if (parentElement.closest('h1')) active.push('h1');
        if (parentElement.closest('h2')) active.push('h2');
        if (parentElement.closest('h3')) active.push('h3');
        if (parentElement.closest('p') && !active.includes('h1') && !active.includes('h2') && !active.includes('h3')) {
          active.push('paragraph');
        }
        if (parentElement.closest('blockquote')) active.push('quote');
        if (parentElement.closest('code') || parentElement.closest('pre')) active.push('code');
        
        // Check for checklists (custom)
        if (parentElement.closest('li') && parentElement.closest('li')?.querySelector('input[type="checkbox"]')) {
          active.push('check-list');
        }
      }
      
      // Check if focus mode is active
      if (document.body.classList.contains('focus-mode')) {
        active.push('focus-mode');
      }
    } catch (error) {
      console.error('Error checking active formatting:', error);
    }
    
    // Update state with active tools
    setActiveTools(active);
  };

  const handleAutosave = (): void => {
    console.log('Autosaving...', { 
      title, 
      subtitle, 
      content: editorRef.current?.innerHTML, 
      postType, 
      customSlug 
    });
    setIsAutosaved(true);
    
    setTimeout(() => {
      setIsAutosaved(false);
    }, 2000);
  };

  const handlePublish = () => {
    alert('Content published!');
    console.log({
      title,
      subtitle,
      content: editorRef.current?.innerHTML,
      postType,
      customSlug: customSlugEnabled ? customSlug : '',
      hasPaidLine
    });
  };

  const handleSaveAsDraft = () => {
    alert('Content saved as draft!');
    console.log({
      title,
      subtitle,
      content: editorRef.current?.innerHTML,
      postType,
      customSlug: customSlugEnabled ? customSlug : '',
      hasPaidLine
    });
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (window.innerWidth < 768) {
      document.body.classList.toggle('settings-open');
    }
  };

  const formatText = (format: string) => {
    if (!editorRef.current) return;
    
    // Save selection
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);
    
    if (!selection || !range) return;
    
    // Execute commands based on format
    switch(format) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strike':
        document.execCommand('strikeThrough', false);
        break;
      case 'align-left':
        document.execCommand('justifyLeft', false);
        break;
      case 'align-center':
        document.execCommand('justifyCenter', false);
        break;
      case 'align-right':
        document.execCommand('justifyRight', false);
        break;
      case 'align-justify':
        document.execCommand('justifyFull', false);
        break;
      case 'h1':
        document.execCommand('formatBlock', false, '<h1>');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, '<h2>');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, '<h3>');
        break;
      case 'paragraph':
        document.execCommand('formatBlock', false, '<p>');
        break;
      case 'bullet-list':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'numbered-list':
        document.execCommand('insertOrderedList', false);
        break;
      case 'check-list':
        // Custom for checklist (no native command)
        const listItem = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        listItem.appendChild(checkbox);
        
        if (selection.toString().trim()) {
          listItem.appendChild(document.createTextNode(selection.toString()));
          range.deleteContents();
          range.insertNode(listItem);
        } else {
          listItem.appendChild(document.createTextNode('New task'));
          range.insertNode(listItem);
        }
        break;
      case 'quote':
        document.execCommand('formatBlock', false, '<blockquote>');
        break;
      case 'code':
        const isMultiline = selection.toString().includes('\n');
        if (isMultiline) {
          const preElement = document.createElement('pre');
          const codeElement = document.createElement('code');
          codeElement.textContent = selection.toString();
          preElement.appendChild(codeElement);
          range.deleteContents();
          range.insertNode(preElement);
        } else {
          const codeElement = document.createElement('code');
          codeElement.textContent = selection.toString() || 'code';
          range.deleteContents();
          range.insertNode(codeElement);
        }
        break;
      case 'link':
        const url = prompt('Enter URL:', 'https://');
        if (url) {
          document.execCommand('createLink', false, url);
        }
        break;
      case 'image':
        const imgUrl = prompt('Enter image URL:', 'https://');
        if (imgUrl) {
          document.execCommand('insertImage', false, imgUrl);
        }
        break;
      case 'table':
        const tableHTML = `
          <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse">
            <tr>
              <th>Header 1</th>
              <th>Header 2</th>
            </tr>
            <tr>
              <td>Cell 1</td>
              <td>Cell 2</td>
            </tr>
          </table>
        `;
        document.execCommand('insertHTML', false, tableHTML);
        break;
      case 'indent':
        document.execCommand('indent', false);
        break;
      case 'outdent':
        document.execCommand('outdent', false);
        break;
      case 'subscript':
        document.execCommand('subscript', false);
        break;
      case 'superscript':
        document.execCommand('superscript', false);
        break;
      case 'focus-mode':
        document.body.classList.toggle('focus-mode');
        break;
      default:
        break;
    }
    
    // After formatting, check which tools are active
    setTimeout(checkActiveFormatting, 0);
    
    editorRef.current.focus();
  };

  const insertPaidContentLine = () => {
    if (!editorRef.current || hasPaidLine) return;
      
    // Selalu sisipkan di akhir editor untuk konsistensi
    const editor = editorRef.current;
    
    // Create div with paid content line
    const paidLineDiv = document.createElement('div');
    paidLineDiv.className = 'paid-content-line';
    paidLineDiv.innerHTML = `
      <div class="paid-content-divider">
        <div class="divider-line"></div>
        <div class="paid-content-label">
          <span class="paid-icon"></span>
          PAID CONTENTS BELOW THIS LINE
        </div>
        <div class="divider-line"></div>
      </div>
    `;
    
    // Create div for paid content after the line
    const paidContentDiv = document.createElement('div');
    paidContentDiv.className = 'paid-content';
    
    // Add empty line (like pressing Enter)
    const breakElement = document.createElement('p');
    breakElement.innerHTML = '<br>';
    paidContentDiv.appendChild(breakElement);
    
    // PENTING: Bersihkan editor dari semua elemen paid line sebelumnya (untuk jaga-jaga)
    const existingPaidLine = editor.querySelector('.paid-content-line');
    const existingPaidContent = editor.querySelector('.paid-content');
    
    if (existingPaidLine) existingPaidLine.remove();
    if (existingPaidContent) existingPaidContent.remove();
    
    // Tambahkan ke editor dengan urutan yang benar (tidak bergantung pada selection)
    editor.appendChild(paidLineDiv);
    editor.appendChild(paidContentDiv);
    
    setHasPaidLine(true);
    
    // Posisikan kursor di dalam elemen konten berbayar
    const selection = window.getSelection();
    const range = document.createRange();
    range.setStart(breakElement, 0);
    range.collapse(true);
    
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    // Focus back to editor
    editor.focus();
    
    // Check active formatting
    checkActiveFormatting();
  };

  const removePaidContentLine = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Find elements with paid-content-line class
    const paidLine = editor.querySelector('.paid-content-line');
    const paidContent = editor.querySelector('.paid-content');
    
    // Jika elemen ditemukan, hapus
    if (paidLine) paidLine.remove();
    if (paidContent) paidContent.remove();
    
    // Update state
    setHasPaidLine(false);
    
    // Check active formatting
    checkActiveFormatting();
  };

  const togglePostType = (type: 'free' | 'paid') => {
    setPostType(type);
    
    if (type === 'paid') {
      // If no paid content line yet, add it
      if (!hasPaidLine) {
        insertPaidContentLine();
      }
    } else {
      // If type changed to free, remove paid content line
      if (hasPaidLine) {
        removePaidContentLine();
      }
    }
  };

  const toggleCustomSlug = () => {
    setCustomSlugEnabled(!customSlugEnabled);
    
    if (!customSlugEnabled && title) {
      setCustomSlug(generateSlug(title));
    } else if (customSlugEnabled) {
      setCustomSlug('');
    }
  };

  function generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  // Define TypeScript interface for the button object
  interface FormatButton {
    id: string;
    label: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
  }

  // Define TypeScript interface for the format group
  interface FormatGroup {
    id: string;
    icon: React.ReactNode;
    title: string;
    buttons: FormatButton[];
  }

  // Basic formatting tools for mobile view
  const mobileFormatButtons: FormatButton[] = [
    { id: 'bold', label: <strong>B</strong> },
    { id: 'italic', label: <em>I</em> },
    { id: 'underline', label: <span style={{ textDecoration: 'underline' }}>U</span> },
    { id: 'strike', label: <span style={{ textDecoration: 'line-through' }}>S</span> },
    { id: 'align-left', label: '≡' },
    { id: 'align-center', label: '≡' },
    { id: 'align-right', label: '≡' },
    { id: 'align-justify', label: '≡' },
    { id: 'bullet-list', label: '•' },
    { id: 'numbered-list', label: '1.' },
    { id: 'check-list', label: '✓' },
    { id: 'h1', label: 'H1' },
    { id: 'h2', label: 'H2' },
    { id: 'h3', label: 'H3' },
  ];

  const formatGroups: FormatGroup[] = [
    {
      id: 'text',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18" />
        </svg>
      ),
      title: 'Text Formatting',
      buttons: [
        { id: 'bold', label: <strong>B</strong> },
        { id: 'italic', label: <em>I</em> },
        { id: 'underline', label: <span style={{ textDecoration: 'underline' }}>U</span> },
        { id: 'strike', label: <span style={{ textDecoration: 'line-through' }}>S</span> }
      ]
    },
    {
      id: 'align',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      ),
      title: 'Alignment',
      buttons: [
        { 
          id: 'align-left', 
          label: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="15" y2="12" />
              <line x1="3" y1="18" x2="18" y2="18" />
            </svg>
          )
        },
        { 
          id: 'align-center', 
          label: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="6" y1="12" x2="18" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )
        },
        { 
          id: 'align-right', 
          label: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="9" y1="12" x2="21" y2="12" />
              <line x1="6" y1="18" x2="21" y2="18" />
            </svg>
          )
        },
        { 
          id: 'align-justify', 
          label: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'list',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
      title: 'Lists',
      buttons: [
        { id: 'bullet-list', label: '•' },
        { id: 'numbered-list', label: '1.' },
        { id: 'check-list', label: '✓' }
      ]
    },
    {
      id: 'format',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      ),
      title: 'Formatting',
      buttons: [
        { id: 'h1', label: 'H1' },
        { id: 'h2', label: 'H2' },
        { id: 'h3', label: 'H3' },
        { id: 'paragraph', label: 'P' }
      ]
    },
    {
      id: 'insert',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
      title: 'Insert',
      buttons: [
        { id: 'link', label: '🔗' },
        { id: 'image', label: '🖼' },
        { id: 'table', label: '⊞' },
        { id: 'quote', label: '❝' },
        { id: 'code', label: '<>' }
      ]
    },
    {
      id: 'special',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      ),
      title: 'Special',
      buttons: [
        { 
          id: 'focus-mode', 
          label: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ),
          className: 'special-button'
        },
        { 
          id: 'paid-content', 
          label: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
              <path d="M12 6v2m0 8v2" />
            </svg>
          ),
          onClick: insertPaidContentLine,
          disabled: hasPaidLine,
          className: 'paid-button'
        }
      ]
    }
  ];

  const renderToolbar = () => {
    if (isMobileView) {
      return (
        <div className="mobile-toolbar">
          {mobileFormatButtons.map(button => (
            <button
              key={button.id}
              className={`mobile-toolbar-button ${button.className || ''} ${activeTools.includes(button.id) ? 'active' : ''}`}
              onClick={() => button.onClick ? button.onClick() : formatText(button.id)}
              disabled={button.disabled || false}
            >
              {button.label}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="toolbar-container">
        <div className="toolbar-row">
          {formatGroups.map(group => (
            <div key={group.id} className="toolbar-group">
              {group.buttons.map(button => (
                <button
                  key={button.id}
                  className={`toolbar-button ${button.className || ''} ${activeTools.includes(button.id) ? 'active' : ''}`}
                  onClick={() => button.onClick ? button.onClick() : formatText(button.id)}
                  title={button.id.charAt(0).toUpperCase() + button.id.slice(1).replace('-', ' ')}
                  disabled={button.disabled || false}
                >
                  {button.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="editor-page">
      <div className="editor-container">
        {/* Header */}
        <header className="editor-header">
          <button className="back-button" onClick={() => window.history.back()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"></path>
            </svg>
            <span>Back</span>
          </button>
          
          <div className="editor-actions">
            {isAutosaved && (
              <div className="autosave-indicator">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="green" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span>Saved to drafts</span>
              </div>
            )}
            {!showSettings && (
              <button className="icon-button" onClick={toggleSettings} title="Settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
            )}
            <div className="action-buttons">
              <button className="save-draft-button" onClick={handleSaveAsDraft}>
                Save as draft
              </button>
              <button className="publish-button" onClick={handlePublish}>
                Publish Now
              </button>
            </div>
          </div>
        </header>

        <div className="editor-content-area">
          <div className="editor-main">
            {/* Title and Subtitle */}
            <input
              type="text"
              className="title-input"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            
            <input
              type="text"
              className="subtitle-input"
              placeholder="Subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
            
            {/* Toolbar */}
            <div className="toolbar-wrapper">
              {renderToolbar()}
            </div>
            
            {/* Main content editor - contenteditable div */}
            <div
              ref={editorRef}
              className="content-editor"
              contentEditable
              data-placeholder="Start writing your post..."
            ></div>
          </div>
          
          {/* Settings sidebar */}
          {showSettings && (
            <div className="settings-sidebar">
              <div className="settings-header">
                <h2>Post settings</h2>
                <button 
                  className="close-settings-button" 
                  onClick={toggleSettings}
                >
                  ×
                </button>
              </div>
              
              <p className="settings-description">Customize your post preferences.</p>
              
              {/* Post type selection */}
              <div className="settings-section">
                <h3>Post type</h3>
                <div className="post-type-selector">
                  <button 
                    className={`post-type-button ${postType === 'free' ? 'active' : ''}`}
                    onClick={() => togglePostType('free')}
                  >
                    <span className="post-type-radio">
                      {postType === 'free' && <span className="radio-selected"></span>}
                    </span>
                    <span>Free</span>
                  </button>
                  <button 
                    className={`post-type-button ${postType === 'paid' ? 'active' : ''}`}
                    onClick={() => togglePostType('paid')}
                  >
                    <span className="post-type-radio">
                      {postType === 'paid' && <span className="radio-selected"></span>}
                    </span>
                    <span>Paid</span>
                  </button>
                </div>
              </div>
              
              {/* Custom slug */}
              <div className="settings-section">
                <div className="custom-slug-header">
                  <h3>Custom slug</h3>
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={customSlugEnabled}
                      onChange={toggleCustomSlug}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                {customSlugEnabled && (
                  <div className="custom-slug-content">
                    <input
                      type="text"
                      className="custom-slug-input"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      placeholder="Type custom slug here"
                    />
                    <p className="custom-slug-info">
                      Spaces will be replaced with "-" and converted to lowercase.
                    </p>
                    
                    <div className="url-preview">
                      <h4>Post URL preview</h4>
                      <p>https://buletin.co/cyrpoto011/{slug}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile action bar (fixed at bottom) */}
      {isMobileView && (
        <div className="mobile-action-bar">
          <button className="mobile-settings-button" onClick={toggleSettings}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <span>Settings</span>
          </button>
          <button className="mobile-draft-button" onClick={handleSaveAsDraft}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Draft</span>
          </button>
          <button className="mobile-publish-button" onClick={handlePublish}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2v20h-20v-20h20z"></path>
              <path d="M7 2v20"></path>
              <path d="M17 2v20"></path>
              <path d="M2 12h20"></path>
              <path d="M2 7h5"></path>
              <path d="M2 17h5"></path>
              <path d="M17 17h5"></path>
              <path d="M17 7h5"></path>
            </svg>
            <span>Publish</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default BuletinRichEditor;