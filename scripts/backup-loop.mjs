import { backupDatabase } from './backup.mjs';

async function loop() {
  try {
    await backupDatabase();
  } catch (error) {
    console.error('[backup-loop]', error);
  }
  setTimeout(loop, 24 * 60 * 60 * 1000);
}
loop();
