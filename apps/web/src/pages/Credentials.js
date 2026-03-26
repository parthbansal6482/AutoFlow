import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useCredentials, useCreateCredential, useDeleteCredential } from '../hooks/use-credentials';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '../components/ui/Dialog';
export default function Credentials() {
    const { data: credentials, isLoading, error } = useCredentials();
    const createCred = useCreateCredential();
    const deleteCred = useDeleteCredential();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    // For simplicity, we just take one key/value pair right now.
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [createError, setCreateError] = useState('');
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!name.trim() || !key.trim() || !value.trim()) {
            setCreateError('All fields are required');
            return;
        }
        try {
            await createCred.mutateAsync({
                name,
                secretData: { [key]: value }
            });
            setIsOpen(false);
            setName('');
            setKey('');
            setValue('');
        }
        catch (err) {
            setCreateError(err.message || 'Failed to encrypt credential');
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this credential? Nodes using it will fail.'))
            return;
        try {
            await deleteCred.mutateAsync(id);
        }
        catch (err) {
            console.error('Failed to delete', err);
        }
    };
    if (error) {
        return (_jsx("div", { className: "p-8", children: _jsx("div", { className: "rounded-md bg-[hsl(var(--destructive)/0.1)] p-4 border border-[hsl(var(--destructive)/0.2)]", children: _jsxs("p", { className: "text-[hsl(var(--destructive))]", children: ["Failed to load credentials: ", error.message] }) }) }));
    }
    return (_jsxs("div", { className: "p-8 space-y-6 max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]", children: "Credentials" }), _jsx("p", { className: "text-[hsl(var(--muted-foreground))] mt-1", children: "Stored securely. Plaintext secrets are never written to the database." })] }), _jsxs(Button, { onClick: () => setIsOpen(true), children: [_jsxs("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }), "Add Credential"] })] }), isLoading ? (_jsx("div", { className: "flex items-center justify-center h-64", children: _jsx("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--primary))] border-t-transparent" }) })) : credentials?.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-12 text-center shadow-sm", children: [_jsx("div", { className: "mx-auto h-12 w-12 text-[hsl(var(--muted-foreground))] opacity-50 mb-4", children: _jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" }) }) }), _jsx("h3", { className: "text-lg font-medium text-[hsl(var(--foreground))]", children: "No credentials yet" }), _jsx("p", { className: "mt-1 text-sm text-[hsl(var(--muted-foreground))]", children: "Before nodes can authenticate, you need to store their credentials here." }), _jsx("div", { className: "mt-6", children: _jsx(Button, { onClick: () => setIsOpen(true), children: "Add Credential" }) })] })) : (_jsx("div", { className: "rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] overflow-hidden shadow-sm", children: _jsxs("table", { className: "w-full text-sm text-left", children: [_jsx("thead", { className: "bg-[hsl(var(--secondary)/0.5)] text-[hsl(var(--muted-foreground))] border-b border-[hsl(var(--border))]", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-4 font-medium", children: "Name" }), _jsx("th", { className: "px-6 py-4 font-medium", children: "Created At" }), _jsx("th", { className: "px-6 py-4 font-medium text-right", children: "Actions" })] }) }), _jsx("tbody", { className: "divide-y divide-[hsl(var(--border))]", children: credentials?.map((cred) => (_jsxs("tr", { className: "hover:bg-[hsl(var(--secondary)/0.3)] transition-colors", children: [_jsxs("td", { className: "px-6 py-4 font-medium text-[hsl(var(--foreground))] flex items-center gap-3", children: [_jsx("div", { className: "h-8 w-8 rounded bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))]", children: _jsx("svg", { className: "h-4 w-4", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" }) }) }), cred.name] }), _jsx("td", { className: "px-6 py-4 text-[hsl(var(--muted-foreground))]", children: formatDistanceToNow(new Date(cred.created_at), { addSuffix: true }) }), _jsx("td", { className: "px-6 py-4 text-right", children: _jsx(Button, { variant: "ghost", size: "sm", className: "text-[hsl(var(--destructive))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]", onClick: () => handleDelete(cred.id), disabled: deleteCred.isPending, children: "Delete" }) })] }, cred.id))) })] }) })), _jsx(Dialog, { open: isOpen, onOpenChange: setIsOpen, children: _jsx(DialogContent, { children: _jsxs("form", { onSubmit: handleCreate, children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Add Credential" }), _jsx(DialogDescription, { children: "Secrets are encrypted via AES-256-GCM globally on edge nodes. The database cannot decrypt them." })] }), _jsxs("div", { className: "py-6 space-y-4", children: [createError && (_jsx("div", { className: "p-3 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded text-[hsl(var(--destructive))] text-sm", children: createError })), _jsx(Input, { autoFocus: true, label: "Credential Name", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Production Stripe API Key", disabled: createCred.isPending }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Key", value: key, onChange: (e) => setKey(e.target.value), placeholder: "e.g. Authorization", disabled: createCred.isPending }), _jsx(Input, { label: "Secret Value", type: "password", value: value, onChange: (e) => setValue(e.target.value), placeholder: "e.g. Bearer sk_test_...", disabled: createCred.isPending })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { type: "button", variant: "ghost", onClick: () => setIsOpen(false), disabled: createCred.isPending, children: "Cancel" }), _jsx(Button, { type: "submit", isLoading: createCred.isPending, children: "Encrypt & Save" })] })] }) }) })] }));
}
