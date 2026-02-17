#!/usr/bin/env node

import express from 'express';
import open from 'open';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesPath = path.join(__dirname, '../src/data/resources.json');
const app = express();
const PORT = 5174;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper functions
function loadResources() {
  try {
    const data = fs.readFileSync(resourcesPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading resources:', error.message);
    return {};
  }
}

function saveResources(data) {
  try {
    fs.writeFileSync(resourcesPath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving resources:', error.message);
    return false;
  }
}

// API Routes

// Get all resources
app.get('/api/resources', (req, res) => {
  const resources = loadResources();
  res.json(resources);
});

// Get all existing field names for autocomplete
app.get('/api/field-names', (req, res) => {
  const resources = loadResources();
  const fieldNames = new Set();
  
  // Recursively collect all field names from all items
  function collectFieldNames(obj) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('_')) {
        // If it's an _items array, process each item
        if (Array.isArray(value)) {
          value.forEach(item => {
            if (typeof item === 'object') {
              Object.keys(item).forEach(k => {
                if (k !== 'name') fieldNames.add(k);
              });
            }
          });
        }
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively process nested objects
        collectFieldNames(value);
      }
    }
  }
  
  collectFieldNames(resources);
  res.json(Array.from(fieldNames).sort());
});

// Get categories
app.get('/api/categories', (req, res) => {
  const resources = loadResources();
  const categories = Object.keys(resources)
    .filter(key => !key.startsWith('_'))
    .sort();
  res.json(categories);
});

// Get subcategories for a category
app.get('/api/categories/:category/subcategories', (req, res) => {
  const resources = loadResources();
  const { category } = req.params;
  
  if (!resources[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const subcategories = Object.keys(resources[category])
    .filter(key => !key.startsWith('_'))
    .sort();
  res.json(subcategories);
});

// Get nests for a subcategory
app.get('/api/categories/:category/subcategories/:subcategory/nests', (req, res) => {
  const resources = loadResources();
  const { category, subcategory } = req.params;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  
  const nests = Object.keys(resources[category][subcategory])
    .filter(key => !key.startsWith('_'))
    .sort();
  res.json(nests);
});

// Get nest details
app.get('/api/categories/:category/subcategories/:subcategory/nests/:nest', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest } = req.params;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  
  res.json({
    nest: resources[category][subcategory][nest],
    meta: resources[category][subcategory][nest]._meta || {},
    items: resources[category][subcategory][nest]._items || []
  });
});

// Create category
app.post('/api/categories', (req, res) => {
  const resources = loadResources();
  const { name, title, description } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (resources[name]) return res.status(400).json({ error: 'Category already exists' });
  
  resources[name] = {
    _meta: { title: title || '', description: description || '' },
    _items: []
  };
  
  if (saveResources(resources)) {
    res.json({ success: true, message: 'Category created' });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update category
app.put('/api/categories/:category', (req, res) => {
  const resources = loadResources();
  const { category } = req.params;
  const { title, description } = req.body;
  
  if (!resources[category]) return res.status(404).json({ error: 'Category not found' });
  
  if (title !== undefined) resources[category]._meta.title = title;
  if (description !== undefined) resources[category]._meta.description = description;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete category
app.delete('/api/categories/:category', (req, res) => {
  const resources = loadResources();
  const { category } = req.params;
  
  if (!resources[category]) return res.status(404).json({ error: 'Category not found' });
  
  delete resources[category];
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Category Items endpoints (items directly in category)

// Create item in category
app.post('/api/categories/:category/items', (req, res) => {
  const resources = loadResources();
  const { category } = req.params;
  const item = req.body;
  
  if (!resources[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  if (!item.name) return res.status(400).json({ error: 'Item name required' });
  
  if (!resources[category]._items) {
    resources[category]._items = [];
  }
  
  resources[category]._items.push(item);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update item in category
app.put('/api/categories/:category/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, index } = req.params;
  const item = req.body;
  
  if (!resources[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const idx = parseInt(index);
  if (!resources[category]._items || idx < 0 || idx >= resources[category]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category]._items[idx] = item;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete item in category
app.delete('/api/categories/:category/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, index } = req.params;
  
  if (!resources[category]) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  const idx = parseInt(index);
  if (!resources[category]._items || idx < 0 || idx >= resources[category]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category]._items.splice(idx, 1);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Create subcategory
app.post('/api/categories/:category/subcategories', (req, res) => {
  const resources = loadResources();
  const { category } = req.params;
  const { name, title, description } = req.body;
  
  if (!resources[category]) return res.status(404).json({ error: 'Category not found' });
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (resources[category][name]) return res.status(400).json({ error: 'Subcategory already exists' });
  
  resources[category][name] = {
    _meta: { title: title || '', description: description || '' },
    _items: []
  };
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update subcategory
app.put('/api/categories/:category/subcategories/:subcategory', (req, res) => {
  const resources = loadResources();
  const { category, subcategory } = req.params;
  const { title, description } = req.body;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  
  if (title !== undefined) resources[category][subcategory]._meta.title = title;
  if (description !== undefined) resources[category][subcategory]._meta.description = description;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete subcategory
app.delete('/api/categories/:category/subcategories/:subcategory', (req, res) => {
  const resources = loadResources();
  const { category, subcategory } = req.params;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  
  delete resources[category][subcategory];
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Create nest
app.post('/api/categories/:category/subcategories/:subcategory/nests', (req, res) => {
  const resources = loadResources();
  const { category, subcategory } = req.params;
  const { name, title, description } = req.body;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (resources[category][subcategory][name]) return res.status(400).json({ error: 'Nest already exists' });
  
  resources[category][subcategory][name] = {
    _meta: { title: title || '', description: description || '' },
    _items: []
  };
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update nest metadata
app.put('/api/categories/:category/subcategories/:subcategory/nests/:nest', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest } = req.params;
  const { title, description } = req.body;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  
  if (title !== undefined) resources[category][subcategory][nest]._meta.title = title;
  if (description !== undefined) resources[category][subcategory][nest]._meta.description = description;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete nest
app.delete('/api/categories/:category/subcategories/:subcategory/nests/:nest', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest } = req.params;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  
  delete resources[category][subcategory][nest];
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Subcategory Items endpoints (items directly in subcategory without nests)

// Create item in subcategory
app.post('/api/categories/:category/subcategories/:subcategory/items', (req, res) => {
  const resources = loadResources();
  const { category, subcategory } = req.params;
  const item = req.body;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  if (!item.name) return res.status(400).json({ error: 'Item name required' });
  
  if (!resources[category][subcategory]._items) {
    resources[category][subcategory]._items = [];
  }
  
  resources[category][subcategory]._items.push(item);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update item in subcategory
app.put('/api/categories/:category/subcategories/:subcategory/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, index } = req.params;
  const item = req.body;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  
  const idx = parseInt(index);
  if (!resources[category][subcategory]._items || idx < 0 || idx >= resources[category][subcategory]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category][subcategory]._items[idx] = item;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete item in subcategory
app.delete('/api/categories/:category/subcategories/:subcategory/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, index } = req.params;
  
  if (!resources[category] || !resources[category][subcategory]) {
    return res.status(404).json({ error: 'Subcategory not found' });
  }
  
  const idx = parseInt(index);
  if (!resources[category][subcategory]._items || idx < 0 || idx >= resources[category][subcategory]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category][subcategory]._items.splice(idx, 1);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Nest Items endpoints
app.post('/api/categories/:category/subcategories/:subcategory/nests/:nest/items', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest } = req.params;
  const item = req.body;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  if (!item.name) return res.status(400).json({ error: 'Item name required' });
  
  resources[category][subcategory][nest]._items.push(item);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update item
app.put('/api/categories/:category/subcategories/:subcategory/nests/:nest/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest, index } = req.params;
  const item = req.body;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  
  const idx = parseInt(index);
  if (idx < 0 || idx >= resources[category][subcategory][nest]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category][subcategory][nest]._items[idx] = item;
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Delete item
app.delete('/api/categories/:category/subcategories/:subcategory/nests/:nest/items/:index', (req, res) => {
  const resources = loadResources();
  const { category, subcategory, nest, index } = req.params;
  
  if (!resources[category] || !resources[category][subcategory] || !resources[category][subcategory][nest]) {
    return res.status(404).json({ error: 'Nest not found' });
  }
  
  const idx = parseInt(index);
  if (idx < 0 || idx >= resources[category][subcategory][nest]._items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }
  
  resources[category][subcategory][nest]._items.splice(idx, 1);
  
  if (saveResources(resources)) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Start server
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🚀 Resources Editor UI running at ${url}`);
  console.log(`📝 Editing: ${resourcesPath}\n`);
  
  // Auto-open browser
  open(url).catch(() => {
    console.log(`📍 Please open ${url} in your browser if it doesn't open automatically\n`);
  });
});
