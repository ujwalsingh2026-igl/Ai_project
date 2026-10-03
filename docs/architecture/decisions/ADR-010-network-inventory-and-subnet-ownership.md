# ADR-010: Persistent Network & DNS Inventory with Subnet Ownership Safety Gate

## Context
A key capability of the Aegis command center is persistent network and DNS visibility for tech enthusiasts and developers on their home local networks. However, network discovery and monitoring carry critical ethical, legal, and security boundaries:
1. **Defensive Only**: The application must never scan, probe, or monitor networks or devices not owned or administered by the user.
2. **Zero Aggressive Actions**: Zero packet sniffing of other users, zero ARP spoofing, zero MAC spoofing, and zero MITM.
3. **Privacy**: "Nearby devices" refers strictly to authorized devices residing on the user's own confirmed local LAN.
4. **Data Minimization & Retention**: Sightings and alerts must be stored locally with a clear 90-day retention lifecycle and one-click data wipe controls.

## Decision
1. **Mandatory Subnet Ownership Confirmation Gate**:
   - The user must explicitly confirm ownership/administration of any target subnet (e.g. `10.227.244.0/24`) before active discovery is permitted.
   - At the core tool level (`NetworkScanDevicesTool`) and API level (`POST /api/network/scan/`), requests for unconfirmed subnets are rejected with HTTP 403 Forbidden (`SUBNET_NOT_CONFIRMED`).
2. **Defensive Passive Discovery Engine**:
   - Instead of port knocking or aggressive network vulnerability scanners, the tool inspects the host's existing ARP cache (`arp -a`) and performs non-blocking local reverse-DNS lookups (`socket.gethostbyaddr`).
   - Multicast (`224.0.0.0/4`, `01:00:5E:...`) and broadcast (`255.255.255.255`, `.255`, `FF:FF:FF:FF:FF:FF`) are strictly excluded.
   - Local device interface details (Wi-Fi, Ethernet) are included with default label `mine`.
3. **Offline OUI Vendor Resolution**:
   - MAC prefixes are matched against a static, curated offline vendor dictionary (Apple, Intel, Google, Samsung, Microsoft, Raspberry Pi, Espressif, Cisco, TP-Link, Netgear, etc.).
   - Randomized MAC addresses (IEEE 802 locally administered bits, e.g. iOS/Android private Wi-Fi MACs) are accurately detected and labeled as `Private / Randomized MAC`.
4. **Persistent Schema (`apps/network/models.py`)**:
   - `NetworkSubnetConfirmation`: Records user affirmation of subnet ownership with timestamp and gateway info.
   - `NetworkDevice`: Persistent inventory with normalized MAC address, IP, hostname, vendor, custom label (`mine`, `family`, `guest`, `unknown`), and notes.
   - `DeviceSighting`: Historical sightings timeline for each device.
   - `NetworkAlert`: Automatically generated security alerts for new devices, IP address changes, or offline status.
   - `DnsQueryLog`: Stores local DNS queries and imported Pi-hole / router logs.
5. **Decoupled Store Pattern**:
   - `core/builtin_tools/network.py` defines `NetworkStore` protocol and `InMemoryNetworkStore` for fast, zero-dependency pure Python unit tests.
   - `apps/network/store.py` provides `DjangoNetworkStore` for production SQLite/PostgreSQL persistence.
6. **Frontend Cockpit Experience (`NetworkView.tsx`)**:
   - Visual shield banner warning users if current subnet ownership is unconfirmed.
   - Filterable device inventory table with live status dots and inline label selection.
   - Real-time DNS forward/reverse resolver and Pi-hole JSON / CSV log importer.
   - 90-day retention prune button, JSON export, and targeted data wipe modal.

## Consequences
- Strict compliance with defensive safety principles: impossible to trigger scans against unauthorized subnets.
- Fully offline-capable: OUI vendor resolution requires zero internet connection or third-party cloud API.
- All telemetry remains 100% private on the user's host machine.
