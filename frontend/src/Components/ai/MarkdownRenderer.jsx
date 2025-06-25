import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from "./CodeBlock";
import LoadingIndicator from "./LoadingIndicator";
import "./MarkdownRenderer.css";

const MarkdownRenderer = ({ content, isTyping }) => {
  // Simple function to extract raw code from markdown before it gets processed
  const extractRawCodeBlocks = (text) => {
    if (!text) return [];
    
    const codeBlocks = [];
    const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [fullMatch, language, code] = match;
      const trimmedCode = code.trim();
      
      if (trimmedCode) {
        // Auto-detect language if not specified
        let detectedLanguage = language || '';
        if (!detectedLanguage) {
          if (trimmedCode.includes('print(') || trimmedCode.includes('def ')) {
            detectedLanguage = 'python';
          } else if (trimmedCode.includes('console.log') || trimmedCode.includes('function')) {
            detectedLanguage = 'javascript';
          } else if (trimmedCode.includes('<html>') || trimmedCode.includes('<!DOCTYPE')) {
            detectedLanguage = 'html';
          } else if (trimmedCode.includes('#include') || trimmedCode.includes('int main')) {
            detectedLanguage = 'c';
          } else if (trimmedCode.includes('public class') || trimmedCode.includes('System.out')) {
            detectedLanguage = 'java';
          }
        }
        
        codeBlocks.push({
          fullMatch,
          language: detectedLanguage,
          code: trimmedCode,
          index: codeBlocks.length
        });
      }
    }
    
    return codeBlocks;
  };

  const processContent = (text) => {
    if (!text) return '';

    let processedText = text;

    // --- MINIMAL CLEANUP - Since model outputs clean markdown already ---
    
    // Only fix critical spacing issues that might occur
    // Fix missing spaces after numbered list periods (only if actually missing)
    processedText = processedText.replace(/^(\s*)(\d+\.)([A-Za-z])/gm, '$1$2 $3');
    
    // Fix missing spaces after bullet points (only if actually missing)  
    processedText = processedText.replace(/^(\s*)([-*])([A-Za-z])/gm, '$1$2 $3');
    
    // Clean up any excessive whitespace (more than 3 newlines)
    processedText = processedText.replace(/\n{4,}/g, '\n\n\n');
    
    // Remove trailing whitespace from lines
    processedText = processedText.replace(/[ \t]+$/gm, '');
    
    // Ensure single space after colons in bold titles (fix any double spaces)
    processedText = processedText.replace(/\*\*([^*]+)\*\*:\s{2,}/g, '**$1**: ');
    
    // Clean up any extra spaces before colons in markdown links or bold text
    processedText = processedText.replace(/(\*\*[^*]+)\s+(\*\*:)/g, '$1$2');

    // --- AUTO-BOLD INTRO PARAGRAPHS ---
    // Split into paragraphs and process the first substantial paragraph
    const paragraphs = processedText.split('\n\n');
    
    if (paragraphs.length > 0) {
      // Find the first substantial paragraph (not just whitespace or very short)
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        
        // Skip empty paragraphs or those that are already formatted (headers, lists, etc.)
        if (!paragraph || 
            paragraph.startsWith('#') || 
            paragraph.startsWith('*') || 
            paragraph.startsWith('-') || 
            paragraph.match(/^\d+\./) ||
            paragraph.startsWith('```') ||
            paragraph.includes('**')) {
          continue;
        }
        
        // Check if this looks like an intro paragraph
        if (paragraph.length > 15 && paragraph.length < 800) {
          
          // ENHANCED INTRO DETECTION - Multiple strategies
          
          // Strategy 1: Common intro starters
          const introStarters = [
            /^please[!.]?\s+here/i,                     // "Please! Here are some ideas..."
            /^please[!.]?\s+i/i,                        // "Please! I need to know..."
            /^here\s+(are|is)\s+/i,                     // "Here are some ideas..."
            /^here's\s+(an?\s+)?/i,                     // "Here's an explanation..."
            /^i'll\s+/i,                                // "I'll provide you with..."
            /^let me\s+/i,                              // "Let me explain..."
            /^to\s+help\s+you/i,                        // "To help you understand..."
            /^based\s+on/i,                             // "Based on your request..."
            /^sure[!.]?\s+/i,                           // "Sure! I can help..."
            /^absolutely[!.]?\s+/i,                     // "Absolutely! Here's what..."
            /^great\s+question[!.]?\s+/i,               // "Great question! Here's..."
            /^of\s+course[!.]?\s+/i,                    // "Of course! I'd be happy..."
          ];
          
          // Strategy 2: Conversational patterns with explanatory context
          const conversationalPatterns = [
            /please\s+tell\s+me/i,
            /i\s+need\s+to\s+know/i,
            /let\s+me\s+know/i,
            /could\s+you\s+tell\s+me/i,
            /what\s+(are\s+you|type\s+of|kind\s+of)/i,
            /are\s+you\s+interested/i,
            /what\s+would\s+you\s+like/i,
            /to\s+help\s+me\s+(narrow|understand|provide)/i,
            /can\s+you\s+specify/i,
            /which\s+of\s+these/i,
            /(categorized|organized)\s+by/i,             // "categorized by type"
            /focusing\s+on/i,                            // "focusing on the habit loop"
          ];
          
          // Strategy 3: Explanatory/introductory phrases
          const explanatoryPhrases = [
            /here\s+(are|is)\s+(some|a|an|the)/i,       // "Here are some ideas"
            /here's\s+(how|what|why|an?\s+explanation)/i, // "Here's an explanation"
            /i'll\s+(explain|provide|show|give)/i,       // "I'll explain the process"
            /let\s+me\s+(explain|show|provide)/i,        // "Let me explain this"
            /(provides?|offers?|includes?)\s+/i,         // "This provides information"
            /in\s+this\s+(guide|explanation|overview)/i, // "In this guide"
          ];
          
          // Strategy 4: Question-asking patterns (common in AI responses)
          const questionPatterns = [
            /do\s+you\s+want\s+me\s+to/i,               // "Do you want me to elaborate"
            /would\s+you\s+like\s+me\s+to/i,           // "Would you like me to explain"
            /can\s+you\s+tell\s+me\s+(more\s+)?about/i, // "Can you tell me about"
            /what\s+city\s+are\s+you/i,                 // "What city are you interested in"
            /which\s+(area|type|kind)/i,                 // "Which area interests you"
          ];
          
          // Check all strategies
          const hasIntroStarter = introStarters.some(pattern => pattern.test(paragraph));
          const hasConversationalPattern = conversationalPatterns.some(pattern => pattern.test(paragraph));
          const hasExplanatoryPhrase = explanatoryPhrases.some(pattern => pattern.test(paragraph));
          const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(paragraph));
          
          // Strategy 5: General conversational indicators
          const hasGeneralConversational = /\b(you|your|I|me|we|us|please|help|interested|looking|want|need)\b/i.test(paragraph);
          const hasQuestionMark = paragraph.includes('?');
          const hasExclamation = paragraph.includes('!');
          const hasColon = paragraph.endsWith(':');
          
          // DECISION LOGIC - More permissive for first paragraphs
          const isLikelyIntro = (
            hasIntroStarter ||                                          // Clear intro starters
            hasConversationalPattern ||                                 // Conversational patterns
            hasExplanatoryPhrase ||                                     // Explanatory phrases
            hasQuestionPattern ||                                       // Question patterns
            (hasGeneralConversational && (hasQuestionMark || hasExclamation || hasColon)) || // Conversational with punctuation
            (paragraph.includes('please') && hasColon)                  // "Please" with colon ending
          );
          
          if (isLikelyIntro) {
            // Bold this paragraph
            paragraphs[i] = `**${paragraph}**`;
            console.log('🎯 AUTO-BOLDED INTRO:', paragraph.substring(0, 80) + '...');
            break; // Only bold the first intro paragraph
          }
        }
      }
    }
    
    processedText = paragraphs.join('\n\n');

    return processedText;
  };

  // Extract raw code blocks from the original content
  const rawCodeBlocks = extractRawCodeBlocks(content);
  const processedContent = processContent(content);

  console.log('🔍 MarkdownRenderer Debug:');
  console.log('- Original content length:', content?.length || 0);
  console.log('- Extracted raw code blocks:', rawCodeBlocks.length);
  console.log('- Raw code blocks:', rawCodeBlocks.map(block => `${block.language}: "${block.code.substring(0, 30)}..."`));
  
  // Debug: Show first 200 characters of original content
  if (content) {
    console.log('- First 200 chars of original:', JSON.stringify(content.substring(0, 200)));
  }
  
  // Debug: Show first 200 characters of processed content
  if (processedContent) {
    console.log('- First 200 chars of processed:', JSON.stringify(processedContent.substring(0, 200)));
  }

  if (isTyping) {
    return <LoadingIndicator />;
  }

  // Helper function to recursively extract text from React elements
  const extractTextRecursively = (element) => {
    if (typeof element === 'string') {
      return element;
    }
    if (typeof element === 'number') {
      return element.toString();
    }
    if (Array.isArray(element)) {
      return element.map(extractTextRecursively).join('');
    }
    if (element && typeof element === 'object') {
      if (element.props && element.props.children) {
        return extractTextRecursively(element.props.children);
      }
      if (element.children) {
        return extractTextRecursively(element.children);
      }
    }
    return '';
  };

  // Counter to track which code block we're currently rendering
  let codeBlockIndex = 0;

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }

            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            
            // Get the corresponding raw code block
            let rawCode = '';
            if (rawCodeBlocks[codeBlockIndex]) {
              rawCode = rawCodeBlocks[codeBlockIndex].code;
              console.log(`✅ Using raw code block ${codeBlockIndex}:`, rawCode.substring(0, 50) + '...');
            }
            
            // Increment counter for next code block
            codeBlockIndex++;
            
            // Fallback: extract from node or children if no raw code found
            if (!rawCode) {
              if (node && node.children && node.children.length > 0) {
                rawCode = node.children
                  .filter(child => child.type === 'text')
                  .map(child => child.value || '')
                  .join('');
              }
              
              if (!rawCode && children) {
                if (typeof children === 'string') {
                  rawCode = children;
                } else if (Array.isArray(children)) {
                  rawCode = children
                    .filter(child => typeof child === 'string')
                    .join('');
                }
              }
              
              if (!rawCode) {
                rawCode = extractTextRecursively(children);
              }
              
              console.log('⚠️ Using fallback code extraction:', rawCode.substring(0, 50) + '...');
            }

            return (
              <CodeBlock
                language={language}
                codeString={rawCode}
                className={className}
                {...props}
              >
                {children}
              </CodeBlock>
            );
          },
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 