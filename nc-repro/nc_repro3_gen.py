#!/usr/bin/env python3
"""v3 repro for the 4.0 `code_methods` SIGSEGV: understands-cache grow poisons
the dispatch cache.  Grail-free -- pure kernel Smalltalk, no application code.

Reproduced deterministically (3/3) on GemStone/S 64 Bit 4.0.0 build
28f41d4cc9f83190829d4fabdc63c3604a2bb60a, real Linux x86_64,
GEM_NATIVE_CODE_ENABLED=2.

    python3 nc_repro3_gen.py > /tmp/v3.tpz
    topaz -l -I .topazini -S /tmp/v3.tpz        # dies with SIGSEGV, si_code 2, err 0x15

Mechanism (see ISSUE.md):

  methodLookupCacheAtPut's grow path reloads the cache it is about to write
  through `(*clsH)->methodLookupCache()`, which is hardwired to
  class_lookup_cache_ofs (omobj.hf:2352), rather than `lookupCache(cacheWordOfs)`
  (ommethlookup.m4:304).  Growing a class's UNDERSTANDS cache therefore
  re-inserts its (selectorId -> GsNMethod) pair into that class's DISPATCH
  cache.  A later cold compiled send reads it back, and because
  om::methodLookup and the send-cache update paths treat any value > OOP_Two
  as native code (ommethlookup.m4:385-386, :622, :686) it casts the GsNMethod to NatCodeObjSType* and jumps
  into the object -- a non-executable region, hence SEGV_ACCERR on an
  instruction fetch.

Three things the probe has to get right, each of which cost a false negative:

 1. The understands cache must become a LARGE ROOT object.  The documented
    trigger, `numCollisions > tableSize/2`, is dead code: keyvaluedict.c:1305
    packs `(numCollisions << 32) | (tableSize & 0xFFFFFFFF)` but
    ommethlookup.m4:283-284 unpacks `int64 tableSize = sizesOut` without masking,
    so the threshold is ~1e11 and never met.  isLargeRoot() is the only live
    route into the grow path, so a few hundred selectors will NOT do it --
    hence n_sel defaults to 4000.
 2. The class's DISPATCH cache must already exist and be populated, or there is
    nothing to poison.  `perform:` does not populate it; only real compiled
    sends do.  Hence the `warm` drivers.
 3. The sends that read the poison must come from COLD send sites, and every
    method must be compiled BEFORE the poisoning -- compiling anything later
    bumps selectorDeltasSerialNum, which resets the very cache we just poisoned
    (ommethlookup.m4:135-141).  Hence `warm` and `cold` drivers are separate
    method sets, both compiled up front, and the cold ones run interleaved
    immediately after each group is poisoned.
"""
import sys

n_sel   = int(sys.argv[1]) if len(sys.argv) > 1 else 4000
per_drv = int(sys.argv[2]) if len(sys.argv) > 2 else 100
tag     = sys.argv[3] if len(sys.argv) > 3 else "R"

sels   = [f"ncsel{tag}_{i}" for i in range(1, n_sel + 1)]
groups = [sels[i:i + per_drv] for i in range(0, len(sels), per_drv)]
ng     = len(groups)

o = ["login", "omit resultcheck", "run"]
o.append(f"""| pdict ddict cls drv inst sels groups nWarm nTrue nCold |
pdict := SymbolDictionary new.
ddict := SymbolDictionary new.
cls := Object subclass: 'NCProbe{tag}'
  instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: pdict.
drv := Object subclass: 'NCDriver{tag}'
  instVarNames: #() classVars: #() classInstVars: #()
  poolDictionaries: #() inDictionary: ddict.
sels := (1 to: {n_sel}) collect: [:i | ('ncsel{tag}_' , i printString) asSymbol].
sels do: [:s | cls compileMethod: s asString , ' ^ 42'
        dictionaries: System myUserProfile symbolList category: 'probe'].""")

for kind in ("warm", "cold"):
    for d, group in enumerate(groups, start=1):
        body = "\n".join(f"  r := x {s}." for s in group)
        o.append(f"""drv compileMethod: '{kind}{d}: x
  | r |
{body}
  ^ r'
  dictionaries: System myUserProfile symbolList category: '{kind}'.""")

o.append(f"""inst := cls new.
groups := (1 to: {ng}) collect: [:d |
  ((d - 1) * {per_drv} + 1 to: ((d * {per_drv}) min: {n_sel})) collect: [:i | sels at: i]].

"populate + grow the class DISPATCH cache with real compiled sends"
nWarm := 0.
1 to: {ng} do: [:d |
  ((drv new) perform: ('warm' , d printString , ':') asSymbol with: inst) = 42
    ifTrue: [nWarm := nWarm + 1]].

"poison group d via respondsTo:, then immediately read it back from cold sends"
nTrue := 0. nCold := 0.
1 to: {ng} do: [:d |
  (groups at: d) do: [:s | (inst respondsTo: s) ifTrue: [nTrue := nTrue + 1]].
  ((drv new) perform: ('cold' , d printString , ':') asSymbol with: inst) = 42
    ifTrue: [nCold := nCold + 1]].

'SURVIVED sels=' , {n_sel} printString , ' warmOk=' , nWarm printString , '/' , {ng} printString ,
' respondsTrue=' , nTrue printString , ' coldOk=' , nCold printString , '/' , {ng} printString""")
o += ["%", "logout", "exit"]
print("\n".join(o))
