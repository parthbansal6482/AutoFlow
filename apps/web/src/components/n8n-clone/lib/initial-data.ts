import { Edge, Node } from '@xyflow/react';

export const initialNodes: Node[] = [
  {
    id: 'n1',
    type: 'standardAction',
    position: { x: 100, y: 150 },
    data: {
      title: 'Telegram Trigger',
      subtitle: '',
      icon: 'telegram',
      tooltip: 'Waiting for you to create an event in Telegram',
    },
  },
  {
    id: 'n2',
    type: 'switch',
    position: { x: 400, y: 150 },
    data: {
      title: 'Switch',
      subtitle: '',
      icon: 'git-branch',
      outputs: [
        { id: 'voice', label: 'Voice' },
        { id: 'text', label: 'Text' },
      ],
    },
  },
  {
    id: 'n3',
    type: 'standardAction',
    position: { x: 700, y: 50 },
    data: {
      title: 'Download File',
      subtitle: '',
      icon: 'download',
    },
  },
  {
    id: 'n4',
    type: 'standardAction',
    position: { x: 1000, y: 50 },
    data: {
      title: 'Transcribe',
      subtitle: '',
      icon: 'mic',
    },
  },
  {
    id: 'n5',
    type: 'standardAction',
    position: { x: 700, y: 250 },
    data: {
      title: "Set 'Text'",
      subtitle: '',
      icon: 'file-text',
    },
  },
  {
    id: 'n6',
    type: 'agent',
    position: { x: 1300, y: 150 },
    data: {
      title: 'Ultimate Assistant',
      subtitle: 'Tools Agent',
      tools: ['Tavily', 'Calculator', 'Email Agent', 'Calendar Agent'],
    },
  },
  {
    id: 'n7',
    type: 'standardAction',
    position: { x: 1650, y: 150 },
    data: {
      title: 'Response',
      subtitle: '',
      icon: 'send',
    },
  },
  // Resource Nodes
  {
    id: 'r1',
    type: 'resource',
    position: { x: 1300, y: 400 },
    data: { label: 'OpenAI Chat Model', icon: 'openai' },
  },
  {
    id: 'r2',
    type: 'resource',
    position: { x: 1400, y: 400 },
    data: { label: 'Window Buffer Memory', icon: 'database' },
  },
  {
    id: 'r3',
    type: 'resource',
    position: { x: 1200, y: 400 },
    data: { label: 'Tavily', icon: 'search' },
  },
  {
    id: 'r4',
    type: 'resource',
    position: { x: 1100, y: 400 },
    data: { label: 'Calculator', icon: 'calculator' },
  },
  {
    id: 'r5',
    type: 'resource',
    position: { x: 1500, y: 400 },
    data: { label: 'Email Agent', icon: 'mail' },
  },
  {
    id: 'r6',
    type: 'resource',
    position: { x: 1600, y: 400 },
    data: { label: 'Calendar Agent', icon: 'calendar' },
  },
];

export const initialEdges: Edge[] = [
  // Main Flow Edges
  { id: 'e1-2', source: 'n1', target: 'n2', type: 'mainFlow' },
  { id: 'e2-3', source: 'n2', sourceHandle: 'voice', target: 'n3', type: 'mainFlow' },
  { id: 'e3-4', source: 'n3', target: 'n4', type: 'mainFlow' },
  { id: 'e2-5', source: 'n2', sourceHandle: 'text', target: 'n5', type: 'mainFlow' },
  { id: 'e4-6', source: 'n4', target: 'n6', type: 'mainFlow' },
  { id: 'e5-6', source: 'n5', target: 'n6', type: 'mainFlow' },
  { id: 'e6-7', source: 'n6', target: 'n7', type: 'mainFlow' },
  
  // Resource Edges (bottom connecting up)
  { id: 'er1', source: 'r1', target: 'n6', targetHandle: 'Chat Model*', type: 'resource' },
  { id: 'er2', source: 'r2', target: 'n6', targetHandle: 'Memory', type: 'resource' },
  { id: 'er3', source: 'r3', target: 'n6', targetHandle: 'Tavily', type: 'resource' },
  { id: 'er4', source: 'r4', target: 'n6', targetHandle: 'Calculator', type: 'resource' },
  { id: 'er5', source: 'r5', target: 'n6', targetHandle: 'Email Agent', type: 'resource' },
  { id: 'er6', source: 'r6', target: 'n6', targetHandle: 'Calendar Agent', type: 'resource' },
];
