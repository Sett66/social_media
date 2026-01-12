import * as readline from 'node:readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const ai = rl[Symbol.asyncIterator]();

// 保证 tokenBuf 至少有 need 个 token（从 stdin 异步读取）
async function ensureTokens(tokenBuf, need) {
  while (tokenBuf.length < need) {
    const { value, done } = await ai.next();
    if (done) break;
    if (!value) continue;
    const parts = value.trim().split(/\s+/).filter(Boolean);
    for (const p of parts) tokenBuf.push(p);
  }
}

async function main() {
  const tokens = [];
  await ensureTokens(tokens, 1);
  if (tokens.length === 0) { rl.close(); return; }
  const T = parseInt(tokens.shift(), 10);
  const outputs = [];

  for (let tc = 0; tc < T; tc++) {
    await ensureTokens(tokens, 1);
    const n = parseInt(tokens.shift(), 10);
    await ensureTokens(tokens, n);
    const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = Number(tokens.shift());

    // 暴力计数：对每个 i 计算 L 和 R（O(n^2)）
    let total = 0n;
    for (let i = 0; i < n; i++) {
      let L = 0; // 左侧 >= arr[i]
      for (let j = 0; j < i; j++) if (arr[j] >= arr[i]) L++;

      let R = 0; // 右侧 <= arr[i]
      for (let j = i + 1; j < n; j++) if (arr[j] <= arr[i]) R++;

      const Li = BigInt(L), Ri = BigInt(R);
      const leftChoices = BigInt(i);           // 0-based 左侧可选数量
      const rightChoices = BigInt(n - 1 - i);  // 右侧可选数量

      total += Ri * leftChoices + Li * rightChoices - Li * Ri;
    }

    outputs.push(total.toString());
  }

  console.log(outputs.join('\n'));
  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
