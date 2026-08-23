import { FileWriteResult } from '../types/fs-bridge';

export async function writeFile(path: string, content: string): Promise<FileWriteResult> {
  return window.electronAPI.invoke('fs:write', path, content);
}

export async function readFile(path: string): Promise<string> {
  return window.electronAPI.invoke('fs:read', path);
}

export async function fileExists(path: string): Promise<boolean> {
  return window.electronAPI.invoke('fs:exists', path);
}
