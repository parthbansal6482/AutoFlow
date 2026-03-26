import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// apps/web/src/lib/flow-nodes.tsx
import { Handle, Position } from '@xyflow/react';
export function BaseNode({ data, isConnectable, icon, colorClass, }) {
    // Triggers don't have inputs
    const isTrigger = data.type === 'webhook-trigger' || data.type === 'cron-trigger';
    return (_jsxs("div", { className: `rounded-xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm min-w-[200px] overflow-hidden ${data.selected ? 'border-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]' : ''}`, children: [!isTrigger && (_jsx(Handle, { type: "target", position: Position.Left, id: "main", isConnectable: isConnectable, className: "w-3 h-3 bg-[hsl(var(--muted-foreground))] border-2 border-[hsl(var(--background))]" })), _jsxs("div", { className: `p-3 flex items-center gap-3 border-b border-[hsl(var(--border))] ${colorClass}`, children: [_jsx("div", { className: "text-white", children: icon }), _jsx("div", { className: "font-semibold text-sm text-foreground", children: data.label })] }), _jsx("div", { className: "p-3 bg-[hsl(var(--secondary)/0.3)]", children: _jsx("p", { className: "text-xs text-[hsl(var(--muted-foreground))]", children: data.type === 'http-request' && data.parameters?.method ? `${data.parameters.method} Request` : 'Configure parameters in sidebar' }) }), _jsx(Handle, { type: "source", position: Position.Right, id: "main", isConnectable: isConnectable, className: "w-3 h-3 bg-[hsl(var(--primary))] border-2 border-[hsl(var(--background))]" }), data.type === 'if' && (_jsx(Handle, { type: "source", position: Position.Right, id: "false", style: { top: '75%' }, isConnectable: isConnectable, className: "w-3 h-3 bg-[hsl(var(--destructive))] border-2 border-[hsl(var(--background))]" })), data.type === 'code' && (_jsx(Handle, { type: "source", position: Position.Right, id: "error", style: { top: '75%' }, isConnectable: isConnectable, className: "w-3 h-3 bg-[hsl(var(--destructive))] border-2 border-[hsl(var(--background))]" }))] }));
}
// Icon SVG helpers
const IconWebhook = () => _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) });
const IconClock = () => _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] });
const IconHttp = () => _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "2", y1: "12", x2: "22", y2: "12" }), _jsx("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })] });
const IconIf = () => _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "6", y1: "3", x2: "6", y2: "15" }), _jsx("circle", { cx: "18", cy: "6", r: "3" }), _jsx("circle", { cx: "6", cy: "18", r: "3" }), _jsx("path", { d: "M18 9a9 9 0 0 1-9 9" })] });
const IconSet = () => _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), _jsx("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })] });
const IconCode = () => _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("polyline", { points: "16 18 22 12 16 6" }), _jsx("polyline", { points: "8 6 2 12 8 18" })] });
// Specific node components
export const WebhookNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconWebhook, {}), colorClass: "bg-purple-600" });
export const CronNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconClock, {}), colorClass: "bg-purple-600" });
export const HttpNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconHttp, {}), colorClass: "bg-blue-600" });
export const IfNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconIf, {}), colorClass: "bg-amber-600" });
export const SetNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconSet, {}), colorClass: "bg-emerald-600" });
export const CodeNode = (props) => _jsx(BaseNode, { ...props, icon: _jsx(IconCode, {}), colorClass: "bg-slate-700" });
export const nodeTypes = {
    'webhook-trigger': WebhookNode,
    'cron-trigger': CronNode,
    'http-request': HttpNode,
    'if': IfNode,
    'set': SetNode,
    'code': CodeNode,
};
// Generate default data when dropping a new node onto the canvas
export function createNodeData(type) {
    const base = { type, parameters: {} };
    switch (type) {
        case 'webhook-trigger':
            return { ...base, label: 'Webhook', parameters: { method: 'POST', path: `wh-${Math.random().toString(36).substring(2, 8)}` } };
        case 'cron-trigger':
            return { ...base, label: 'Schedule', parameters: { cron: '0 * * * *', timezone: 'UTC' } };
        case 'http-request':
            return { ...base, label: 'HTTP Request', parameters: { method: 'GET', url: 'https://api.github.com' } };
        case 'if':
            return { ...base, label: 'If', parameters: { field: '', operator: 'equals', value: '' } };
        case 'set':
            return { ...base, label: 'Set', parameters: { fields: '{\n  "key": "value"\n}' } };
        case 'code':
            return { ...base, label: 'Code', parameters: { code: '// Access input data via $input\nreturn $input.all();' } };
        default:
            return { ...base, label: 'Unknown' };
    }
}
