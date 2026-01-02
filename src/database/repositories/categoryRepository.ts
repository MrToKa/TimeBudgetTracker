// Category Repository - Database Operations for Categories

import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeQuerySingle, executeSql } from '../database';
import { Category, CreateCategoryInput } from '../../types';
import { nowISO } from '../../utils/dateUtils';

// Database row type (snake_case)
interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Convert database row to Category type
function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    isDefault: row.is_default === 1,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// CRUD Operations
// ============================================

export async function getAllCategories(): Promise<Category[]> {
  const rows = await executeQuery<CategoryRow>(
    'SELECT * FROM categories ORDER BY display_order ASC'
  );
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const row = await executeQuerySingle<CategoryRow>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return row ? rowToCategory(row) : null;
}

export async function getCategoryByName(name: string): Promise<Category | null> {
  const row = await executeQuerySingle<CategoryRow>(
    'SELECT * FROM categories WHERE LOWER(name) = LOWER(?)',
    [name]
  );
  return row ? rowToCategory(row) : null;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const id = uuidv4();
  const now = nowISO();
  
  // Get max display order
  const maxOrderResult = await executeQuerySingle<{ max_order: number }>(
    'SELECT MAX(display_order) as max_order FROM categories'
  );
  const displayOrder = input.displayOrder ?? ((maxOrderResult?.max_order ?? -1) + 1);
  
  await executeSql(
    `INSERT INTO categories (id, name, color, icon, is_default, display_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.color ?? '#6B7280',
      input.icon ?? 'category',
      0,
      displayOrder,
      now,
      now,
    ]
  );
  
  const category = await getCategoryById(id);
  if (!category) {
    throw new Error('Failed to create category');
  }
  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<CreateCategoryInput>
): Promise<Category | null> {
  const existing = await getCategoryById(id);
  if (!existing) {
    return null;
  }
  
  const now = nowISO();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }
  if (updates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }
  if (updates.displayOrder !== undefined) {
    fields.push('display_order = ?');
    values.push(updates.displayOrder);
  }
  
  values.push(id);
  
  await executeSql(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return getCategoryById(id);
}

export async function deleteCategory(id: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM categories WHERE id = ? AND is_default = 0', [id]);
  return result.rowsAffected > 0;
}

// ============================================
// Query Helpers
// ============================================

export async function getCategoriesWithActivityCount(): Promise<(Category & { activityCount: number })[]> {
  const rows = await executeQuery<CategoryRow & { activity_count: number }>(
    `SELECT c.*, COUNT(a.id) as activity_count 
     FROM categories c 
     LEFT JOIN activities a ON c.id = a.category_id AND a.is_archived = 0
     GROUP BY c.id 
     ORDER BY c.display_order ASC`
  );
  
  return rows.map(row => ({
    ...rowToCategory(row),
    activityCount: row.activity_count,
  }));
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await executeSql(
      'UPDATE categories SET display_order = ?, updated_at = ? WHERE id = ?',
      [i, nowISO(), orderedIds[i]]
    );
  }
}
