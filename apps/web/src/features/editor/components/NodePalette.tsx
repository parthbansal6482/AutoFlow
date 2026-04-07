import { useState, useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { 
  Search, Zap, Clock, Globe, GitBranch, Shuffle, GitMerge, Edit, Code, Bot, 
  UserCheck, Settings, Sparkles, Brain, Database, Calendar, 
  Filter, SortAsc, Sigma, Play, 
  FileText, Variable, MessageSquare, Mail, Layers,
  Send, StickyNote, ListTodo, Users, Cloud, CreditCard, ShoppingBag, 
  Share2, Camera, HardDrive, 
  Table, Activity, Terminal
} from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { CompanyLogo } from '../../../components/shared/CompanyLogo';

export type NodeDefinition = {
  type: string;
  label: string;
  icon: any;
  domain?: string; // logo.dev domain
  category: string;
  subCategory?: string; // grouping within "Action in an App"
  color: string;
  description: string;
};

const NODES: NodeDefinition[] = [
  // AI
  { type: 'google-gemini', icon: Sparkles, domain: 'google.com', label: 'Google Gemini', category: 'AI', color: 'text-blue-500 bg-blue-500/10', description: 'Generate text or analyze data with Gemini Pro' },
  { type: 'openai', icon: Bot, domain: 'openai.com', label: 'OpenAI (ChatGPT)', category: 'AI', color: 'text-emerald-500 bg-emerald-500/10', description: 'Text generation, analysis or translation' },
  { type: 'anthropic', icon: Brain, domain: 'anthropic.com', label: 'Anthropic Claude', category: 'AI', color: 'text-orange-500 bg-orange-500/10', description: 'Advanced reasoning and long-context analysis' },
  { type: 'image-gen', icon: Layers, domain: 'openai.com', label: 'AI Image Gen', category: 'AI', color: 'text-fuchsia-500 bg-fuchsia-500/10', description: 'Generate images using DALL-E or Imagen' },
  
  // COMMUNICATION
  { type: 'slack', icon: MessageSquare, domain: 'slack.com', label: 'Slack', category: 'Action in an App', subCategory: 'Communication', color: 'text-purple-500 bg-purple-500/10', description: 'Send messages or notifications to Slack channels' },
  { type: 'discord', icon: MessageSquare, domain: 'discord.com', label: 'Discord', category: 'Action in an App', subCategory: 'Communication', color: 'text-indigo-500 bg-indigo-500/10', description: 'Send messages to Discord channels/webhooks' },
  { type: 'telegram', icon: Send, domain: 'telegram.org', label: 'Telegram', category: 'Action in an App', subCategory: 'Communication', color: 'text-sky-400 bg-sky-400/10', description: 'Send messages via Telegram Bot API' },
  { type: 'whatsapp', icon: MessageSquare, domain: 'whatsapp.com', label: 'WhatsApp (Twilio)', category: 'Action in an App', subCategory: 'Communication', color: 'text-emerald-500 bg-emerald-500/10', description: 'Send automated WhatsApp messages' },
  { type: 'ms-teams', icon: MessageSquare, domain: 'microsoft.com', label: 'MS Teams', category: 'Action in an App', subCategory: 'Communication', color: 'text-indigo-400 bg-indigo-400/10', description: 'Integrate with Microsoft Teams channels' },
  { type: 'email', icon: Mail, domain: 'google.com', label: 'Gmail / SMTP', category: 'Action in an App', subCategory: 'Communication', color: 'text-red-500 bg-red-500/10', description: 'Send automated emails or notifications' },
  
  // PRODUCTIVITY & PM
  { type: 'notion', icon: StickyNote, domain: 'notion.so', label: 'Notion', category: 'Action in an App', subCategory: 'Productivity', color: 'text-slate-200 bg-slate-200/10', description: 'Create pages, update databases, or read items' },
  { type: 'trello', icon: HardDrive, domain: 'trello.com', label: 'Trello', category: 'Action in an App', subCategory: 'Productivity', color: 'text-blue-500 bg-blue-500/10', description: 'Create cards, move items, or manage boards' },
  { type: 'airtable', icon: Table, domain: 'airtable.com', label: 'Airtable', category: 'Action in an App', subCategory: 'Productivity', color: 'text-blue-400 bg-blue-400/10', description: 'Read/write records in Airtable bases' },
  { type: 'asana', icon: ListTodo, domain: 'asana.com', label: 'Asana', category: 'Action in an App', subCategory: 'Productivity', color: 'text-rose-400 bg-rose-400/10', description: 'Manage tasks and projects in Asana' },
  { type: 'clickup', icon: HardDrive, domain: 'clickup.com', label: 'ClickUp', category: 'Action in an App', subCategory: 'Productivity', color: 'text-violet-500 bg-violet-500/10', description: 'Workflow automation for ClickUp tasks' },
  { type: 'google-sheets', icon: Database, domain: 'google.com', label: 'Google Sheets', category: 'Action in an App', subCategory: 'Productivity', color: 'text-green-500 bg-green-500/10', description: 'Read, write or update spreadsheet rows' },
  { type: 'google-calendar', icon: Calendar, domain: 'google.com', label: 'Google Calendar', category: 'Action in an App', subCategory: 'Productivity', color: 'text-blue-400 bg-blue-400/10', description: 'Manage events and schedules' },
  { type: 'google-drive', icon: HardDrive, domain: 'google.com', label: 'Google Drive', category: 'Action in an App', subCategory: 'Productivity', color: 'text-amber-500 bg-amber-500/10', description: 'Upload, search and manage drive files' },
  
  // SALES & CRM
  { type: 'hubspot', icon: Users, domain: 'hubspot.com', label: 'HubSpot', category: 'Action in an App', subCategory: 'Sales & CRM', color: 'text-orange-500 bg-orange-500/10', description: 'Sync contacts, deals, and marketing data' },
  { type: 'salesforce', icon: Cloud, domain: 'salesforce.com', label: 'Salesforce', category: 'Action in an App', subCategory: 'Sales & CRM', color: 'text-sky-500 bg-sky-500/10', description: 'Manage enterprise CRM objects and records' },
  { type: 'pipedrive', icon: Activity, domain: 'pipedrive.com', label: 'Pipedrive', category: 'Action in an App', subCategory: 'Sales & CRM', color: 'text-emerald-600 bg-emerald-600/10', description: 'Track leads, deals and sales activities' },
  
  // E-COMMERCE & PAYMENTS
  { type: 'stripe', icon: CreditCard, domain: 'stripe.com', label: 'Stripe', category: 'Action in an App', subCategory: 'E-commerce', color: 'text-indigo-400 bg-indigo-400/10', description: 'Manage payments, customers, and invoices' },
  { type: 'shopify', icon: ShoppingBag, domain: 'shopify.com', label: 'Shopify', category: 'Action in an App', subCategory: 'E-commerce', color: 'text-emerald-400 bg-emerald-400/10', description: 'Sync products, orders, and customer data' },
  { type: 'woocommerce', icon: ShoppingBag, domain: 'woocommerce.com', label: 'WooCommerce', category: 'Action in an App', subCategory: 'E-commerce', color: 'text-purple-600 bg-purple-600/10', description: 'Automate your WP store actions' },
  
  // SOCIAL & MARKETING
  { type: 'mailchimp', icon: Mail, domain: 'mailchimp.com', label: 'Mailchimp', category: 'Action in an App', subCategory: 'Social & Marketing', color: 'text-yellow-400 bg-yellow-400/10', description: 'Manage campaigns and subscribers' },
  { type: 'twitter', icon: Send, domain: 'twitter.com', label: 'Twitter (X)', category: 'Action in an App', subCategory: 'Social & Marketing', color: 'text-slate-100 bg-slate-100/10', description: 'Post tweets and monitor mentions' },
  { type: 'linkedin', icon: Share2, domain: 'linkedin.com', label: 'LinkedIn', category: 'Action in an App', subCategory: 'Social & Marketing', color: 'text-blue-600 bg-blue-600/10', description: 'Share updates and manage company pages' },
  { type: 'instagram', icon: Camera, domain: 'instagram.com', label: 'Instagram', category: 'Action in an App', subCategory: 'Social & Marketing', color: 'text-fuchsia-500 bg-fuchsia-500/10', description: 'Automate Instagram media and comments' },
  
  // RECENT APPS (GENERIC)
  { type: 'http-request', icon: Globe, label: 'HTTP Request', category: 'Action in an App', subCategory: 'Utility', color: 'text-blue-500 bg-blue-500/10', description: 'Call any external API endpoint' },
  { type: 'github', icon: Globe, domain: 'github.com', label: 'GitHub', category: 'Action in an App', subCategory: 'Developer', color: 'text-slate-200 bg-slate-200/10', description: 'Manage issues, PRs or repository data' },
  
  // INFRASTRUCTURE & DB
  { type: 'supabase', icon: Database, domain: 'supabase.com', label: 'Supabase', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-emerald-500 bg-emerald-500/10', description: 'Read/write to your Supabase tables' },
  { type: 'postgresql', icon: Database, label: 'PostgreSQL', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-sky-600 bg-sky-600/10', description: 'Execute raw SQL queries or CRUD on Postgres' },
  { type: 'mysql', icon: Database, label: 'MySQL', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-blue-400 bg-blue-400/10', description: 'Connect and query MySQL databases' },
  { type: 'mongodb', icon: Database, domain: 'mongodb.com', label: 'MongoDB', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-green-600 bg-green-600/10', description: 'Query collections and manage documents' },
  { type: 'redis', icon: Activity, domain: 'redis.io', label: 'Redis', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-red-600 bg-red-600/10', description: 'Get/set keys and manage cached data' },
  { type: 'aws-s3', icon: HardDrive, domain: 'aws.amazon.com', label: 'AWS S3', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-orange-400 bg-orange-400/10', description: 'Manage object storage and files' },
  { type: 'aws-lambda', icon: Terminal, domain: 'aws.amazon.com', label: 'AWS Lambda', category: 'Action in an App', subCategory: 'Infrastructure', color: 'text-orange-600 bg-orange-600/10', description: 'Invoke serverless functions' },

  // DATA TRANSFORMATION
  { type: 'set', icon: Edit, label: 'Set Fields', category: 'Data Transformation', color: 'text-emerald-500 bg-emerald-500/10', description: 'Modify or add data fields' },
  { type: 'edit-fields', icon: Layers, label: 'Edit Fields', category: 'Data Transformation', color: 'text-sky-500 bg-sky-500/10', description: 'Rename, remove or keep specific fields' },
  { type: 'code', icon: Code, label: 'Custom Code', category: 'Data Transformation', color: 'text-indigo-500 bg-indigo-500/10', description: 'Write JavaScript to transform data' },
  { type: 'filter', icon: Filter, label: 'Filter', category: 'Data Transformation', color: 'text-amber-500 bg-amber-500/10', description: 'Keep objects matching specific conditions' },
  { type: 'sort', icon: SortAsc, label: 'Sort', category: 'Data Transformation', color: 'text-teal-500 bg-teal-500/10', description: 'Reorder list items by a field' },
  { type: 'aggregate', icon: Sigma, label: 'Aggregate', category: 'Data Transformation', color: 'text-rose-500 bg-rose-500/10', description: 'Combine multiple items into a single summary' },
  
  // FLOW
  { type: 'webhook-trigger', icon: Zap, label: 'Webhook', category: 'Flow', color: 'text-primary bg-primary/10', description: 'Start workflow via HTTP request' },
  { type: 'cron-trigger', icon: Clock, label: 'Schedule', category: 'Flow', color: 'text-primary bg-primary/10', description: 'Run workflow on a schedule' },
  { type: 'if', icon: GitBranch, label: 'If Condition', category: 'Flow', color: 'text-amber-500 bg-amber-500/10', description: 'Split flow based on condition' },
  { type: 'switch', icon: Shuffle, label: 'Switch', category: 'Flow', color: 'text-orange-500 bg-orange-500/10', description: 'Route flow into multiple paths' },
  { type: 'merge', icon: GitMerge, label: 'Merge', category: 'Flow', color: 'text-teal-500 bg-teal-500/10', description: 'Combine multiple flow paths' },
  { type: 'execute-workflow', icon: Play, label: 'Sub-Workflow', category: 'Flow', color: 'text-indigo-400 bg-indigo-400/10', description: 'Trigger another workflow' },
  
  // CORE
  { type: 'wait', icon: Clock, label: 'Wait', category: 'Core', color: 'text-slate-500 bg-slate-500/10', description: 'Delay workflow execution' },
  { type: 'variable', icon: Variable, label: 'Global Variable', category: 'Core', color: 'text-slate-400 bg-slate-400/10', description: 'Set or get persistent variables' },
  { type: 'config', icon: Settings, label: 'Workflow Config', category: 'Core', color: 'text-slate-500 bg-slate-500/10', description: 'Set global workflow settings' },
  
  // HUMAN REVIEW
  { type: 'human-approval', icon: UserCheck, label: 'Approval Step', category: 'Human Review', color: 'text-rose-500 bg-rose-500/10', description: 'Pause workflow for manual approval' },
  { type: 'form', icon: FileText, label: 'Input Form', category: 'Human Review', color: 'text-blue-500 bg-blue-500/10', description: 'Capture user input via a web form' },
];

const CATEGORIES = ['AI', 'Action in an App', 'Data Transformation', 'Flow', 'Core', 'Human Review'];

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredNodes = useMemo(() => {
    if (!search) return NODES;
    const s = search.toLowerCase();
    return NODES.filter(n => 
      n.label.toLowerCase().includes(s) || 
      n.category.toLowerCase().includes(s) ||
      n.description.toLowerCase().includes(s)
    );
  }, [search]);

  // If searching, we show all results, otherwise we filter by selected category
  const activeNodes = useMemo(() => {
    if (search) return filteredNodes;
    if (selectedCategory) return NODES.filter(n => n.category === selectedCategory);
    return [];
  }, [search, selectedCategory, filteredNodes]);

  // Nodes grouped into their final display category
  const nodesByCategory = useMemo(() => {
    const map: Record<string, NodeDefinition[]> = {};
    activeNodes.forEach(node => {
      // If search is active, we just use the top level category
      // If we are drill-down into "Action in an App", we use the subCategory
      const groupKey = (selectedCategory === 'Action in an App' && !search) 
        ? (node.subCategory || 'General') 
        : node.category;

      if (!map[groupKey]) map[groupKey] = [];
      map[groupKey].push(node);
    });
    return map;
  }, [activeNodes, selectedCategory, search]);

  // Which groups to actually render in the list
  const categoryToRender = useMemo(() => {
    if (search) return CATEGORIES;
    if (selectedCategory === 'Action in an App') {
      // Return order of subcategories for apps
      const subCats = new Set<string>();
      NODES.filter(n => n.category === 'Action in an App').forEach(n => {
        if (n.subCategory) subCats.add(n.subCategory);
      });
      return Array.from(subCats);
    }
    return selectedCategory ? [selectedCategory] : [];
  }, [search, selectedCategory]);

  return (
    <div className="p-6 w-full flex flex-col max-h-[600px] overflow-hidden transition-all duration-500">
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] opacity-50">Node Palette</h3>
          {selectedCategory && !search && (
            <button 
              onClick={() => setSelectedCategory(null)}
              className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline group"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back to Categories
            </button>
          )}
        </div>
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
            <Search size={16} strokeWidth={2.5} />
          </div>
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all nodes..."
            className="pl-10 h-11 bg-surface-container-highest/60 border-transparent focus:bg-surface-container-highest focus:ring-2 focus:ring-primary/20 rounded-2xl placeholder:text-on-surface-variant/30 text-sm font-semibold transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-8 custom-scrollbar">
        {!selectedCategory && !search ? (
          <div className="grid grid-cols-1 gap-2.5">
            {CATEGORIES.map(category => {
              const count = NODES.filter(n => n.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="w-full flex items-center justify-between hover:bg-surface-container-highest p-4 rounded-2xl text-left transition-all group border border-white/5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98]"
                >
                  <div className="text-sm font-black text-on-surface tracking-wide group-hover:text-primary transition-colors">{category}</div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {count} nodes
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-on-surface-variant/30 group-hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          categoryToRender.map(category => {
            const nodes = nodesByCategory[category];
            if (!nodes || nodes.length === 0) return null;

            return (
              <div key={category} className="space-y-4">
                <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-2 sticky top-0 bg-transparent backdrop-blur-sm py-1 z-10 opacity-70">
                  {category}
                </h4>
                <div className="grid gap-2">
                  {nodes.map(node => (
                    <button
                      key={node.type}
                      onClick={() => onAddNode(node.type)}
                      className="w-full flex items-center gap-4 hover:bg-surface-container-highest p-3.5 rounded-2xl text-left transition-all group relative overflow-hidden active:scale-[0.98] border border-transparent hover:border-white/5"
                    >
                      {node.domain ? (
                        <CompanyLogo 
                          domain={node.domain} 
                          size={120} 
                          theme="dark"
                          className="w-11 h-11 shrink-0 group-hover:scale-110 transition-transform"
                          fallbackIcon={
                            <div className={cn("w-11 h-11 rounded-2xl shadow-sm ring-1 ring-white/5 flex items-center justify-center transition-all group-hover:scale-110 shrink-0", node.color)}>
                              <node.icon size={20} strokeWidth={2.5} />
                            </div>
                          }
                        />
                      ) : (
                        <div className={cn("w-11 h-11 rounded-2xl shadow-sm ring-1 ring-white/5 flex items-center justify-center transition-all group-hover:scale-110 shrink-0", node.color)}>
                          <node.icon size={20} strokeWidth={2.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{node.label}</div>
                        <div className="text-[10px] text-on-surface-variant/60 truncate font-medium mt-0.5 tracking-tight group-hover:text-on-surface-variant transition-colors">{node.description}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                        <div className="bg-primary/10 p-1.5 rounded-full shadow-sm">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-primary"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {activeNodes.length === 0 && search && (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-300">
            <div className="p-5 bg-surface-container-highest/50 rounded-3xl mb-4 text-on-surface-variant/10 shadow-inner">
              <Search size={40} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-black text-on-surface mb-1 tracking-tight">No nodes found</p>
            <p className="text-[11px] text-on-surface-variant font-medium opacity-50 px-8 leading-relaxed">We couldn't find any nodes matching "{search}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

