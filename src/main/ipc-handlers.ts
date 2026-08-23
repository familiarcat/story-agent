import { ipcMain } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

ipcMain.handle('fs:write', async (_event, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return { success: true, path: filePath };
});

ipcMain.handle('fs:read', async (_event, filePath: string) => {
  return fs.readFile(filePath, 'utf8');
});

ipcMain.handle('fs:exists', async (_event, filePath: string) => {
  return fs.access(filePath).then(() => true).catch(() => false);
});
