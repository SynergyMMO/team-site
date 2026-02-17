#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesPath = path.join(__dirname, '../src/data/resources.json');

let resources = {};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt user
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Utility function to confirm action
async function confirm(question) {
  const answer = await prompt(`${question} (yes/no): `);
  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
}

// Load resources.json
function loadResources() {
  try {
    const data = fs.readFileSync(resourcesPath, 'utf8');
    resources = JSON.parse(data);
    console.log('\n✓ Resources loaded successfully\n');
  } catch (error) {
    console.error('Error loading resources.json:', error.message);
    process.exit(1);
  }
}

// Save resources.json
function saveResources() {
  try {
    fs.writeFileSync(resourcesPath, JSON.stringify(resources, null, 2));
    console.log('\n✓ Resources saved successfully\n');
  } catch (error) {
    console.error('Error saving resources.json:', error.message);
  }
}

// Display ASCII divider
function divider() {
  console.log('═'.repeat(60));
}

// Display header
function displayHeader(title) {
  console.clear();
  divider();
  console.log(`║ ${title.padEnd(58)} ║`);
  divider();
}

// Display all categories
function displayCategories() {
  displayHeader('CATEGORIES');
  const categories = Object.keys(resources).sort();
  categories.forEach((cat, i) => {
    console.log(`  ${i + 1}. ${cat}`);
  });
  console.log('');
}

// Display subcategories for a category
function displaySubcategories(category) {
  displayHeader(`SUBCATEGORIES - ${category}`);
  const subcats = Object.keys(resources[category])
    .filter(key => !key.startsWith('_'))
    .sort();
  subcats.forEach((subcat, i) => {
    console.log(`  ${i + 1}. ${subcat}`);
  });
  console.log('');
}

// Display nests for a subcategory
function displayNests(category, subcategory) {
  displayHeader(`NESTS - ${category} > ${subcategory}`);
  const nests = Object.keys(resources[category][subcategory])
    .filter(key => !key.startsWith('_'))
    .sort();
  nests.forEach((nest, i) => {
    console.log(`  ${i + 1}. ${nest}`);
  });
  console.log('');
}

// Display nest details
function displayNestDetails(category, subcategory, nest) {
  displayHeader(`DETAILS - ${nest}`);
  const section = resources[category][subcategory][nest];
  
  if (section._meta) {
    console.log('📋 METADATA:');
    console.log(`  Title: ${section._meta.title || 'N/A'}`);
    console.log(`  Desc:  ${section._meta.description ? section._meta.description.substring(0, 50) + '...' : 'N/A'}`);
  }
  
  if (section._items && Array.isArray(section._items)) {
    console.log(`\n📦 ITEMS (${section._items.length}):`);
    section._items.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name || 'Unnamed'}`);
    });
  }
  console.log('');
}

// Manage Categories
async function manageCategories() {
  let running = true;
  while (running) {
    displayCategories();
    console.log('  0. Back');
    console.log('  C. Create New Category\n');
    
    const choice = await prompt('Select category (number/C): ');
    
    if (choice.toLowerCase() === 'c') {
      await createCategory();
    } else if (choice === '0') {
      running = false;
    } else {
      const categories = Object.keys(resources).sort();
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < categories.length) {
        await manageCategoryDetails(categories[index]);
      } else {
        console.log('Invalid selection');
      }
    }
  }
}

// Create new category
async function createCategory() {
  displayHeader('CREATE NEW CATEGORY');
  const name = await prompt('Category name: ');
  
  if (!name) {
    console.log('❌ Category name cannot be empty');
    return;
  }
  
  if (resources[name]) {
    console.log('❌ Category already exists');
    return;
  }
  
  resources[name] = { _meta: { title: '', description: '' } };
  console.log(`✓ Category "${name}" created`);
  
  await editCategoryMeta(name);
  saveResources();
}

// Manage a specific category
async function manageCategoryDetails(category) {
  let running = true;
  while (running) {
    displayHeader(`MANAGE - ${category}`);
    
    const subcats = Object.keys(resources[category])
      .filter(key => !key.startsWith('_'))
      .sort();
    
    subcats.forEach((subcat, i) => {
      console.log(`  ${i + 1}. ${subcat}`);
    });
    console.log('\n  0. Back');
    console.log('  E. Edit Category Metadata');
    console.log('  A. Add SubCategory');
    console.log('  D. Delete Category\n');
    
    const choice = await prompt('Select option: ');
    
    if (choice === '0') {
      running = false;
    } else if (choice.toLowerCase() === 'e') {
      await editCategoryMeta(category);
    } else if (choice.toLowerCase() === 'a') {
      await createSubcategory(category);
    } else if (choice.toLowerCase() === 'd') {
      await deleteCategory(category);
      running = false;
    } else {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < subcats.length) {
        await manageSubcategoryDetails(category, subcats[index]);
      } else {
        console.log('Invalid selection');
      }
    }
  }
}

// Edit category metadata
async function editCategoryMeta(category) {
  displayHeader(`EDIT CATEGORY METADATA - ${category}`);
  
  const title = await prompt(`New title (current: "${resources[category]._meta.title || ''}"): `);
  const desc = await prompt(`New description (current: "${resources[category]._meta.description ? resources[category]._meta.description.substring(0, 40) + '...' : ''}"): `);
  
  if (title) resources[category]._meta.title = title;
  if (desc) resources[category]._meta.description = desc;
  
  console.log('✓ Metadata updated');
  saveResources();
}

// Create subcategory
async function createSubcategory(category) {
  displayHeader(`CREATE SUBCATEGORY - ${category}`);
  const name = await prompt('Subcategory name: ');
  
  if (!name) {
    console.log('❌ Subcategory name cannot be empty');
    return;
  }
  
  if (resources[category][name]) {
    console.log('❌ Subcategory already exists');
    return;
  }
  
  resources[category][name] = { _meta: { title: '', description: '' } };
  console.log(`✓ Subcategory "${name}" created`);
  saveResources();
}

// Delete category
async function deleteCategory(category) {
  const shouldDelete = await confirm(`Are you sure you want to delete "${category}"?`);
  if (shouldDelete) {
    delete resources[category];
    console.log(`✓ Category "${category}" deleted`);
    saveResources();
  }
}

// Manage subcategory
async function manageSubcategoryDetails(category, subcategory) {
  let running = true;
  while (running) {
    displayHeader(`MANAGE SUBCATEGORY - ${category} > ${subcategory}`);
    
    const nests = Object.keys(resources[category][subcategory])
      .filter(key => !key.startsWith('_'))
      .sort();
    
    nests.forEach((nest, i) => {
      console.log(`  ${i + 1}. ${nest}`);
    });
    console.log('\n  0. Back');
    console.log('  E. Edit Metadata');
    console.log('  A. Add Nest');
    console.log('  D. Delete Subcategory\n');
    
    const choice = await prompt('Select option: ');
    
    if (choice === '0') {
      running = false;
    } else if (choice.toLowerCase() === 'e') {
      await editSubcategoryMeta(category, subcategory);
    } else if (choice.toLowerCase() === 'a') {
      await createNest(category, subcategory);
    } else if (choice.toLowerCase() === 'd') {
      await deleteSubcategory(category, subcategory);
      running = false;
    } else {
      const index = parseInt(choice) - 1;
      if (index >= 0 && index < nests.length) {
        await manageNestDetails(category, subcategory, nests[index]);
      } else {
        console.log('Invalid selection');
      }
    }
  }
}

// Edit subcategory metadata
async function editSubcategoryMeta(category, subcategory) {
  displayHeader(`EDIT SUBCATEGORY METADATA - ${subcategory}`);
  
  const meta = resources[category][subcategory]._meta;
  const title = await prompt(`New title (current: "${meta.title || ''}"): `);
  const desc = await prompt(`New description (current: "${meta.description ? meta.description.substring(0, 40) + '...' : ''}"): `);
  
  if (title) meta.title = title;
  if (desc) meta.description = desc;
  
  console.log('✓ Metadata updated');
  saveResources();
}

// Delete subcategory
async function deleteSubcategory(category, subcategory) {
  const shouldDelete = await confirm(`Are you sure you want to delete "${subcategory}"?`);
  if (shouldDelete) {
    delete resources[category][subcategory];
    console.log(`✓ Subcategory "${subcategory}" deleted`);
    saveResources();
  }
}

// Create nest
async function createNest(category, subcategory) {
  displayHeader(`CREATE NEST - ${category} > ${subcategory}`);
  const name = await prompt('Nest name: ');
  
  if (!name) {
    console.log('❌ Nest name cannot be empty');
    return;
  }
  
  if (resources[category][subcategory][name]) {
    console.log('❌ Nest already exists');
    return;
  }
  
  resources[category][subcategory][name] = {
    _meta: { title: '', description: '' },
    _items: []
  };
  console.log(`✓ Nest "${name}" created`);
  saveResources();
}

// Delete nest
async function deleteNest(category, subcategory, nest) {
  const shouldDelete = await confirm(`Are you sure you want to delete "${nest}"?`);
  if (shouldDelete) {
    delete resources[category][subcategory][nest];
    console.log(`✓ Nest "${nest}" deleted`);
    saveResources();
  }
}

// Manage nest details
async function manageNestDetails(category, subcategory, nest) {
  let running = true;
  while (running) {
    displayNestDetails(category, subcategory, nest);
    console.log('  0. Back');
    console.log('  E. Edit Metadata');
    console.log('  I. Edit Items');
    console.log('  A. Add New Field');
    console.log('  D. Delete Nest\n');
    
    const choice = await prompt('Select option: ');
    
    if (choice === '0') {
      running = false;
    } else if (choice.toLowerCase() === 'e') {
      await editNestMeta(category, subcategory, nest);
    } else if (choice.toLowerCase() === 'i') {
      await manageItems(category, subcategory, nest);
    } else if (choice.toLowerCase() === 'a') {
      await addNewField(category, subcategory, nest);
    } else if (choice.toLowerCase() === 'd') {
      await deleteNest(category, subcategory, nest);
      running = false;
    }
  }
}

// Edit nest metadata
async function editNestMeta(category, subcategory, nest) {
  displayHeader(`EDIT NEST METADATA - ${nest}`);
  
  const meta = resources[category][subcategory][nest]._meta;
  const title = await prompt(`New title (current: "${meta.title || ''}"): `);
  const desc = await prompt(`New description (current: "${meta.description ? meta.description.substring(0, 40) + '...' : ''}"): `);
  
  if (title) meta.title = title;
  if (desc) meta.description = desc;
  
  console.log('✓ Metadata updated');
  saveResources();
}

// Manage items in a nest
async function manageItems(category, subcategory, nest) {
  let running = true;
  while (running) {
    const items = resources[category][subcategory][nest]._items || [];
    
    displayHeader(`MANAGE ITEMS - ${nest}`);
    items.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name || 'Unnamed'}`);
    });
    
    console.log('\n  0. Back');
    console.log('  A. Add Item');
    if (items.length > 0) console.log('  E. Edit Item');
    if (items.length > 0) console.log('  D. Delete Item\n');
    
    const choice = await prompt('Select option (or enter item number to view): ');
    
    if (choice === '0') {
      running = false;
    } else if (choice.toLowerCase() === 'a') {
      await addItem(category, subcategory, nest);
    } else if (choice.toLowerCase() === 'e') {
      const itemNum = await prompt('Item number to edit: ');
      const idx = parseInt(itemNum) - 1;
      if (idx >= 0 && idx < items.length) {
        await editItem(category, subcategory, nest, idx);
      } else {
        console.log('Invalid selection');
      }
    } else if (choice.toLowerCase() === 'd') {
      const itemNum = await prompt('Item number to delete: ');
      const idx = parseInt(itemNum) - 1;
      if (idx >= 0 && idx < items.length) {
        await removeItem(category, subcategory, nest, idx);
      } else {
        console.log('Invalid selection');
      }
    } else {
      const idx = parseInt(choice) - 1;
      if (idx >= 0 && idx < items.length) {
        displayItemDetails(items[idx]);
      }
    }
  }
}

// Display item details
function displayItemDetails(item) {
  console.log('\n📌 ITEM DETAILS:');
  Object.entries(item).forEach(([key, value]) => {
    const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
    console.log(`  ${key}: ${displayValue}`);
  });
  console.log('');
}

// Add new item
async function addItem(category, subcategory, nest) {
  displayHeader(`ADD NEW ITEM - ${nest}`);
  
  const items = resources[category][subcategory][nest]._items;
  const name = await prompt('Item name: ');
  
  if (!name) {
    console.log('❌ Item name cannot be empty');
    return;
  }
  
  const newItem = { name };
  
  const addMore = await confirm('Add more fields to this item?');
  if (addMore) {
    let addingFields = true;
    while (addingFields) {
      const fieldName = await prompt('Field name (or press Enter to finish): ');
      if (!fieldName) {
        addingFields = false;
      } else {
        const fieldValue = await prompt(`Value for "${fieldName}": `);
        newItem[fieldName] = fieldValue;
      }
    }
  }
  
  items.push(newItem);
  console.log('✓ Item added');
  saveResources();
}

// Edit existing item
async function editItem(category, subcategory, nest, itemIndex) {
  const item = resources[category][subcategory][nest]._items[itemIndex];
  
  displayHeader(`EDIT ITEM - ${item.name}`);
  
  const fields = Object.keys(item);
  fields.forEach((field, i) => {
    console.log(`  ${i + 1}. ${field}`);
  });
  console.log('  A. Add New Field');
  console.log('  D. Delete Field\n');
  
  const choice = await prompt('Select field to edit (number/A/D): ');
  
  if (choice.toLowerCase() === 'a') {
    const fieldName = await prompt('New field name: ');
    if (fieldName && !item[fieldName]) {
      const fieldValue = await prompt(`Value for "${fieldName}": `);
      item[fieldName] = fieldValue;
      console.log('✓ Field added');
      saveResources();
    } else {
      console.log('❌ Field name invalid or already exists');
    }
  } else if (choice.toLowerCase() === 'd') {
    const fieldNum = await prompt('Field number to delete: ');
    const idx = parseInt(fieldNum) - 1;
    if (idx >= 0 && idx < fields.length && fields[idx] !== 'name') {
      delete item[fields[idx]];
      console.log('✓ Field deleted');
      saveResources();
    } else {
      console.log('❌ Cannot delete name field or invalid selection');
    }
  } else {
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < fields.length) {
      const field = fields[idx];
      const newValue = await prompt(`New value for "${field}" (current: "${item[field]}"): `);
      if (newValue) {
        item[field] = newValue;
        console.log('✓ Field updated');
        saveResources();
      }
    }
  }
}

// Remove item
async function removeItem(category, subcategory, nest, itemIndex) {
  const item = resources[category][subcategory][nest]._items[itemIndex];
  const shouldDelete = await confirm(`Delete "${item.name}"?`);
  
  if (shouldDelete) {
    resources[category][subcategory][nest]._items.splice(itemIndex, 1);
    console.log('✓ Item deleted');
    saveResources();
  }
}

// Add new field to nest
async function addNewField(category, subcategory, nest) {
  displayHeader(`ADD NEW FIELD - ${nest}`);
  
  const nestObj = resources[category][subcategory][nest];
  const fieldName = await prompt('Field name: ');
  
  if (!fieldName || fieldName.startsWith('_')) {
    console.log('❌ Invalid field name (cannot start with _)');
    return;
  }
  
  if (nestObj[fieldName]) {
    console.log('❌ Field already exists');
    return;
  }
  
  const fieldValue = await prompt(`Value for "${fieldName}": `);
  nestObj[fieldName] = fieldValue;
  
  console.log('✓ Field added to nest');
  saveResources();
}

// Main menu
async function mainMenu() {
  let running = true;
  while (running) {
    displayHeader('📚 RESOURCES.JSON EDITOR 📚');
    
    console.log('  1. Manage Categories');
    console.log('  2. View Full Structure');
    console.log('  0. Exit\n');
    
    const choice = await prompt('Select option: ');
    
    switch (choice) {
      case '1':
        await manageCategories();
        break;
      case '2':
        displayHeader('FULL STRUCTURE');
        console.log(JSON.stringify(resources, null, 2));
        await prompt('Press Enter to continue...');
        break;
      case '0':
        running = false;
        break;
      default:
        console.log('Invalid selection');
    }
  }
  
  rl.close();
  console.log('\n👋 Goodbye!\n');
}

// Start the application
loadResources();
mainMenu();
