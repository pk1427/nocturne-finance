import { PrivateStateProvider, type PrivateStateId } from "@midnight-ntwrk/midnight-js-types";
import * as fs from "node:fs";
import * as path from "node:path";

class FilePrivateStateProvider implements PrivateStateProvider {
  private dir: string;
  private contractAddress?: string;

  constructor(dir: string) {
    this.dir = dir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  setContractAddress(address: string): void {
    this.contractAddress = address;
  }

  private filePath(id: PrivateStateId): string {
    if (!this.contractAddress) {
      throw new Error("Contract address not set");
    }
    return path.join(this.dir, `${this.contractAddress}:${id}.json`);
  }

  async set(privateStateId: PrivateStateId, state: any): Promise<void> {
    const fp = this.filePath(privateStateId);
    fs.writeFileSync(fp, JSON.stringify(state, null, 2));
  }

  async get(privateStateId: PrivateStateId): Promise<any> {
    const fp = this.filePath(privateStateId);
    if (!fs.existsSync(fp)) return null;
    try {
      return JSON.parse(fs.readFileSync(fp, "utf-8"));
    } catch {
      return null;
    }
  }

  async remove(privateStateId: PrivateStateId): Promise<void> {
    const fp = this.filePath(privateStateId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  async clear(): Promise<void> {
    if (!this.contractAddress) return;
    const files = fs.readdirSync(this.dir);
    for (const file of files) {
      if (file.startsWith(this.contractAddress + ":")) {
        fs.unlinkSync(path.join(this.dir, file));
      }
    }
  }

  async setSigningKey(address: string, signingKey: string): Promise<void> {
    const fp = path.join(this.dir, `${address}:signingKey.json`);
    fs.writeFileSync(fp, JSON.stringify({ signingKey }, null, 2));
  }

  async getSigningKey(address: string): Promise<string | null> {
    const fp = path.join(this.dir, `${address}:signingKey.json`);
    if (!fs.existsSync(fp)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(fp, "utf-8"));
      return data.signingKey ?? null;
    } catch {
      return null;
    }
  }

  async removeSigningKey(address: string): Promise<void> {
    const fp = path.join(this.dir, `${address}:signingKey.json`);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  async clearSigningKeys(): Promise<void> {
    const files = fs.readdirSync(this.dir);
    for (const file of files) {
      if (file.endsWith(":signingKey.json")) {
        fs.unlinkSync(path.join(this.dir, file));
      }
    }
  }

  async exportPrivateStates(_options?: any): Promise<any> {
    if (!this.contractAddress) return {} as any;
    const files = fs.readdirSync(this.dir);
    const states: Record<string, any> = {};
    for (const file of files) {
      if (file.startsWith(this.contractAddress + ":") && !file.endsWith(":signingKey.json")) {
        const id = file.slice(this.contractAddress.length + 1, -5);
        states[id] = JSON.parse(fs.readFileSync(path.join(this.dir, file), "utf-8"));
      }
    }
    return states as any;
  }

  async importPrivateStates(_exportData: any, _options?: any): Promise<any> {
    return { imported: 0, skipped: 0, overwritten: 0 } as any;
  }

  async exportSigningKeys(_options?: any): Promise<any> {
    const files = fs.readdirSync(this.dir);
    const keys: Record<string, string> = {};
    for (const file of files) {
      if (file.endsWith(":signingKey.json")) {
        const address = file.slice(0, -":signingKey.json".length);
        const data = JSON.parse(fs.readFileSync(path.join(this.dir, file), "utf-8"));
        keys[address] = data.signingKey;
      }
    }
    return keys as any;
  }

  async importSigningKeys(_exportData: any, _options?: any): Promise<any> {
    return { imported: 0, skipped: 0, overwritten: 0 } as any;
  }
}

export function filePrivateStateProvider(dir: string): PrivateStateProvider {
  return new FilePrivateStateProvider(dir) as PrivateStateProvider;
}
