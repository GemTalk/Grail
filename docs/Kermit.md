## Blocking

- 52094 P3 gslist truncates the version number
  - 09/12/2026 [Active ; assigned to Allen Otis]

## High Value

- 51975 F3 Implement TransientWeakReference and PersistentWeakReference
  - 06/28/2026 [Deferred to: (Martin McClure)]

## Medium Value

- 52046 F3 Stack overflow requests
  - 08/20/2026 [Retired by Allen Otis on 09/03/2026]

- 52081 F3 Request ability to set a pragma from GsComMethNode
  - 09/09/2026 [Active ; assigned to Allen Otis]

- 52088 F3 Make `GsComSendNode>>optimize` attach the block-send opcode for `#value:` / `#value:value:`
  - 09/10/2026 [Active ; assigned to Allen Otis]

## Low Value

- 52029 R3 SmallInteger division by −1 silently overflows at minimumValue
  - 08/16/2026 [Active ; assigned to Allen Otis]

- 52047 F3 Request for linked GciNb\* functions to not block
  - 08/21/2026 [Active ; assigned to Allen Otis]

## Change needs to be tested

- 51935 F3 Grail support: consider allowing writing to parameters
  - 05/24/2026 [Active ; assigned to Allen Otis]

- 52030 F3 Request GsProcess class>>stack or stackToLevel:
  - 08/16/2026 [Fixed in 4.0.0 by Allen Otis by 08/20/2026]

- 52031 R3 Gem coredump (SIGBUS) from `anException size: 0` while a handler is active
  - 08/16/2026 [Fixed in 4.0.0 by Allen Otis by 08/20/2026]

- 52035 R4 Comment seems wrong in GsProcess class>>\_frameContentsAt:
  - 08/17/2026 [Fixed in 4.0.0 by Allen Otis by 08/20/2026]

- 52041 R3 coredump on `System stackDepthHighwater printString`
  - 08/19/2026 [Active ; fixed in 4.0.0, 3.8.0; assigned to Allen Otis]

- 52060 R3 Support for Grail's direct-to-IR code generator
  - 08/30/2026 [Testing ; fixed in 4.0.0; assigned to Allen Otis]

- 52061 P2 SIGSEGV in new the cached-lookup primitive (822ff08b90, prim 510)
  - 08/30/2026 [Active ; fixed in 4.0.0; assigned to Allen Otis]
