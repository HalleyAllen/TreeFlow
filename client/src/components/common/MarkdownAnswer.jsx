import { memo } from 'react';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const remarkPlugins = [remarkGfm];
const components = {
  a: ({ node: _node, href, ...props }) => href ? (
    <a {...props} href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noopener noreferrer" onClick={event => event.stopPropagation()} />
  ) : <span {...props} />,
  pre: ({ node: _node, className = '', ...props }) => (
    <pre {...props} className={`nodrag nopan nowheel ${className}`} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="markdown-table nodrag nopan nowheel"><table {...props} /></div>
  ),
};

const MarkdownAnswer = memo(({ content }) => (
  <Box
    className="markdown-answer"
    sx={{
      minWidth: 0,
      maxWidth: '100%',
      whiteSpace: 'normal',
      overflowWrap: 'anywhere',
      '& > :first-child': { mt: 0 },
      '& > :last-child': { mb: 0 },
      '& p': { m: '0 0 0.65em', whiteSpace: 'pre-wrap' },
      '& h1, & h2, & h3, & h4, & h5, & h6': { m: '0.8em 0 0.45em', lineHeight: 1.35, fontWeight: 700 },
      '& h1': { fontSize: '1.4em' },
      '& h2': { fontSize: '1.25em' },
      '& h3': { fontSize: '1.15em' },
      '& h4, & h5, & h6': { fontSize: '1em' },
      '& strong': { fontWeight: 700 },
      '& ul, & ol': { m: '0.4em 0 0.7em', pl: '1.5em' },
      '& li + li': { mt: '0.2em' },
      '& li > p': { mb: '0.3em' },
      '& blockquote': { m: '0.65em 0', pl: '0.8em', borderLeft: '3px solid #93c5fd', color: '#4b5563' },
      '& a': { color: '#2563eb', textDecoration: 'underline', textUnderlineOffset: '2px' },
      '& code': { fontFamily: 'Consolas, Menlo, monospace', fontSize: '0.92em', bgcolor: '#eef2f7', borderRadius: '3px', p: '0.1em 0.35em' },
      '& pre': { m: '0.7em 0', p: 1.25, maxWidth: '100%', overflowX: 'auto', borderRadius: 1, bgcolor: '#111827', color: '#e5e7eb', whiteSpace: 'pre', wordBreak: 'normal', overflowWrap: 'normal' },
      '& pre code': { display: 'block', p: 0, bgcolor: 'transparent', color: 'inherit', fontSize: '1em' },
      '& .markdown-table': { maxWidth: '100%', overflowX: 'auto', my: '0.7em' },
      '& table': { borderCollapse: 'collapse', width: '100%', fontSize: '0.95em' },
      '& th, & td': { border: '1px solid #d1d5db', p: '0.4em 0.65em', minWidth: '5em' },
      '& th': { bgcolor: '#f3f4f6', fontWeight: 700 },
      '& tr:nth-of-type(even)': { bgcolor: '#f9fafb' },
      '& hr': { border: 0, borderTop: '1px solid #d1d5db', my: '0.8em' },
      '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
      '& input[type="checkbox"]': { mr: '0.4em', verticalAlign: 'middle' },
      '& .task-list-item': { listStyle: 'none' },
    }}
  >
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components} skipHtml>{content || ''}</ReactMarkdown>
  </Box>
));

MarkdownAnswer.displayName = 'MarkdownAnswer';
export default MarkdownAnswer;
