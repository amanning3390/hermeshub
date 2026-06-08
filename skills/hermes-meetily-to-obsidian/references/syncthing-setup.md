# Syncthing setup for Meetily exports

Use this guide when **Meetily runs on a different machine** than the Hermes + Obsidian processing environment.

## First decision

Ask first:

- Are Meetily, Obsidian, and Hermes on the same machine?

If **yes**, Syncthing is optional and you can skip this guide.

If **no**, Syncthing should be installed on both sides before debugging the processor.

## User device side

### macOS

- Install Meetily.
- Install Syncthing.
- Pick the Meetily export folder, commonly:
  - `/Users/admin/Movies/meetily-recordings`
- Share that folder as **Send Only**.

### Windows

- Install Syncthing on the machine that produces the meeting exports.
- Pick the export folder, for example:
  - `C:/Users/<user>/Documents/meetily-recordings`
- Share that folder as **Send Only**.

## Hermes + Obsidian server side

- Install Syncthing if it is not already present.
- Create or verify the export inbox, for example:
  - `/root/meetily_exports`
- Accept the shared folder using the same folder ID.
- Configure the server-side folder as **Receive Only**.
- Ensure Syncthing can write to the inbox path.
- Ensure Hermes can read the inbox and write to the Obsidian vault.

## Recommended ignore rules

Use the same ignore rules on both sides:

- `.processed/`
- `*.partial`
- `*.tmp`
- `.DS_Store`

## Verification

- Create a test file or test meeting export on the user device.
- Confirm it arrives in the server inbox.
- Confirm Syncthing shows the folder as healthy and not paused on both sides.

## Best practices

- Do **not** point Meetily exports directly at the Obsidian vault.
- Use **Send Only** on the user device and **Receive Only** on the server for the export inbox.
- If the server is public, restrict the Syncthing GUI to localhost and administer it over SSH tunneling.
