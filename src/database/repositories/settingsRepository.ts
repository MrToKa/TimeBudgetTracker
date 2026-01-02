// Settings Repository - Database Operations for App Settings

import { executeQuery, executeQuerySingle, executeSql } from '../database';

interface SettingRow {
  key: string;
  value: string;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await executeQuerySingle<SettingRow>(
    'SELECT * FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await executeSql(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [key, value]
  );
}

export async function deleteSetting(key: string): Promise<boolean> {
  const result = await executeSql('DELETE FROM settings WHERE key = ?', [key]);
  return result.rowsAffected > 0;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await executeQuery<SettingRow>('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  const value = await getSetting(key);
  if (value === null) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export async function getSettingBoolean(key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getSetting(key);
  if (value === null) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}
