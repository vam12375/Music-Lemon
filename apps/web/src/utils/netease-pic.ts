/**
 * 网易云音乐 CDN 图片 URL 生成
 * 根据 picId 通过 XOR + MD5 + Base64 加密生成完整 CDN 图片地址
 */

const MAGIC = "3go8&$8*3*3h0k(2)2";

/** 将 picId 字符串与魔数密钥逐字节异或 */
function xorWithMagic(idStr: string): Uint8Array {
  const result = new Uint8Array(idStr.length);
  for (let i = 0; i < idStr.length; i++) {
    result[i] = idStr.charCodeAt(i) ^ MAGIC.charCodeAt(i % MAGIC.length);
  }
  return result;
}

// ============ 最小化 MD5 实现 (RFC 1321) ============

const S: number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K: number[] = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
];

function md5(data: Uint8Array): Uint8Array {
  // 预处理：填充到 512-bit 块的倍数
  const bitLen = data.length * 8;
  // 需要填充到 (N*64 - 8) 字节，再加 8 字节长度
  let padLen = 64 - ((data.length + 9) % 64);
  if (padLen === 64) padLen = 0;
  const buf = new Uint8Array(data.length + 1 + padLen + 8);
  buf.set(data);
  buf[data.length] = 0x80;
  // 小端序写入原始长度（bit）
  const view = new DataView(buf.buffer);
  view.setUint32(buf.length - 8, bitLen >>> 0, true);
  view.setUint32(buf.length - 4, Math.floor(bitLen / 0x100000000), true);

  // 初始化哈希值
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // 处理每个 64 字节块
  for (let offset = 0; offset < buf.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }

    let A = a0, B = b0, C = c0, D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }

      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // 输出 16 字节小端序摘要
  const result = new Uint8Array(16);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, a0, true);
  rv.setUint32(4, b0, true);
  rv.setUint32(8, c0, true);
  rv.setUint32(12, d0, true);
  return result;
}

/**
 * 根据 picId 生成网易云 CDN 图片 URL
 * @param picId - 图片 ID（来自搜索响应的 album.picId）
 * @param size - 图片尺寸（默认 300x300）
 */
export function neteasePicUrl(picId: string | number, size = 300): string {
  if (!picId) return "";
  const idStr = String(picId);
  const xored = xorWithMagic(idStr);
  const hash = md5(xored);
  // Base64 编码 + URL 安全替换
  const b64 = btoa(String.fromCharCode(...hash))
    .replace(/\//g, "_")
    .replace(/\+/g, "-");
  return `https://p1.music.126.net/${b64}/${idStr}.jpg?param=${size}y${size}`;
}
