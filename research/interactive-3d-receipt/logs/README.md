# Runtime interaction logs

Use this folder for written logs from manual receipt surface-collision testing.

Recommended test URL:

`http://127.0.0.1:8024/index.html?surface=full&debug=1&log=1&material=heavy&shadow=off`

While testing:
- press `l` to add a manual mark event,
- press `s` to download `receipt-surface-log-*.json`,
- drop/move that JSON into this `logs/` folder before asking Sirius to analyze it.

Each JSON event records timing, material, shadow, surface mode, FPS/frame/physics cost, particle contact pairs/passes, vertex-triangle pairs, edge-edge pairs, surface passes, persisted contacts, and grab state.
