import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useUpdateWorkflow } from '../hooks/use-workflows';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '../components/ui/Dialog';
export default function Workflows() {
    const navigate = useNavigate();
    const { data: workflows, isLoading, error } = useWorkflows();
    const createWorkflow = useCreateWorkflow();
    const deleteWorkflow = useDeleteWorkflow();
    const updateWorkflow = useUpdateWorkflow();
    // Create workflow modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newBgName, setNewBgName] = useState('');
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newBgName.trim())
            return;
        try {
            const newWf = await createWorkflow.mutateAsync(newBgName);
            setIsCreateOpen(false);
            setNewBgName('');
            navigate(`/workflow/${newWf.id}`);
        }
        catch (err) {
            console.error('Failed to create workflow', err);
        }
    };
    const toggleActive = async (id, currentActive) => {
        try {
            await updateWorkflow.mutateAsync({ id, updates: { active: !currentActive } });
        }
        catch (err) {
            console.error('Failed to toggle workflow active state', err);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this workflow?'))
            return;
        try {
            await deleteWorkflow.mutateAsync(id);
        }
        catch (err) {
            console.error('Failed to delete workflow', err);
        }
    };
    if (error) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "rounded-md bg-[hsl(var(--destructive)/0.1)] p-4 border border-[hsl(var(--destructive)/0.2)]", children: _jsxs("p", { className: "text-[hsl(var(--destructive))]", children: ["Failed to load workflows: ", error.message] }) }) }));
    }
    return (_jsxs("div", { className: "p-8 space-y-6 max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]", children: "Workflows" }), _jsx("p", { className: "text-[hsl(var(--muted-foreground))] mt-1", children: "Manage and monitor your automated workflows." })] }), _jsxs(Button, { onClick: () => setIsCreateOpen(true), children: [_jsxs("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "New Workflow"] })] }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" }) })) : workflows?.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-12 text-center shadow-sm", children: [_jsx("div", { className: "mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] opacity-50 mb-4", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "18", cy: "18", r: "3" }), _jsx("circle", { cx: "6", cy: "6", r: "3" }), _jsx("path", { d: "M13 6h3a2 2 0 0 1 2 2v7" }), _jsx("line", { x1: "6", y1: "9", x2: "6", y2: "21" })] }) }), _jsx("h3", { className: "text-lg font-medium text-[hsl(var(--foreground))]", children: "No workflows found" }), _jsx("p", { className: "mt-1 text-sm text-[hsl(var(--muted-foreground))]", children: "Get started by creating a new workflow." }), _jsx("div", { className: "mt-6", children: _jsx(Button, { onClick: () => setIsCreateOpen(true), children: "Create Workflow" }) })] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: workflows?.map((wf) => (_jsxs("div", { className: "group relative flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:border-[hsl(var(--primary)/0.5)] transition-colors overflow-hidden shadow-sm", children: [_jsxs("div", { className: "p-5 flex-1", children: [_jsxs("div", { className: "flex justify-between items-start mb-4", children: [_jsx("div", { className: "h-10 w-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex items-center justify-center", children: _jsxs("svg", { className: "h-5 w-5 text-[hsl(var(--foreground))]", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("circle", { cx: "18", cy: "18", r: "3" }), _jsx("circle", { cx: "6", cy: "6", r: "3" }), _jsx("path", { d: "M13 6h3a2 2 0 0 1 2 2v7" }), _jsx("line", { x1: "6", y1: "9", x2: "6", y2: "21" })] }) }), _jsxs("button", { onClick: () => toggleActive(wf.id, wf.active), title: wf.active ? "Deactivate" : "Activate", className: `relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:ring-offset-2 ${wf.active ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--border))]'}`, children: [_jsx("span", { className: "sr-only", children: "Use setting" }), _jsx("span", { "aria-hidden": "true", className: `pointer-events-none absolute left-0 inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${wf.active ? 'translate-x-5' : 'translate-x-0.5'}` })] })] }), _jsx(Link, { to: `/workflow/${wf.id}`, className: "hover:underline focus:outline-none", children: _jsx("h3", { className: "text-lg font-semibold text-[hsl(var(--foreground))] line-clamp-1", children: wf.name }) }), _jsxs("p", { className: "mt-1 text-sm text-[hsl(var(--muted-foreground))]", children: [wf.nodes?.length || 0, " nodes"] })] }), _jsxs("div", { className: "flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] px-5 py-3", children: [_jsxs("p", { className: "text-xs text-[hsl(var(--muted-foreground))]", children: ["Edited ", formatDistanceToNow(new Date(wf.updated_at), { addSuffix: true })] }), _jsxs("div", { className: "flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", onClick: () => navigate(`/workflow/${wf.id}`), children: [_jsx("span", { className: "sr-only", children: "Edit" }), _jsx("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" }) })] }), _jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0 text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]", onClick: () => handleDelete(wf.id), children: [_jsx("span", { className: "sr-only", children: "Delete" }), _jsxs("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("path", { d: "M3 6h18" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }), _jsx("line", { x1: "10", y1: "11", x2: "10", y2: "17" }), _jsx("line", { x1: "14", y1: "11", x2: "14", y2: "17" })] })] })] })] })] }, wf.id))) })), _jsx(Dialog, { open: isCreateOpen, onOpenChange: setIsCreateOpen, children: _jsx(DialogContent, { children: _jsxs("form", { onSubmit: handleCreate, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Create Workflow" }), _jsx(DialogDescription, { children: "Give your new workflow a descriptive name." })] }), _jsx("div", { className: "py-6", children: _jsx(Input, { autoFocus: true, label: "Workflow Name", value: newBgName, onChange: (e) => setNewBgName(e.target.value), placeholder: "e.g. Sync Shopify to Airtable", disabled: createWorkflow.isPending }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => setIsCreateOpen(false), disabled: createWorkflow.isPending, children: "Cancel" }), _jsx(Button, { type: "submit", isLoading: createWorkflow.isPending, children: "Create" })] })] }) }) })] }));
}
