import sys, re

with open('style.css', 'r') as f:
    content = f.read()

new_content = re.sub(
    r'@media \(max-width: 760px\) \{.*',
    '''@media (max-width: 760px) {
  main {
    width:100%;
    padding:16px;
    gap:16px;
  }

  .stage {
    width:100%;
    min-height:0;
    aspect-ratio:auto;
    padding:16px;
    overflow:visible;
    border-radius:28px;
    display:grid;
    grid-template-columns:1fr;
    gap:16px;
  }

  .stage > canvas,
  .stage > .debug-panel {
    right:auto;
  }

  .stage > canvas {
    grid-column:1;
    grid-row:1;
    position:relative !important;
    inset:auto !important;
    width:100% !important;
    height:auto !important;
    aspect-ratio:1020 / 800;
    border-radius:24px;
  }

  .badge {
    top:32px;
    left:32px;
  }

  .control-panel {
    grid-column:1;
    grid-row:2;
    position:relative;
    right:auto;
    top:auto;
    width:100%;
    margin-top:0;
  }

  .lab-panel {
    width:100%;
    max-width:none;
  }

  .debug-panel {
    position:relative;
    left:auto;
    right:auto;
    bottom:auto;
    top:auto;
    margin-top:16px;
    max-width:none;
    min-width:0;
  }

  .hint {
    font-size:14px;
    padding:0 4px 8px;
  }
}''', content, flags=re.DOTALL)

with open('style.css', 'w') as f:
    f.write(new_content)
print("done")
