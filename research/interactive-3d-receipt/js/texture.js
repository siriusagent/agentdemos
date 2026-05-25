
import { CONFIG } from './config.js?v=5';

export function makeReceiptTexture(back) {
  const { TEX_W, TEX_H } = CONFIG;
  const t = document.createElement('canvas');
  t.width = TEX_W; t.height = TEX_H;
  const g = t.getContext('2d');
  g.fillStyle = back ? '#ece8de' : '#f9f6ef';
  g.fillRect(0,0,TEX_W,TEX_H);

  const img = g.getImageData(0,0,TEX_W,TEX_H);
  for (let i=0; i<img.data.length; i+=4) {
    const x = (i/4) % TEX_W, y = Math.floor(i/4/TEX_W);
    const n = (Math.random() - .5) * 8 + Math.sin(y*.05 + Math.sin(x*.02))*1.8;
    img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
    img.data[i+1] = Math.max(0, Math.min(255, img.data[i+1] + n));
    img.data[i+2] = Math.max(0, Math.min(255, img.data[i+2] + n*.65));
    img.data[i+3] = 255;
  }
  g.putImageData(img,0,0);

  g.save();
  g.strokeStyle = 'rgba(70,60,40,.04)';
  for (let x=24; x<TEX_W; x+=38) {
    g.beginPath();
    for (let y=0; y<TEX_H; y+=25) {
      const xx = x + Math.sin(y*.015 + x*.1) * 2;
      y === 0 ? g.moveTo(xx,y) : g.lineTo(xx,y);
    }
    g.stroke();
  }
  g.restore();

  if (back) {
    g.fillStyle = 'rgba(70,60,45,.08)';
    g.font = '32px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    g.textAlign = 'center';
    g.translate(TEX_W/2, TEX_H/2);
    g.scale(-1, 1); // Pre-mirror horizontally so it reads normally when physically flipped in 3D
    g.rotate(-Math.PI/2);
    for (let y=-800; y<800; y+=160) g.fillText('THERMAL PAPER  •  CUSTOMER COPY', 0, y);
    g.setTransform(1,0,0,1,0,0);
    return t;
  }

  const pinkGradiant = g.createLinearGradient(TEX_W - 160, 0, TEX_W, 0);
  pinkGradiant.addColorStop(0, 'rgba(255, 60, 90, 0)');
  pinkGradiant.addColorStop(1, 'rgba(255, 60, 90, 0.14)');
  g.fillStyle = pinkGradiant;
  g.fillRect(TEX_W - 160, 0, 160, TEX_H);

  const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
  g.fillStyle = '#221e18';
  g.textAlign = 'left';
  g.textBaseline = 'top';
  let y = 100;
  
  function text(s, x=90, size=30, weight='500', alpha=1) {
    g.globalAlpha = alpha; g.font = `${weight} ${size}px ${mono}`; 
    g.fillText(s, x, y); y += size * 1.34; g.globalAlpha = 1;
  }
  function center(s, size=32, weight='700', offset=0) {
    g.font = `${weight} ${size}px ${mono}`; g.textAlign='center'; 
    g.fillText(s, TEX_W/2 + offset, y); g.textAlign='left'; y += size*1.38;
  }
  function rule(char='-') { g.font = `500 29px ${mono}`; g.fillText(char.repeat(41), 86, y); y += 44; }
  
  center('❖', 60, '400'); y += 10;
  center('GITHUB.COM/MIKHUTCHINSON', 36, '900');
  center('INTERACTIVE RECEIPT STUDY', 22, '700'); y += 15;
  center('LOCAL EXPERIMENT / BROWSER PHYSICS', 20, '500');
  center('DETROIT // LOCALHOST EDITION', 20, '500'); y += 30; rule('=');
  
  text('DATE: 05/24/2026        TIME: 19:49', 90, 28, '650', .9);
  text('ORDER #: MODULAR-REFACTOR', 90, 28, '650', .9);
  text('CASHIER: SIRIUS', 90, 28, '650', .9);
  y += 20; rule('-');
  
  const items = [
    ['1  MODULAR FILE SPLIT', '0.00'],
    ['1  ANTI-CRUSH SHEAR STRUTS', '85.00'],
    ['1  TORSIONAL MESH DRAG', '45.50'],
    ['1  SINGLE RESPONSIBILITY', '0.00']
  ];
  g.font = `650 28px ${mono}`;
  for (const [name, price] of items) {
    g.fillText(name, 90, y);
    g.textAlign='right'; g.fillText('$' + price, TEX_W-90, y); g.textAlign='left';
    y += 45;
  }
  y += 20; rule('-');
  center('THANK YOU FOR YOUR PURCHASE', 28, '800');
  
  g.globalAlpha = .85; g.fillStyle = '#1c1a16';
  let bx = 160; y += 120;
  for (let i=0; i<105; i++) {
    const bw = [2,3,4,6,8][(i*23)%5];
    const bh = 95 + ((i*37)%25);
    if (i%6 !== 0) g.fillRect(bx, y, bw, bh);
    bx += bw + 3;
  }
  g.globalAlpha=1;
  return t;
}
